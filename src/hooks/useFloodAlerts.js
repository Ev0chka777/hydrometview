import { useEffect, useRef, useState } from 'react'
import { useFavorites } from '../favorites/FavoritesContext'
import { useSettings } from '../settings/SettingsContext'
import { useNotificationCenter } from '../notifications/NotificationCenterContext'
import { fetchHydroDataFromPage } from '../services/hydroService'
import allHydroStations from '../data/all_stations.json'

// Polling cadence for favorite hydroposts. Each fetch goes through the
// service's 1h LS cache, so this is cheap — actual network calls only happen
// when the cache expires.
const POLL_MS = 5 * 60 * 1000  // 5 minutes

// LocalStorage key for tracking which posts we've already alerted on, so we
// don't re-notify on every render once the user has seen the alert.
const ALERTED_KEY = 'flood_alerted_v1'

function readAlerted() {
  try { return JSON.parse(localStorage.getItem(ALERTED_KEY) || '{}') } catch { return {} }
}
function writeAlerted(obj) {
  try { localStorage.setItem(ALERTED_KEY, JSON.stringify(obj)) } catch {}
}

/**
 * Continuously monitors favorite hydroposts for warning/critical levels.
 * Returns the current array of active alerts (for in-app banner display)
 * and emits browser Notifications when a post first crosses a threshold.
 *
 * @returns {{ alerts: Array<{id, name, river, status, level, distance}>, dismiss: (id: string) => void }}
 */
export function useFloodAlerts() {
  const { favorites } = useFavorites()
  const { settings } = useSettings()
  const { push: pushNotification } = useNotificationCenter()
  const [alerts, setAlerts] = useState([])
  const dismissedRef = useRef(new Set())

  // Read once into a ref so the check() closure always sees the latest value
  // without having to recreate the polling interval whenever settings change.
  const notifyEnabledRef = useRef(settings.notifications?.criticalWater ?? true)
  useEffect(() => {
    notifyEnabledRef.current = settings.notifications?.criticalWater ?? true
  }, [settings.notifications?.criticalWater])

  // Stable ref for the notification-center push so the polling effect below
  // doesn't restart every time the provider re-renders.
  const pushRef = useRef(pushNotification)
  useEffect(() => { pushRef.current = pushNotification }, [pushNotification])

  // Re-evaluate whenever the favourites list changes, and periodically.
  useEffect(() => {
    let cancelled = false

    async function check() {
      const favIds = favorites.posts ?? []
      if (favIds.length === 0) { setAlerts([]); return }

      const stations = favIds
        .map(id => allHydroStations.find(s => s.id === id))
        .filter(Boolean)

      const results = await Promise.all(stations.map(async (st) => {
        try {
          const data = await fetchHydroDataFromPage(st.urlPath)
          return { station: st, data }
        } catch { return null }
      }))

      if (cancelled) return

      const active = []
      const already = readAlerted()
      const next = { ...already }
      let changed = false

      for (const r of results) {
        if (!r?.data) continue
        const { station, data } = r
        if (data.status !== 'warning' && data.status !== 'critical') {
          // Reset alert flag when status returns to normal
          if (next[station.id]) { delete next[station.id]; changed = true }
          continue
        }
        if (dismissedRef.current.has(station.id)) continue

        active.push({
          id:     station.id,
          name:   station.name,
          river:  station.river,
          status: data.status,
          level:  data.level,
          delta:  data.delta,
        })

        // Fire browser notification ONCE per status escalation.
        // Respect the user's Settings → Notifications → criticalWater toggle.
        // Always record into the in-app NotificationCenter even when the
        // browser toggle is off — users still want to see history in the bell.
        const stamp = `${station.id}:${data.status}`
        if (already[station.id] !== stamp) {
          next[station.id] = stamp
          changed = true
          if (notifyEnabledRef.current) maybeNotify(station, data)
          pushRef.current?.({
            kind:      'flood',
            title:     data.status === 'critical'
              ? `Опасный уровень: ${station.name}`
              : `Повышенный уровень: ${station.name}`,
            body:      `Река ${station.river}. Уровень: ${Math.round(data.level)} см`
                       + (data.delta != null && data.delta !== 0
                           ? ` (${data.delta > 0 ? '+' : ''}${data.delta} см/сут.)`
                           : ''),
            stationId: station.id,
          })
        }
      }

      if (changed) writeAlerted(next)
      setAlerts(active)
    }

    check()
    const id = setInterval(check, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.posts?.join(',')])

  const dismiss = (id) => {
    dismissedRef.current.add(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return { alerts, dismiss }
}

function maybeNotify(station, data) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const title = data.status === 'critical'
      ? `⚠️ Опасный уровень: ${station.name}`
      : `⚡ Повышенный уровень: ${station.name}`
    const body = `Река ${station.river}. Уровень: ${Math.round(data.level)} см`
      + (data.delta != null && data.delta !== 0 ? ` (${data.delta > 0 ? '+' : ''}${data.delta} см/сут.)` : '')
    new Notification(title, {
      body,
      icon:  '/favicon.svg',
      badge: '/favicon.svg',
      tag:   `flood-${station.id}`,
      renotify: true,
    })
  } catch { /* ignore — older browsers */ }
}

/**
 * Ask the user for Notification permission. Should be called from a user
 * gesture (button click), not on mount, per browser policy.
 *
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied')  return 'denied'
  try { return await Notification.requestPermission() }
  catch { return 'denied' }
}
