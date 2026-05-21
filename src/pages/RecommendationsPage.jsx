import { useEffect, useState, useMemo } from 'react'
import {
  Download, Shirt, Home, Lightbulb,
  HeartPulse, LineChart as LineChartIcon, HelpCircle, AlertTriangle
} from 'lucide-react'
import { useWeather } from '../context/WeatherContext'
import { russiaCities } from '../data/russiaCities'
import { resolveLiveHydropost } from '../utils/hydroResolver'
import { calculateWeatherImpact } from '../utils/weatherImpact'
import { fetchLatestKp } from '../services/geomagService'
import { pickTipOfDay } from '../utils/tipOfDay'
import { exportWeatherReport } from '../utils/exportReport'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// Fallback river thresholds when the parsed hydropost page doesn't carry
// explicit "пойма" / "опасный" values (the common case).
const FALLBACK_RIVER = { norm: 290, warning: 380, critical: 480 }

// Dynamic clothing advice based on temperature + precipitation
function clothingFor({ temp, precipChance }) {
  if (temp < 0) {
    return {
      text: 'Тёплая зимняя куртка, шапка и перчатки обязательны. Утеплённые ботинки, термобельё.',
      chips: ['Пуховик', 'Шапка', 'Ботинки'],
    }
  }
  if (temp < 10) {
    return {
      text: 'Тёплая куртка или пальто. Шарф пригодится. Брюки потеплее, закрытая обувь.',
      chips: ['Куртка', 'Шарф', 'Ботинки'],
    }
  }
  if (temp < 18) {
    return {
      text: precipChance > 60
        ? 'Ветровка с капюшоном или плащ. Джинсы или брюки. Непромокаемая обувь.'
        : 'Ветровка или лёгкая куртка. Джинсы или брюки. Кроссовки или ботинки. Шапка не нужна.',
      chips: ['Ветровка', 'Джинсы', 'Кроссовки'],
    }
  }
  if (temp < 24) {
    return {
      text: 'Лёгкая рубашка или футболка с длинным рукавом. Джинсы или лёгкие брюки.',
      chips: ['Рубашка', 'Джинсы', 'Кроссовки'],
    }
  }
  return {
    text: 'Лёгкая футболка, шорты или лёгкие брюки. Кепка не помешает. Пейте больше воды.',
    chips: ['Футболка', 'Шорты', 'Кеды'],
  }
}

function clothingChipIcon(label) {
  // Tiny inline SVG silhouettes — each chip is a circle with a hint glyph
  const map = {
    'Ветровка':  <path d="M9 11 L9 22 L23 22 L23 11 L19 8 L13 8 Z M13 8 L16 11 L19 8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />,
    'Куртка':    <path d="M9 11 L9 22 L23 22 L23 11 L19 8 L13 8 Z M16 11 L16 22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />,
    'Пуховик':   <path d="M9 11 L9 22 L23 22 L23 11 L19 8 L13 8 Z M12 14 L20 14 M12 18 L20 18" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
    'Рубашка':   <path d="M10 10 L13 8 L19 8 L22 10 L22 22 L10 22 Z M13 8 L16 11 L19 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Футболка':  <path d="M10 10 L13 8 L19 8 L22 10 L20 13 L20 22 L12 22 L12 13 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Шапка':     <path d="M9 18 L9 16 Q9 9 16 9 Q23 9 23 16 L23 18 Z M9 18 L23 18 L23 20 L9 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Шарф':      <path d="M10 9 L10 17 L13 22 L13 15 M10 9 L22 9 L22 17 L19 22 L19 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Джинсы':    <path d="M11 9 L21 9 L20 22 L17 22 L16 14 L15 22 L12 22 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Брюки':     <path d="M11 9 L21 9 L20 22 L17 22 L16 14 L15 22 L12 22 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Шорты':     <path d="M11 9 L21 9 L20 17 L17 17 L16 13 L15 17 L12 17 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Кроссовки': <path d="M8 18 L8 14 L13 12 L17 16 L23 17 L23 20 L8 20 Z M14 14 L15 16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Ботинки':   <path d="M9 20 L9 12 L13 12 L13 16 L20 17 L23 18 L23 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    'Кеды':      <path d="M8 18 L8 14 L13 12 L17 16 L23 17 L23 20 L8 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
  }
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      {map[label] ?? map['Футболка']}
    </svg>
  )
}

