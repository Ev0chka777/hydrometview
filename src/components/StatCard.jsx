import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ icon: Icon, label, value, unit, change, changeLabel, color = 'blue', className }) {
  const colorMap = {
    blue: 'from-primary-600/20 to-primary-600/5 border-primary-500/30 text-primary-400',
    cyan: 'from-hydro-600/20 to-hydro-600/5 border-hydro-500/30 text-hydro-400',
    green: 'from-success-600/20 to-success-600/5 border-success-500/30 text-success-400',
    orange: 'from-warning-600/20 to-warning-600/5 border-warning-500/30 text-warning-400',
    red: 'from-danger-600/20 to-danger-600/5 border-danger-500/30 text-danger-400',
  }

  const iconBgMap = {
    blue: 'bg-primary-600/20 text-primary-400',
    cyan: 'bg-hydro-600/20 text-hydro-400',
    green: 'bg-success-600/20 text-success-400',
    orange: 'bg-warning-600/20 text-warning-400',
    red: 'bg-danger-600/20 text-danger-400',
  }

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const trendColor = change > 0 ? 'text-success-400' : change < 0 ? 'text-danger-400' : 'text-dark-500'

  return (
    <div className={clsx(
      'card card-hover p-5 bg-gradient-to-br border',
      colorMap[color],
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-2.5 rounded-xl', iconBgMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(change)}{typeof change === 'number' && '%'}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="stat-value text-white">{value}</span>
          {unit && <span className="text-sm text-dark-400">{unit}</span>}
        </div>
        <div className="stat-label">{label}</div>
        {changeLabel && (
          <div className="text-xs text-dark-500">{changeLabel}</div>
        )}
      </div>
    </div>
  )
}
