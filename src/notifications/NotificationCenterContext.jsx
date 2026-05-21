import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Cross-app notification history. Anywhere that fires a browser Notification
 * also pushes a record here, so the Header's bell becomes a real "inbox" —
 * not a stale `mockData` list.
 *
 * Persisted to LocalStorage so the history survives reloads. Capped at 50
 * entries — older ones are dropped to keep the dropdown snappy.
 *
 * Record shape:
 *   {
 *     id:        string  // unique (we use Date.now()-suffixed)
 *     kind:      'flood' | 'storm' | 'info'
 *     title:     string
 *     body:      string
 *     stationId?: string  // optional deep-link target
 *     timestamp: number   // ms epoch
 *     read:      boolean
 *   }
 */
const STORAGE_KEY = 'notification_history_v1'
const MAX_ENTRIES = 50

function readHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeHistory(list) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

const NotificationCenterContext = createContext({
  notifications: [],
  unreadCount:   0,
  push:          () => {},
  markRead:      () => {},
  markAllRead:   () => {},
  clear:         () => {},
})

export function NotificationCenterProvider({ children }) {
  const [notifications, setNotifications] = useState(readHistory)

  useEffect(() => {
    writeHistory(notifications)
  }, [notifications])

  const push = useCallback((entry) => {
    setNotifications(prev => {
      // Dedupe — if an unread entry with the same {kind, title} already
      // exists from the last 10 minutes, skip. Prevents the storm-alert
      // useEffect re-firing the same toast when WeatherContext re-renders.
      const tenMinAgo = Date.now() - 10 * 60_000
      const dup = prev.find(n => !n.read
        && n.kind === entry.kind
        && n.title === entry.title
        && n.timestamp >= tenMinAgo)
      if (dup) return prev

      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        read: false,
        ...entry,
      }
      return [record, ...prev].slice(0, MAX_ENTRIES)
    })
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [notifications],
  )

  const value = useMemo(
    () => ({ notifications, unreadCount, push, markRead, markAllRead, clear }),
    [notifications, unreadCount, push, markRead, markAllRead, clear],
  )

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  )
}

export const useNotificationCenter = () => useContext(NotificationCenterContext)
