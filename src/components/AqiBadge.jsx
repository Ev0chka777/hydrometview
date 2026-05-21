import { Wind } from 'lucide-react'
import clsx from 'clsx'

/**
 * Air-quality badge — shows the EPA index + human label coloured by the
 * standard EPA scale. Compact by default; pass `full` for expanded layout
 * with the pollutant breakdown.
 *
 * @param {object} props
 * @param {{ epa, label, color, pm25, pm10, no2, o3, so2, co }} props.aqi
 * @param {boolean} [props.full=false]
 */
export default function AqiBadge({ aqi, full = false, className = '' }) {
  if (!aqi || aqi.epa == null) return null

  if (!full) {
    return (
      <div
        className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', className)}
        style={{ background: aqi.color + '22', color: aqi.color, border: `1px solid ${aqi.color}44` }}
        title={`Качество воздуха: ${aqi.label} (EPA ${aqi.epa}/6)`}
      >
        <Wind className="w-3 h-3" strokeWidth={2.4} />
        AQI · {aqi.label}
      </div>
    )
  }

  // Expanded card with pollutants
  return (
    <div className={clsx(
      'rounded-2xl p-4 border transition-colors duration-200',
      className,
    )}
    style={{ background: aqi.color + '15', borderColor: aqi.color + '40' }}>
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
          style={{ background: aqi.color }}
          aria-label={`EPA индекс ${aqi.epa} из 6`}
        >
          {aqi.epa}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
            Качество воздуха
          </div>
          <div className="text-sm font-semibold mt-0.5" style={{ color: aqi.color }}>
            {aqi.label}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {aqiAdvice(aqi.epa)}
          </div>
        </div>
      </div>
      {(aqi.pm25 != null || aqi.pm10 != null || aqi.no2 != null) && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {aqi.pm25 != null && <Pollutant label="PM2.5" value={aqi.pm25} unit="µg/m³" />}
          {aqi.pm10 != null && <Pollutant label="PM10"  value={aqi.pm10} unit="µg/m³" />}
          {aqi.no2  != null && <Pollutant label="NO₂"   value={aqi.no2}  unit="µg/m³" />}
        </div>
      )}
    </div>
  )
}

function Pollutant({ label, value, unit }) {
  return (
    <div className="rounded-lg p-2 bg-white/60 dark:bg-white/[0.04] border border-slate-200/40 dark:border-white/[0.04]">
      <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
        {value} <span className="text-[9px] font-normal opacity-60">{unit}</span>
      </div>
    </div>
  )
}

function aqiAdvice(epa) {
  switch (epa) {
    case 1: return 'Чистый воздух — можно гулять и заниматься спортом'
    case 2: return 'Приемлемое качество. Чувствительным людям возможен дискомфорт'
    case 3: return 'Чувствительным группам (астма, аллергики) — ограничить нагрузку'
    case 4: return 'Возможны проблемы у всех. Сократите время на улице'
    case 5: return 'Серьёзные риски. Лучше остаться дома, закрыть окна'
    case 6: return 'Опасно для здоровья. Не выходите без необходимости'
    default: return ''
  }
}
