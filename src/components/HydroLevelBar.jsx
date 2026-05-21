import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const statusConfig = {
  normal: { color: 'bg-success-500', text: 'text-success-400', label: 'Норма', glow: '' },
  warning: { color: 'bg-warning-500', text: 'text-warning-400', label: 'Повышенный', glow: '' },
  critical: { color: 'bg-danger-500', text: 'text-danger-400', label: 'Опасный', glow: 'glow-red' },
}

export default function HydroLevelBar({ station }) {
  const { level, levelNorm, levelWarning, levelCritical, status, name, river, flow, flowUnit, trend, trendValue } = station
  const cfg = statusConfig[status] || statusConfig.normal

  const max = levelCritical * 1.1
  const pct = (v) => Math.min((v / max) * 100, 100)

  const TrendIcon = trendValue > 0 ? TrendingUp : trendValue < 0 ? TrendingDown : Minus
  const trendColor = trendValue > 0 ? 'text-danger-400' : trendValue < 0 ? 'text-success-400' : 'text-dark-500'

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-dark-100">{name}</div>
          <div className="text-xs text-dark-500">{river}</div>
        </div>
        <span className={clsx('badge', {
          'badge-green': status === 'normal',
          'badge-yellow': status === 'warning',
          'badge-red': status === 'critical',
        })}>
          {cfg.label}
        </span>
      </div>

      {/* Level bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-dark-500">
          <span>0 см</span>
          <span>Норма {levelNorm}</span>
          <span>Пред. {levelWarning}</span>
          <span>Крит. {levelCritical}</span>
        </div>
        <div className="relative h-3 bg-dark-700 rounded-full overflow-hidden">
          {/* Norm marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-success-500/50 z-10"
            style={{ left: `${pct(levelNorm)}%` }}
          />
          {/* Warning marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-warning-500/50 z-10"
            style={{ left: `${pct(levelWarning)}%` }}
          />
          {/* Critical marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-danger-500/50 z-10"
            style={{ left: `${pct(levelCritical)}%` }}
          />
          {/* Fill */}
          <div
            className={clsx('absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700', cfg.color)}
            style={{ width: `${pct(level)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-baseline gap-1">
          <span className={clsx('text-2xl font-bold', cfg.text)}>{level}</span>
          <span className="text-xs text-dark-500">см</span>
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium ml-1', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {trendValue > 0 ? '+' : ''}{trendValue} см/сут
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-dark-200">{flow.toLocaleString('ru')}</div>
          <div className="text-xs text-dark-500">{flowUnit}</div>
        </div>
      </div>
    </div>
  )
}
