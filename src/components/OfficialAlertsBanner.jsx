import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle, ChevronDown, X } from 'lucide-react'
import clsx from 'clsx'
import { useWeather } from '../context/WeatherContext'
import { useSettings } from '../settings/SettingsContext'
import { useNotificationCenter } from '../notifications/NotificationCenterContext'

// LocalStorage key to remember which storm alerts we've already fired a
// browser notification for, so we don't re-notify on every page navigation.
const STORM_NOTIFIED_KEY = 'storm_notified_v1'

function readStormNotified() {
  try { return new Set(JSON.parse(localStorage.getItem(STORM_NOTIFIED_KEY) || '[]')) }
  catch { return new Set() }
}
function writeStormNotified(set) {
  try { localStorage.setItem(STORM_NOTIFIED_KEY, JSON.stringify([...set])) } catch {}
}

const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }

function severityClass(s) {
  if (s === 'Extreme' || s === 'Severe') return {
    box:  'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30',
    text: 'text-red-800 dark:text-red-200',
    sub:  'text-red-700/80 dark:text-red-300/90',
    icon: 'text-red-600 dark:text-red-300',
    Icon: AlertTriangle,
    live: 'assertive',
  }
  return {
    box:  'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-800 dark:text-amber-200',
    sub:  'text-amber-700/80 dark:text-amber-300/90',
    icon: 'text-amber-600 dark:text-amber-300',
    Icon: AlertCircle,
    live: 'polite',
  }
}

/**
 * Renders official weather alerts (storm, flood, etc.) as issued by the
 * national met service via WeatherAPI's /forecast.json?alerts=yes.
 * Different surface from FloodAlertBanner (which monitors user favourites);
 * this one reflects what the meteorological authority is broadcasting
 * RIGHT NOW for the active city.
 */
export default function OfficialAlertsBanner() {
  const { weatherAlerts, activeCity } = useWeather()
  const { settings } = useSettings()
  const { push: pushNotification } = useNotificationCenter()
  const [dismissedKeys, setDismissed] = useState(() => new Set())
  const [expanded, setExpanded] = useState(false)

  // Fire a browser notification for severe storm/weather alerts once per
  // headline. Respects the user's Settings → Notifications → storm toggle.
  // Always writes to the in-app NotificationCenter so the bell shows history
  // even when browser notifications are off.
  const stormNotifiedRef = useRef(readStormNotified())
  const pushRef = useRef(pushNotification)
  useEffect(() => { pushRef.current = pushNotification }, [pushNotification])

  useEffect(() => {
    if (!weatherAlerts || weatherAlerts.length === 0) return

    const fresh = weatherAlerts.filter(a =>
      (a.severity === 'Extreme' || a.severity === 'Severe') &&
      !stormNotifiedRef.current.has(keyOf(a))
    )
    if (fresh.length === 0) return

    const canBrowserNotify = settings.notifications?.storm
      && typeof window !== 'undefined'
      && 'Notification' in window
      && Notification.permission === 'granted'

    for (const a of fresh) {
      if (canBrowserNotify) {
        try {
          new Notification(`⚠️ ${a.event || 'Метеопредупреждение'}`, {
            body:  `${a.headline || ''}${a.areas ? `\n${a.areas}` : ''}`.trim() || `г. ${activeCity}`,
            icon:  '/favicon.svg',
            badge: '/favicon.svg',
            tag:   `storm-${keyOf(a)}`,
          })
        } catch { /* ignore */ }
      }
      pushRef.current?.({
        kind:  'storm',
        title: a.event || 'Метеопредупреждение',
        body:  `${a.headline || ''}${a.areas ? ` · ${a.areas}` : ''} (${activeCity})`,
      })
      stormNotifiedRef.current.add(keyOf(a))
    }
    writeStormNotified(stormNotifiedRef.current)
  }, [weatherAlerts, activeCity, settings.notifications?.storm])

  if (!weatherAlerts || weatherAlerts.length === 0) return null

  // Filter dismissed, sort by severity (worst first)
  const visible = weatherAlerts
    .filter(a => !dismissedKeys.has(keyOf(a)))
    .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))

  if (visible.length === 0) return null
  const top = visible[0]
  const cls = severityClass(top.severity)

  return (
    <section
      role="region"
      aria-label="Официальные метеорологические предупреждения"
      className={clsx(
        'rounded-2xl border p-4 transition-colors duration-200',
        cls.box,
      )}
    >
      <div className="flex items-start gap-3">
        <cls.Icon className={clsx('w-5 h-5 mt-0.5 shrink-0', cls.icon)} strokeWidth={2.4} />
        <div className="flex-1 min-w-0">
          <div role="alert" aria-live={cls.live} aria-atomic="true">
            <div className={clsx('text-sm font-bold', cls.text)}>
              {top.headline || top.event}
            </div>
            {top.areas && (
              <div className={clsx('text-xs mt-0.5', cls.sub)}>
                Зона действия: {top.areas}
              </div>
            )}
            {(top.effective || top.expires) && (
              <div className={clsx('text-[11px] mt-1', cls.sub)}>
                {top.effective && <>с {formatDt(top.effective)} </>}
                {top.expires   && <>до {formatDt(top.expires)}</>}
              </div>
            )}
          </div>

          {(top.desc || top.instruction) && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className={clsx(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline',
                cls.text,
              )}
              aria-expanded={expanded}
            >
              {expanded ? 'Свернуть' : 'Подробнее'}
              <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} strokeWidth={2.4} />
            </button>
          )}

          {expanded && (
            <div className={clsx('mt-3 text-xs leading-relaxed whitespace-pre-line', cls.sub)}>
              {top.desc}
              {top.instruction && (
                <div className="mt-2">
                  <span className={clsx('font-semibold uppercase tracking-wide text-[10px]', cls.text)}>
                    Рекомендации: </span>
                  {top.instruction}
                </div>
              )}
            </div>
          )}

          {visible.length > 1 && (
            <div className={clsx('text-[11px] mt-2', cls.sub)}>
              Ещё {visible.length - 1} предупреждение{visible.length > 2 ? 'й' : ''} для г. {activeCity}.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(prev => new Set([...prev, keyOf(top)]))}
          aria-label="Скрыть это предупреждение"
          className={clsx(
            'shrink-0 p-1 rounded-full',
            'hover:bg-black/[0.06] dark:hover:bg-white/[0.06]',
            cls.icon,
          )}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </section>
  )
}

function keyOf(a) { return `${a.headline}|${a.effective ?? ''}` }

function formatDt(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ru', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}
