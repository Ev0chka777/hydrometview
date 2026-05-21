import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

const typeConfig = {
  critical: {
    icon: AlertTriangle,
    panel:
      'bg-red-50/80 border-red-200 ' +
      'dark:bg-red-500/[0.08] dark:border-red-500/30',
    iconTint:
      'bg-white text-red-600 ring-1 ring-red-100 ' +
      'dark:bg-red-500/15 dark:text-red-300 dark:ring-0',
    dot: 'bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    panel:
      'bg-amber-50/80 border-amber-200 ' +
      'dark:bg-amber-500/[0.08] dark:border-amber-500/30',
    iconTint:
      'bg-white text-amber-600 ring-1 ring-amber-100 ' +
      'dark:bg-amber-500/15 dark:text-amber-300 dark:ring-0',
    dot: 'bg-amber-500',
  },
  info: {
    icon: Info,
    panel:
      'bg-blue-50/80 border-blue-200 ' +
      'dark:bg-blue-500/[0.08] dark:border-blue-500/30',
    iconTint:
      'bg-white text-[#2F80FF] ring-1 ring-blue-100 ' +
      'dark:bg-blue-500/15 dark:text-blue-300 dark:ring-0',
    dot: 'bg-[#2F80FF]',
  },
}

export default function AlertItem({ alert, compact = false }) {
  const cfg = typeConfig[alert.type] || typeConfig.info
  const Icon = cfg.icon

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-start gap-3 p-3 rounded-xl border transition-colors duration-200',
          cfg.panel,
          alert.acknowledged && 'opacity-60'
        )}
      >
        <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', cfg.iconTint.split(' ').filter(c => c.includes('text-')).join(' '))} strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-white truncate transition-colors duration-200">
            {alert.title}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-200">
            {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ru })}
          </div>
        </div>
        {!alert.acknowledged && (
          <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', cfg.dot)} />
        )}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex gap-4 p-4 rounded-2xl border transition-colors duration-200',
        cfg.panel,
        alert.acknowledged && 'opacity-70'
      )}
    >
      <div className={clsx('p-2 rounded-xl h-fit transition-colors duration-200', cfg.iconTint)}>
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            {alert.title}
          </span>
          {!alert.acknowledged && (
            <span className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
          )}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed transition-colors duration-200">
          {alert.message}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200 flex-wrap">
          <span>{alert.stationName}</span>
          <span>·</span>
          <span>{formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ru })}</span>
          {alert.acknowledged && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" strokeWidth={2.4} /> Подтверждено
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
