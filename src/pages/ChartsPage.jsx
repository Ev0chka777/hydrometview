import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getHydropost } from '../data/hydroposts'
import {
  Download, LineChart as LineChartIcon
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  ReferenceLine, ResponsiveContainer, Legend, LabelList
} from 'recharts'
import { useTheme } from '../theme/ThemeContext'

// Small weather icons rendered as a row beneath the temperature chart
function WeatherDot({ kind, className = 'w-7 h-7' }) {
  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="16" cy="16" r="6" fill="#F97316" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
          <line key={d}
            x1={16 + Math.cos(d * Math.PI / 180) * 9}
            y1={16 + Math.sin(d * Math.PI / 180) * 9}
            x2={16 + Math.cos(d * Math.PI / 180) * 12}
            y2={16 + Math.sin(d * Math.PI / 180) * 12}
            stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
    )
  }
  if (kind === 'sun_cloud') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="11" cy="12" r="5" fill="#F97316" />
        {[0, 60, 120, 180, 240, 300].map(d => (
          <line key={d}
            x1={11 + Math.cos(d * Math.PI / 180) * 7}
            y1={12 + Math.sin(d * Math.PI / 180) * 7}
            x2={11 + Math.cos(d * Math.PI / 180) * 9.5}
            y2={12 + Math.sin(d * Math.PI / 180) * 9.5}
            stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        <path d="M11 22 Q11 18 15 18 Q16 14 21 14 Q26 14 26 19 Q29 19 29 22 Q29 25 26 25 H14 Q9 25 9 22 Q9 22 11 22Z" fill="#3B82F6" />
      </svg>
    )
  }
  if (kind === 'cloud') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M6 20 Q6 15 11 15 Q12 11 17 11 Q23 11 23 16 Q27 16 27 20 Q27 24 23 24 H10 Q5 24 5 20 Q5 20 6 20Z" fill="#94A3B8" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M5 16 Q5 11 10 11 Q12 7 17 7 Q23 7 23 12 Q27 12 27 16 Q27 20 23 20 H10 Q5 20 5 16 Q5 16 5 16Z" fill="#3B82F6" />
        <line x1="10" y1="22" x2="9" y2="27" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="22" x2="15" y2="27" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="22" x2="21" y2="27" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return null
}

// Humidity ring — SVG donut
function HumidityRing({ value = 65 }) {
  const r = 70
  const c = 2 * Math.PI * r
  const filled = c * (value / 100)
  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44">
      <circle cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="16" fill="none" className="text-slate-200 dark:text-white/10 transition-colors duration-200" />
      <circle
        cx="100" cy="100" r={r}
        stroke="#3B82F6"
        strokeWidth="16" fill="none"
        strokeDasharray={`${filled} ${c}`}
        strokeDashoffset={c * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
      />
      <text x="100" y="108" textAnchor="middle" className="fill-slate-900 dark:fill-white transition-colors duration-200" fontSize="32" fontWeight="700">{value}%</text>
    </svg>
  )
}