export default function RecommendationsPage() {
  const [period, setPeriod] = useState('today')
  const { activeCity, currentWeather, forecastDays, isLoading, error, lastUpdated } = useWeather()

  // Derive today / tomorrow weather inputs for the clothingFor helper from
  // the live forecast. Falls back to safe defaults while loading.
  const data = useMemo(() => {
    const today = currentWeather
      ? {
          temp:         Math.round(currentWeather.tempC),
          feelsLike:    Math.round(currentWeather.feelsLikeC),
          precipChance: forecastDays[0]?.precipChance ?? 0,
          condition:    currentWeather.conditionText,
        }
      : { temp: 0, feelsLike: 0, precipChance: 0, condition: '' }

    const tomorrowDay = forecastDays[1]
    const tomorrow = tomorrowDay
      ? {
          temp:         Math.round(tomorrowDay.avgTempC),
          feelsLike:    Math.round(tomorrowDay.avgTempC),
          precipChance: tomorrowDay.precipChance,
          condition:    tomorrowDay.conditionText,
        }
      : { temp: 0, feelsLike: 0, precipChance: 0, condition: '' }

    return (period === 'today' ? today : tomorrow)
  }, [period, currentWeather, forecastDays])

  const advice = useMemo(() => clothingFor(data), [data])
  const hasData = !!currentWeather

  // ─── Nearest hydropost with LIVE data (tries 5 nearest in parallel) ──────
  const [hydroResolve, setHydroResolve] = useState({ loading: false, nearest: null, active: null, tried: [] })
  useEffect(() => {
    if (!activeCity) return
    const match = russiaCities.find(c => c.nameRu === activeCity)
    if (!match) return
    setHydroResolve(s => ({ ...s, loading: true }))
    resolveLiveHydropost(match.lat, match.lng, { tries: 5 })
      .then(res => setHydroResolve({ loading: false, ...res }))
      .catch(()  => setHydroResolve({ loading: false, nearest: null, active: null, tried: [] }))
  }, [activeCity])

  // Derive flood-risk panel inputs — prefer ACTIVE post; fall back to nearest meta
  const riverData = useMemo(() => {
    const a = hydroResolve.active
    const n = hydroResolve.nearest
    const post = a?.station ?? n?.station
    const dist = a?.distanceKm ?? n?.distanceKm
    const live = a?.data
    return {
      post,
      distanceKm: dist,
      riverName: post?.river || post?.name || 'река',
      level:     live?.level ?? null,
      norm:      FALLBACK_RIVER.norm,
      warning:   live?.warning ?? FALLBACK_RIVER.warning,
      critical:  live?.danger ?? FALLBACK_RIVER.critical,
      status:    live?.status ?? 'normal',
      delta:     live?.delta ?? null,
      isActive:  !!a,
      checkedCount: hydroResolve.tried.length,
    }
  }, [hydroResolve])

  // ─── Flood probability heuristic ────────────────────────────────────────
  // Combines: how close water is to thresholds, today's rain forecast, and
  // upward trend. Returns 0..100 %.
  const floodProb = useMemo(() => {
    let p = 5     // base background risk
    const lvl = riverData.level
    const warn = riverData.warning
    const crit = riverData.critical
    if (lvl != null) {
      if (lvl >= crit) p = 95
      else if (lvl >= warn) p = 60 + ((lvl - warn) / Math.max(1, crit - warn)) * 30
      else                  p = 5  + ((lvl) / Math.max(1, warn)) * 25
    }
    // Rising trend adds 10-20%
    if (riverData.delta != null && riverData.delta > 0) p += Math.min(20, riverData.delta * 0.6)
    // Today's heavy rain adds up to 20%
    const rain = forecastDays?.[0]?.totalPrecipMm ?? 0
    if (rain > 0) p += Math.min(20, rain * 1.5)
    // Cap
    return Math.round(Math.min(100, Math.max(0, p)))
  }, [riverData, forecastDays])

  // marker position 0..100 along the bar
  const markerPct = (() => {
    if (riverData.level == null) return 0
    const max = riverData.critical * 1.1
    return Math.min(100, Math.max(0, (riverData.level / max) * 100))
  })()

  // ─── Geomagnetic Kp index for "Самочувствие" ─────────────────────────────
  const [geomag, setGeomag] = useState(null)
  useEffect(() => {
    fetchLatestKp().then(setGeomag).catch(() => setGeomag(null))
  }, [])

  // ─── "Совет дня" — picked dynamically from weather context ──────────────
  const tip = useMemo(() => pickTipOfDay({
    tempC:         currentWeather?.tempC,
    feelsLikeC:    currentWeather?.feelsLikeC,
    windMs:        currentWeather?.windMs,
    precipChance:  forecastDays?.[0]?.precipChance,
    precipMm:      forecastDays?.[0]?.totalPrecipMm,
    humidity:      currentWeather?.humidity,
    uv:            currentWeather?.uv,
    pressureMmHg:  currentWeather?.pressureMmHg,
    conditionText: currentWeather?.conditionText ?? '',
    isDay:         currentWeather?.isDay ?? true,
    aqi:           currentWeather?.aqi,
  }), [currentWeather, forecastDays])

  // ─── "Самочувствие" — combine weather impact + geomag ────────────────────
  const wellness = useMemo(() => {
    if (!currentWeather) return null
    const base = calculateWeatherImpact(currentWeather, forecastDays)
    if (!geomag?.classification?.advice) return base
    // Inject geomag as an extra advisory; elevate level if it's a storm.
    const geoLevel = geomag.classification.level
    const stormy = geoLevel === 'storm' || geoLevel === 'severe'
    const advisories = [...base.advisories, `Геомагнитное поле: Kp ${geomag.kp?.toFixed?.(1) ?? geomag.kp} (${geomag.classification.label}). ${geomag.classification.advice}`]
    const level = stormy && base.level === 'low' ? 'medium'
                : geoLevel === 'severe' ? 'high'
                : base.level
    return { ...base, level, advisories }
  }, [currentWeather, forecastDays, geomag])

  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  return (
    <div className="space-y-6">
      {/* ===== PAGE TOOLBAR ===== */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            {activeCity}
          </h1>
          {hasData && (
            <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
              {data.temp >= 0 ? '+' : ''}{data.temp}°C · {data.condition}
            </span>
          )}
          {!hasData && isLoading && (
            <span className="text-xs text-slate-400">загрузка…</span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.4} />{error}
            </span>
          )}
        </div>

        {/* Сегодня / Завтра switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full transition-colors duration-200
                        bg-white dark:bg-[#131E36]/80
                        border border-slate-200 dark:border-white/[0.04]
                        shadow-sm dark:shadow-none">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'tomorrow', label: 'Завтра' },
          ].map(({ key, label }) => {
            const active = period === key
            return (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={
                  'px-5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ' +
                  (active
                    ? 'bg-[#2F80FF] text-white dark:bg-[#2F80FF]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6">
        {/* ============ LEFT COLUMN ============ */}
        <div className="space-y-5">
          {/* "Что надеть?" */}
          <section className={`${card} rounded-3xl p-6`}>
            <div className="flex items-start gap-6">
              {/* Big shirt icon */}
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-200
                              bg-blue-50 dark:bg-[#1A2A55]">
                <Shirt className="w-12 h-12 text-blue-500 dark:text-white" strokeWidth={1.8} />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                  Что надеть?
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200">
                  {advice.text}
                </p>
              </div>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-8 mt-5 pl-[7.5rem]">
              {advice.chips.map(chip => (
                <div key={chip} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200
                                  bg-blue-50 dark:bg-blue-500/15
                                  text-blue-500 dark:text-blue-300">
                    {clothingChipIcon(chip)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
                    {chip}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* "Риск затопления" */}
          <section className={`${card} rounded-3xl p-6`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-200 ' +
                  (riverData.status === 'critical' ? 'bg-red-50 dark:bg-red-500/15'
                   : riverData.status === 'warning' ? 'bg-orange-50 dark:bg-orange-500/15'
                   : 'bg-emerald-50 dark:bg-emerald-500/15')
                }>
                  <Home className={
                    'w-5 h-5 ' +
                    (riverData.status === 'critical' ? 'text-red-600 dark:text-red-400'
                     : riverData.status === 'warning' ? 'text-orange-600 dark:text-orange-400'
                     : 'text-emerald-600 dark:text-emerald-400')
                  } strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                  Риск затопления
                </h3>
              </div>
              <div className={
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 border ' +
                (riverData.status === 'critical' ? 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                 : riverData.status === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20'
                 : 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20')
              }>
                {riverData.status === 'critical' ? 'Опасный уровень'
                 : riverData.status === 'warning' ? 'Повышенный'
                 : 'Дороги открыты'}
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200 mb-5">
              {riverData.post
                ? <>Ближайший пост с данными: <b>{riverData.post.name}</b> на реке <b>{riverData.riverName}</b>
                    {riverData.distanceKm != null && <> ({Math.round(riverData.distanceKm)} км от города)</>}.{' '}</>
                : <>Подбираем ближайший гидропост… </>}
              {hydroResolve.loading && <>Получаем уровень воды…</>}
              {!hydroResolve.loading && !riverData.isActive && riverData.checkedCount > 0 && (
                <>Оперативных данных в радиусе нет (проверено {riverData.checkedCount} ближайших постов).</>
              )}
              {riverData.level != null && (
                <>
                  Уровень: <span className="font-semibold text-slate-900 dark:text-white">{Math.round(riverData.level)} см</span>
                  {riverData.delta != null && riverData.delta !== 0 && (
                    <> ({riverData.delta > 0 ? '+' : ''}{riverData.delta} см за сутки)</>
                  )}.
                </>
              )}
            </p>

            {/* Vertical-marker scale on the gradient — only when we have data */}
            {riverData.level != null && (
              <div className="relative mb-5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ background: 'linear-gradient(to right, #22C55E 0%, #22C55E 55%, #F59E0B 55%, #F59E0B 80%, #EF4444 80%, #EF4444 100%)' }}
                />
                <div className="absolute -top-1 -translate-x-1/2 flex flex-col items-center" style={{ left: `${markerPct}%` }}>
                  <div className="w-0.5 h-5 bg-slate-900 dark:bg-white transition-colors duration-200" />
                </div>
                <div className="flex justify-between items-start mt-2 text-[10px] uppercase tracking-widest font-semibold">
                  <span className="text-slate-500 dark:text-slate-400 transition-colors duration-200">Норма ({riverData.norm})</span>
                  <span className="text-slate-700 dark:text-white font-bold normal-case tracking-normal text-xs transition-colors duration-200"
                        style={{ position: 'absolute', left: `${markerPct}%`, top: 28, transform: 'translateX(-50%)' }}>
                    {Math.round(riverData.level)} см
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 transition-colors duration-200">Критический ({riverData.critical})</span>
                </div>
              </div>
            )}

            {/* Flood-probability bar — always rendered, even without live level */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">Вероятность подтопления</span>
                <span className={
                  'text-sm font-bold ' +
                  (floodProb >= 70 ? 'text-red-600 dark:text-red-400'
                   : floodProb >= 35 ? 'text-orange-500 dark:text-orange-400'
                   : 'text-emerald-600 dark:text-emerald-400')
                }>
                  {floodProb}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-700/40 overflow-hidden">
                <div
                  className={
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-300 ' +
                    (floodProb >= 70 ? 'bg-[#EF4444]'
                     : floodProb >= 35 ? 'bg-[#F59E0B]'
                     : 'bg-[#22C55E]')
                  }
                  style={{ width: `${floodProb}%` }}
                />
              </div>
              <div className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400">
                {floodProb < 15 && 'Риск минимальный. Дороги и набережные в норме.'}
                {floodProb >= 15 && floodProb < 35 && 'Низкий риск. Следите за прогнозом дождя.'}
                {floodProb >= 35 && floodProb < 70 && 'Повышенный риск. Возможны лужи и локальные подтопления.'}
                {floodProb >= 70 && 'Высокий риск. Не приближайтесь к набережным и низинам.'}
              </div>
            </div>
          </section>

          {/* "Совет дня" — full-width blue */}
          <section className="rounded-3xl p-5 flex items-center gap-4 transition-colors duration-200
                              bg-[#2F80FF] dark:bg-[#13224A] border border-transparent dark:border-blue-700/30
                              shadow-md shadow-blue-500/20 dark:shadow-black/30">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                            bg-white/15">
              <Lightbulb className="w-6 h-6 text-yellow-300" strokeWidth={2.2} fill="#FDE68A" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-white/80">
                Совет дня
              </div>
              <div className="text-base font-semibold text-white mt-0.5">
                {tip.title}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {tip.text}
              </div>
            </div>
          </section>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="space-y-5">
          {/* Зонт */}
          <section className={`${card} rounded-3xl p-5`}>
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
                Зонт
              </h4>
              <button className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200
                                 bg-slate-100 hover:bg-slate-200 text-slate-500
                                 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:text-slate-400">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white transition-colors duration-200">
              {data.precipChance < 50 ? 'Зонт не нужен' : 'Возьмите зонт'}
            </div>
            <p className="text-xs mt-2 text-slate-500 dark:text-slate-400 transition-colors duration-200">
              Вероятность осадков {data.precipChance}%, {data.precipChance < 50 ? 'дождь маловероятен' : 'возможен дождь'}.
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden transition-colors duration-200">
              <div
                className={'h-full rounded-full ' + (data.precipChance < 50 ? 'bg-[#22C55E]' : 'bg-[#F59E0B]')}
                style={{ width: `${data.precipChance}%` }}
              />
            </div>
          </section>

          {/* Самочувствие — driven by calculateWeatherImpact on real data */}
          <section className={`${card} rounded-3xl p-5`}>
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
                Самочувствие
              </h4>
              <div className={
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 ' +
                (wellness?.level === 'high'   ? 'bg-red-50 dark:bg-red-500/10'
                 : wellness?.level === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10'
                 : 'bg-emerald-50 dark:bg-emerald-500/10')
              }>
                <HeartPulse className={
                  'w-4 h-4 ' +
                  (wellness?.level === 'high'   ? 'text-red-500 dark:text-red-400'
                   : wellness?.level === 'medium' ? 'text-amber-500 dark:text-amber-400'
                   : 'text-emerald-500 dark:text-emerald-400')
                } strokeWidth={2.2} />
              </div>
            </div>

            {wellness ? (
              <>
                <div className={
                  'text-sm font-semibold mb-2 ' +
                  (wellness.level === 'high'   ? 'text-red-700 dark:text-red-300'
                   : wellness.level === 'medium' ? 'text-amber-800 dark:text-amber-200'
                   : 'text-emerald-700 dark:text-emerald-300')
                }>
                  {wellness.headline}
                </div>
                <ul className="space-y-2.5 text-sm">
                  {wellness.advisories.map((adv, i) => {
                    const dot = wellness.level === 'high' ? '#ef4444'
                              : wellness.level === 'medium' ? '#f59e0b'
                              : '#22c55e'
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: dot }} />
                        <span className="text-slate-700 dark:text-slate-200 leading-snug transition-colors duration-200">
                          {adv}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Загружаем данные о погоде…</div>
            )}
          </section>

          {/* Статус данных */}
          <section className="rounded-3xl p-4 flex items-center gap-3 transition-colors duration-200
                              bg-blue-50/70 dark:bg-[#131E36]/80
                              border border-blue-100 dark:border-white/[0.04]
                              shadow-sm dark:shadow-xl dark:shadow-black/20">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200
                            bg-white dark:bg-blue-500/15
                            border border-blue-100 dark:border-transparent">
              <LineChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-300" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
                Статус данных
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">
                {lastUpdated
                  ? `Обновлено ${formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ru })}`
                  : isLoading ? 'Обновляется…' : 'Нет данных'}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ===== FOOTER BAR ===== */}
      <div className={`${card} rounded-3xl px-5 py-4 flex items-center justify-between gap-4`}>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Гидрометцентр
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">
            Прогноз сформирован нейросетью на основе 14 датчиков
          </div>
        </div>

        <button
          onClick={() => exportWeatherReport({
            city: activeCity,
            current: currentWeather,
            days: forecastDays,
            hydro: hydroResolve.active
              ? { station: hydroResolve.active.station, distanceKm: hydroResolve.active.distanceKm, data: hydroResolve.active.data }
              : (hydroResolve.nearest
                  ? { station: hydroResolve.nearest.station, distanceKm: hydroResolve.nearest.distanceKm, data: null }
                  : null),
            tip,
            wellness,
          })}
          disabled={!currentWeather}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                     bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                     shadow-md shadow-blue-500/30 dark:shadow-blue-900/40
                     disabled:opacity-50 disabled:cursor-not-allowed"
          title="Откроется окно печати — выберите «Сохранить как PDF»"
        >
          <Download className="w-4 h-4" strokeWidth={2.2} />
          Скачать отчёт (PDF)
        </button>
      </div>
    </div>
  )
}
