import { useMemo } from 'react'
import { AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import { calculateWeatherImpact, IMPACT_LEVEL_LABEL } from '../utils/weatherImpact'

/**
 * Smart "meteo-impact" widget. Accepts the normalized current-weather
 * object (and optionally the 24-hour forecast for pressure-trend math)
 * and renders a colored advisory card.
 *
 * @param {{ current: object|null, hourly?: Array, className?: string }} props
 */
export default function WeatherImpactWidget({ current, hourly = [], className = '' }) {
  const impact = useMemo(() => calculateWeatherImpact(current ?? {}, hourly), [current, hourly])

  if (!current) {
    return (
      <div className={clsx(
        'rounded-2xl p-4 border',
        'bg-slate-50 border-slate-200/70 text-slate-500',
        'dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-slate-400',
        className,
      )}>
        <div className="text-xs">Загрузка анализа погоды…</div>
      </div>
    )
  }

  const palette = {
    low: {
      box:  'bg-emerald-50 border-emerald-200/70 dark:bg-emerald-500/10 dark:border-emerald-500/20',
      head: 'text-emerald-700 dark:text-emerald-300',
      body: 'text-emerald-800/85 dark:text-emerald-200/90',
      icon: 'text-emerald-500 dark:text-emerald-400',
      Icon: ShieldCheck,
    },
    medium: {
      box:  'bg-yellow-50 border-yellow-200/70 dark:bg-yellow-500/10 dark:border-yellow-500/30',
      head: 'text-yellow-800 dark:text-yellow-200',
      body: 'text-yellow-900/85 dark:text-yellow-100/90',
      icon: 'text-yellow-500 dark:text-yellow-400',
      Icon: AlertCircle,
    },
    high: {
      box:  'bg-red-50 border-red-200/70 dark:bg-red-500/10 dark:border-red-500/30',
      head: 'text-red-700 dark:text-red-300',
      body: 'text-red-800/90 dark:text-red-200/90',
      icon: 'text-red-500 dark:text-red-400',
      Icon: AlertTriangle,
    },
  }[impact.level]

  const { Icon } = palette

  return (
    <div className={clsx('rounded-2xl border p-4 transition-colors duration-200', palette.box, className)}>
      <div className="flex items-start gap-3">
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', palette.icon, palette.box)}>
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={clsx('text-sm font-semibold', palette.head)}>{impact.headline}</div>
            <span className={clsx(
              'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full',
              impact.level === 'high'   && 'bg-red-500/15 text-red-700 dark:text-red-300',
              impact.level === 'medium' && 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-200',
              impact.level === 'low'    && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            )}>
              {IMPACT_LEVEL_LABEL[impact.level]}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {impact.advisories.map((advice, i) => (
              <li key={i} className={clsx('text-xs leading-snug flex gap-2', palette.body)}>
                <span className="opacity-50 select-none">•</span>
                <span>{advice}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
