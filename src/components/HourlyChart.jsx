import { useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'

/**
 * Horizontal 24-hour temperature chart. Renders:
 *   • a smooth Catmull-Rom curve over the hourly temps
 *   • dots at each hour with a small temperature label
 *   • a faint blue area-fill under the curve
 *   • a tile row underneath with hour / icon / temp
 *   • a soft blue highlight on the tile that matches the user's local hour
 *
 * @param {Object} props
 * @param {Array<{epoch:number, hourLabel:string, tempC:number, conditionIcon?:string|null, conditionText?:string, isDay?:boolean}>} props.hours
 * @param {number} [props.cellWidth=70]
 * @param {string} [props.className]
 */
export default function HourlyChart({ hours = [], cellWidth = 70, className = '' }) {
  const containerRef = useRef(null)

  // The "current hour" highlight uses the user's local clock (not the
  // forecast's location time) — that's what feels right when staring at
  // the chart on your own machine.
  const nowEpoch = useMemo(() => {
    const sec = Math.floor(Date.now() / 1000)
    return sec - (sec % 3600)
  }, [])

  // Auto-scroll the "now" tile into view on first render. Useful when the
  // forecast starts before the current hour (rarely true here, but cheap).
  useEffect(() => {
    if (!containerRef.current || !hours.length) return
    const idx = hours.findIndex(h => h.epoch === nowEpoch)
    if (idx <= 0) return
    containerRef.current.scrollTo({ left: Math.max(0, idx * cellWidth - cellWidth * 2), behavior: 'smooth' })
  }, [hours, nowEpoch, cellWidth])

  if (!hours.length) {
    return (
      <div className={clsx('text-sm text-slate-500 dark:text-slate-400 py-6', className)}>
        Нет данных почасового прогноза
      </div>
    )
  }

  // ── Geometry ───────────────────────────────────────────────────────────────
  const padX = cellWidth / 2
  const chartH = 70                                  // pixels of vertical space for the curve
  const padTopY = 18                                  // headroom for the temp label above each dot
  const padBottomY = 6
  const svgH = chartH + padTopY + padBottomY
  const totalW = Math.max(hours.length * cellWidth, 600)

  const temps = hours.map(h => h.tempC)
  const minT = Math.min(...temps)
  const maxT = Math.max(...temps)
  const range = Math.max(1, maxT - minT)              // avoid divide-by-zero on flat days

  const points = hours.map((h, i) => ({
    ...h,
    x: i * cellWidth + padX,
    y: padTopY + (1 - (h.tempC - minT) / range) * chartH,
  }))

  // Smooth path through points (Catmull-Rom converted to cubic Bezier).
  const pathD = useMemo(() => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, cellWidth])

  const areaD = pathD ? `${pathD} L ${totalW - padX},${svgH - padBottomY} L ${padX},${svgH - padBottomY} Z` : ''

  return (
    <div
      ref={containerRef}
      className={clsx('scrollbar-none overflow-x-auto overflow-y-hidden', className)}
    >
      <div style={{ width: totalW, minWidth: '100%' }}>
        {/* Curve */}
        <svg width={totalW} height={svgH} className="block">
          <defs>
            <linearGradient id="hourlyChartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#2F80FF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2F80FF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {areaD && (
            <path d={areaD} fill="url(#hourlyChartArea)" />
          )}
          <path
            d={pathD}
            fill="none"
            stroke="#2F80FF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map(p => {
            const isNow = p.epoch === nowEpoch
            return (
              <g key={p.epoch}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isNow ? 4.5 : 3}
                  fill={isNow ? '#2F80FF' : '#ffffff'}
                  stroke="#2F80FF"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={p.y - 9}
                  textAnchor="middle"
                  className="fill-slate-700 dark:fill-slate-200"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {p.tempC >= 0 ? '+' : ''}{Math.round(p.tempC)}°
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hour tiles underneath the curve */}
        <div className="flex">
          {hours.map((h, i) => {
            const isNow = h.epoch === nowEpoch
            return (
              <div
                key={h.epoch}
                style={{ width: cellWidth }}
                className={clsx(
                  'flex flex-col items-center py-2 rounded-2xl transition-colors duration-200',
                  isNow
                    ? 'bg-blue-50 dark:bg-blue-500/15 ring-1 ring-blue-300/50 dark:ring-blue-400/30 shadow-sm shadow-blue-500/20'
                    : 'hover:bg-slate-50/70 dark:hover:bg-white/[0.03]'
                )}
              >
                <span className={clsx(
                  'text-[11px] font-medium leading-none',
                  isNow ? 'text-blue-700 dark:text-blue-200' : 'text-slate-500 dark:text-slate-400'
                )}>
                  {isNow ? 'Сейчас' : (i === 0 ? h.hourLabel : h.hourLabel)}
                </span>
                {h.conditionIcon
                  ? <img src={h.conditionIcon} alt={h.conditionText ?? ''} className="w-7 h-7 mt-1" />
                  : <div className="w-7 h-7 mt-1" />}
                <span className={clsx(
                  'text-[11px] font-semibold mt-0.5',
                  isNow ? 'text-blue-700 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200'
                )}>
                  {h.tempC >= 0 ? '+' : ''}{Math.round(h.tempC)}°
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