// Semi-circle gauge — blue → green → red, with a needle pointing to value
function ComparisonGauge({ value = 15, min = 10, max = 30, label = '15°C' }) {
  const cx = 100, cy = 100, r = 70
  // angle for value (180° from left, 0° from right; we use 180 left → 0 right)
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const angle = Math.PI * (1 - t) // π at min (left), 0 at max (right)
  const needleX = cx + Math.cos(angle) * (r - 6)
  const needleY = cy - Math.sin(angle) * (r - 6)

  // Helper to describe an arc from a1→a2 (both in radians from +x axis, going CCW)
  function arcPath(a1, a2) {
    const sx = cx + Math.cos(a1) * r
    const sy = cy - Math.sin(a1) * r
    const ex = cx + Math.cos(a2) * r
    const ey = cy - Math.sin(a2) * r
    const large = (a1 - a2) > Math.PI ? 1 : 0
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`
  }

  // segments: blue 180-120°, green 120-60°, red 60-0°
  const a180 = Math.PI
  const a120 = (120 * Math.PI) / 180
  const a60 = (60 * Math.PI) / 180
  const a0 = 0

  return (
    <svg viewBox="0 0 200 130" className="w-48 h-32">
      <path d={arcPath(a180, a120)} stroke="#3B82F6" strokeWidth="14" fill="none" strokeLinecap="butt" />
      <path d={arcPath(a120, a60)} stroke="#22C55E" strokeWidth="14" fill="none" strokeLinecap="butt" />
      <path d={arcPath(a60, a0)} stroke="#EF4444" strokeWidth="14" fill="none" strokeLinecap="butt" />

      {/* Labels around the arc */}
      <text x={cx + Math.cos(a180) * (r + 14)} y={cy - Math.sin(a180) * (r + 14) + 4}
        textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400 transition-colors duration-200">{min}</text>
      <text x={cx + Math.cos(a120) * (r + 14)} y={cy - Math.sin(a120) * (r + 14)}
        textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400 transition-colors duration-200">0</text>
      <text x={cx + Math.cos(Math.PI / 2) * (r + 14)} y={cy - Math.sin(Math.PI / 2) * (r + 14) - 2}
        textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400 transition-colors duration-200">10</text>
      <text x={cx + Math.cos(a60) * (r + 14)} y={cy - Math.sin(a60) * (r + 14)}
        textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400 transition-colors duration-200">20</text>
      <text x={cx + Math.cos(a0) * (r + 14)} y={cy - Math.sin(a0) * (r + 14) + 4}
        textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400 transition-colors duration-200">{max}</text>

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        className="text-slate-900 dark:text-white transition-colors duration-200" />
      <circle cx={cx} cy={cy} r="4" className="fill-slate-900 dark:fill-white transition-colors duration-200" />

      {/* Center label */}
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize="18" fontWeight="700" className="fill-slate-900 dark:fill-white transition-colors duration-200">{label}</text>
    </svg>
  )
}

// Generates temperature + water data for given days
function makeTempData(days) {
  const base = [
    { day: 'Пн', fact: 12, feels: 10, icon: 'sun' },
    { day: 'Вт', fact: 15, feels: 13, icon: 'sun_cloud' },
    { day: 'Ср', fact: 18, feels: 16, icon: 'cloud' },
    { day: 'Чт', fact: 14, feels: 11, icon: 'rain' },
    { day: 'Пт', fact: 16, feels: 14, icon: 'sun' },
    { day: 'Сб', fact: 17, feels: 15, icon: 'sun_cloud' },
    { day: 'Вс', fact: 13, feels: 11, icon: 'cloud' },
  ]
  return base.slice(0, days)
}

function makeWaterData(days) {
  const base = [
    { day: 'Пн', level: 120 },
    { day: 'Вт', level: 145 },
    { day: 'Ср', level: 140 },
    { day: 'Чт', level: 140 },
    { day: 'Пт', level: 150 },
    { day: 'Сб', level: 148 },
    { day: 'Вс', level: 146 },
  ]
  return base.slice(0, days)
}

export default function ChartsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [period, setPeriod] = useState(5)
  const [params] = useSearchParams()
  const postId = params.get('post') || 'spb-neva'
  const post = getHydropost(postId)
  const screenTitle = post ? `${post.city} — ${post.river}` : 'Санкт-Петербург'

  const tempData = makeTempData(period)
  const waterData = makeWaterData(period)

  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  // Chart palette by theme
  const grid = isDark ? '#1E2A4A' : '#E2E8F0'
  const axisTick = isDark ? '#64748B' : '#94A3B8'

  return (
    <div className="space-y-6">
      {/* ===== PAGE TOOLBAR ===== */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
          {screenTitle}
        </h1>

        {/* Period switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full transition-colors duration-200
                        bg-white dark:bg-[#131E36]/80
                        border border-slate-200 dark:border-white/[0.04]
                        shadow-sm dark:shadow-none">
          {[3, 5, 7].map(d => {
            const active = period === d
            return (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ' +
                  (active
                    ? 'bg-slate-100 text-slate-900 dark:bg-[#2F80FF] dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                }
              >
                {d === 3 ? '3 дня' : d === 5 ? '5 дней' : '7 дней'}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT — charts */}
        <div className="space-y-6">
          {/* Temperature chart */}
          <section className={`${card} rounded-3xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                Температура воздуха, °C
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors duration-200">
                  <span className="inline-block w-4 h-0.5 bg-[#F97316]" /> Факт
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors duration-200">
                  <span className="inline-block w-4 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-300" /> Ощущается
                </span>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={grid} strokeWidth={1} vertical horizontal />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={{ stroke: grid }} />
                  <YAxis tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={false} domain={[-10, 30]} ticks={[-10, 0, 10, 20, 30]} />
                  <Line
                    type="linear"
                    dataKey="feels"
                    name="Ощущается"
                    stroke={isDark ? '#CBD5E1' : '#94A3B8'}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="linear"
                    dataKey="fact"
                    name="Факт"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F97316', stroke: '#F97316' }}
                  >
                    <LabelList dataKey="fact" position="top" offset={10}
                      fill={isDark ? '#F8FAFC' : '#0F172A'} fontSize={12} fontWeight={600}
                      formatter={(v) => `${v}°`} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weather icon row, aligned under x-axis ticks */}
            <div className="grid mt-2 px-6" style={{ gridTemplateColumns: `repeat(${tempData.length}, 1fr)` }}>
              {tempData.map(d => (
                <div key={d.day} className="flex justify-center">
                  <WeatherDot kind={d.icon} className="w-7 h-7" />
                </div>
              ))}
            </div>
          </section>

          {/* Water level chart */}
          <section className={`${card} rounded-3xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                Уровень воды, см
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors duration-200">
                  <span className="inline-block w-4 h-0 border-t border-dashed border-[#22C55E]" /> Норма
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors duration-200">
                  <span className="inline-block w-4 h-0 border-t border-dashed border-[#EF4444]" /> Критический
                </span>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waterData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waterArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={isDark ? 0.45 : 0.25} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={isDark ? 0.05 : 0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} strokeWidth={1} vertical horizontal />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={{ stroke: grid }} />
                  <YAxis tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={false} domain={[0, 250]} ticks={[0, 50, 100, 150, 200, 250]} />
                  <ReferenceLine y={140} stroke="#22C55E" strokeDasharray="6 4" strokeWidth={1.5} />
                  <ReferenceLine y={210} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={1.5} />
                  <Area
                    type="linear"
                    dataKey="level"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#waterArea)"
                    dot={{ r: 3, fill: '#3B82F6', stroke: '#3B82F6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* RIGHT — metrics column */}
        <div className="space-y-5">
          {/* Humidity */}
          <section className={`${card} rounded-3xl p-5`}>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
              Влажность
            </h4>
            <div className="flex justify-center">
              <HumidityRing value={65} />
            </div>
            <div className="text-center text-xs mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">
              Умеренная влажность
            </div>
          </section>

          {/* Comparison gauge */}
          <section className={`${card} rounded-3xl p-5`}>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
              Сравнение с нормой
            </h4>
            <div className="flex justify-center">
              <ComparisonGauge value={15} label="15°C" />
            </div>
            <div className="mt-3 text-center rounded-xl py-2 text-xs font-medium transition-colors duration-200
                            bg-emerald-50 text-emerald-700
                            dark:bg-emerald-500/10 dark:text-emerald-300
                            border border-emerald-200/60 dark:border-emerald-500/20">
              В пределах нормы
            </div>
          </section>

          {/* Information */}
          <section className={`${card} rounded-3xl p-5`}>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
              Информация
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] mt-1 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 leading-snug transition-colors duration-200">
                  Система работает в штатном режиме
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] mt-1 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 leading-snug transition-colors duration-200">
                  Все посты передают данные в реальном времени
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className={`${card} rounded-3xl px-5 py-4 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center transition-colors duration-200">
            <LineChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-300" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
              Статистика
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">
              Данные обновлены 2 минуты назад
            </div>
          </div>
        </div>

        <button className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                           bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                           shadow-md shadow-blue-500/30 dark:shadow-blue-900/40">
          <Download className="w-4 h-4" strokeWidth={2.2} />
          Скачать графики (PNG/PDF)
        </button>
      </div>
    </div>
  )
}
