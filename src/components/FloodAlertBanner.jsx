import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertCircle, X, BellRing } from 'lucide-react'
import clsx from 'clsx'
import { useFloodAlerts, requestNotificationPermission } from '../hooks/useFloodAlerts'

/**
 * Sticky banner that appears under the header whenever a favourited
 * hydropost has crossed a warning/critical threshold. Highest-status
 * alert wins the visual treatment.
 *
 * Also surfaces a one-time CTA to enable browser notifications, so the
 * user gets push-style alerts even when the tab is in the background.
 */
export default function FloodAlertBanner() {
  const { alerts, dismiss } = useFloodAlerts()
  const navigate = useNavigate()
  const [permState, setPermState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  if (alerts.length === 0) return null

  // Pick the worst-status alert to drive the banner's colour
  const worst = alerts.find(a => a.status === 'critical') ?? alerts[0]
  const isCritical = worst.status === 'critical'

  const handleEnableNotifications = async () => {
    const p = await requestNotificationPermission()
    setPermState(p)
  }

  return (
    <div
      role="alert"
      aria-live={isCritical ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
      'sticky top-[60px] lg:top-[72px] z-[9990] px-4 lg:px-8 py-2 transition-colors duration-200',
      isCritical
        ? 'bg-red-50 dark:bg-red-500/15 border-b border-red-200 dark:border-red-500/30'
        : 'bg-amber-50 dark:bg-amber-500/15 border-b border-amber-200 dark:border-amber-500/30',
    )}>
      <div className="flex items-start gap-2 max-w-7xl mx-auto">
        {isCritical
          ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-300" strokeWidth={2.4} />
          : <AlertCircle   className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" strokeWidth={2.4} />}
        <div className="flex-1 min-w-0">
          <div className={clsx(
            'text-sm font-semibold',
            isCritical ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200',
          )}>
            {alerts.length === 1
              ? <>{isCritical ? 'Опасный' : 'Повышенный'} уровень: <b>{worst.name}</b></>
              : <>{alerts.length} избранных постов с предупреждением</>}
          </div>
          <div className={clsx(
            'text-xs mt-0.5',
            isCritical ? 'text-red-700/80 dark:text-red-300/90' : 'text-amber-700/80 dark:text-amber-300/90',
          )}>
            Река {worst.river} · {Math.round(worst.level)} см
            {worst.delta != null && worst.delta !== 0 && (
              <> ({worst.delta > 0 ? '+' : ''}{worst.delta} см/сут.)</>
            )}
            {alerts.length > 1 && <>{' '}и ещё {alerts.length - 1}</>}
            {' · '}
            <button
              onClick={() => navigate('/favorites')}
              className="underline hover:no-underline"
            >Подробнее</button>
          </div>
        </div>

        {/* One-time CTA to enable push notifications */}
        {permState === 'default' && (
          <button
            onClick={handleEnableNotifications}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium shrink-0',
              isCritical
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700',
            )}
            title="Включить уведомления — приложение будет предупреждать вас даже при закрытой вкладке"
          >
            <BellRing className="w-3 h-3" strokeWidth={2.4} />
            <span className="hidden sm:inline">Уведомления</span>
          </button>
        )}

        <button
          onClick={() => dismiss(worst.id)}
          aria-label="Скрыть"
          className={clsx(
            'shrink-0 p-1 rounded-full',
            isCritical
              ? 'text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20'
              : 'text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20',
          )}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
