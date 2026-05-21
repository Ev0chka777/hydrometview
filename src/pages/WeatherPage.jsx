import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Sunrise, Moon,
  Droplets, Gauge, Wind, Eye, Navigation, Shirt, Umbrella, Waves, Info
} from 'lucide-react'
import { useEffect } from 'react'
import { useWeather } from '../context/WeatherContext'
import HourlyChart from '../components/HourlyChart'
import WeatherImpactWidget from '../components/WeatherImpactWidget'
import AqiBadge from '../components/AqiBadge'
import OfficialAlertsBanner from '../components/OfficialAlertsBanner'
import { resolveLiveHydropost } from '../utils/hydroResolver'
import { predictFloodLevel } from '../utils/floodPrediction'
import { compareToNorm } from '../data/seasonalNorms'
import { russiaCities } from '../data/russiaCities'
import { pickTipOfDay } from '../utils/tipOfDay'

function SunCloudIcon({ className = 'w-20 h-20' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="40" cy="20" r="9" fill="#FCD34D" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1={40 + Math.cos((deg * Math.PI) / 180) * 13}
          y1={20 + Math.sin((deg * Math.PI) / 180) * 13}
          x2={40 + Math.cos((deg * Math.PI) / 180) * 18}
          y2={20 + Math.sin((deg * Math.PI) / 180) * 18}
          stroke="#FCD34D"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M14 44 Q14 36 22 36 Q24 30 32 31 Q40 31 40 39 Q48 39 48 45 Q48 51 42 51 H20 Q12 51 12 45 Q12 44 14 44Z"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth="0.5"
      />
    </svg>
  )
}

// Small hour-icon: emoji-like sun/cloud/moon depending on label
function HourIcon({ kind, className = 'w-7 h-7' }) {
  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="16" cy="16" r="6" fill="#FCD34D" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <line key={d}
            x1={16 + Math.cos(d * Math.PI / 180) * 9}
            y1={16 + Math.sin(d * Math.PI / 180) * 9}
            x2={16 + Math.cos(d * Math.PI / 180) * 12}
            y2={16 + Math.sin(d * Math.PI / 180) * 12}
            stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
    )
  }
  if (kind === 'sun_cloud') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="20" cy="11" r="5" fill="#FCD34D" />
        {[0, 60, 120, 180, 240, 300].map((d) => (
          <line key={d}
            x1={20 + Math.cos(d * Math.PI / 180) * 7}
            y1={11 + Math.sin(d * Math.PI / 180) * 7}
            x2={20 + Math.cos(d * Math.PI / 180) * 9.5}
            y2={11 + Math.sin(d * Math.PI / 180) * 9.5}
            stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        <path d="M7 22 Q7 18 11 18 Q12 15 16 15 Q21 15 21 19 Q25 19 25 22 Q25 25 22 25 H10 Q6 25 6 22 Q6 22 7 22Z" fill="#CBD5E1" />
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
  if (kind === 'moon') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M21 6 A11 11 0 1 0 26 21 A8 8 0 0 1 21 6 Z" fill="#A5B4FC" />
      </svg>
    )
  }
  return null
}

const RU_MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
const RU_WEEKDAYS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

function formatDayChip(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${RU_WEEKDAYS[d.getDay()]} ${d.getDate()} ${RU_MONTHS[d.getMonth()]}`
}

export default function WeatherPage() {
  const { activeCity, currentWeather, hourlyForecast, forecastDays, isLoading, error } = useWeather()
  const [selectedHour, setSelectedHour] = useState(null)
  // Day index in forecastDays — 0 = today (default), 1..N = future days.
  const [dayIdx, setDayIdx] = useState(0)
  const safeDayIdx = Math.min(dayIdx, Math.max(0, forecastDays.length - 1))
  const selectedDay = forecastDays[safeDayIdx]
  const isToday = safeDayIdx === 0

  // For non-today panels, fall back to the selected forecast day's summary;
  // for today, use the live `currentWeather` snapshot.
  const w = isToday
    ? currentWeather
    : (selectedDay
        ? {
            // Synthesize a "currentWeather-like" object from the daily summary
            tempC:         selectedDay.avgTempC,
            feelsLikeC:    selectedDay.avgTempC,
            humidity:      selectedDay.avgHumidity,
            pressureMmHg:  currentWeather?.pressureMmHg, // not available per-day
            windMs:        selectedDay.maxWindMs,
            windDir:       currentWeather?.windDir ?? '',
            precipMm:      selectedDay.totalPrecipMm,
            precipChance:  selectedDay.precipChance,
            uv:            currentWeather?.uv ?? 0,
            conditionText: selectedDay.conditionText,
            conditionIcon: selectedDay.conditionIcon,
            localtime:     selectedDay.date,
          }
        : null)
  const hasData = !!w

  // Reusable surface classes
  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  const heroCard =
    'bg-gradient-to-br from-[#DCEAFB] to-[#E9F1FC] dark:from-[#1A3578] dark:to-[#0F1F47] ' +
    'border border-slate-200/70 dark:border-blue-700/30 ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/30 transition-colors duration-200'

  // ─── Nearest hydropost for the "Water level" section ─────────────────────
  // Pick the closest gauge to the active city coords and lazy-fetch its
  // operative water level. Updates whenever the user changes city.
  const cityCoords = currentWeather && currentWeather.cityName
    ? { lat: currentWeather.lat ?? null, lng: currentWeather.lng ?? null }
    : { lat: null, lng: null }
  // currentWeather doesn't carry coords today — derive them from `activeCity`
  // via the cities lookup we already use elsewhere. Simpler: use whatever
  // lat/lng was passed to changeCity. Cheapest reliable proxy: use the
  // hourly forecast's first epoch + assume location is encoded elsewhere.
  // We just default to whatever the closest match returns when coords missing.
  const [nearestHydro, setNearestHydro] = useState(null)
  // Find nearest hydropost by city coords. We rely on a global registry of
  // cities (russiaCities) for coord lookup since `currentWeather` doesn't
  // include lat/lng.
  const [hydroLive, setHydroLive] = useState({ loading: false, data: null, error: null })

  useEffect(() => {
    if (!activeCity) return
    const match = russiaCities.find(c => c.nameRu === activeCity)
    const lat = match?.lat
    const lng = match?.lng
    if (lat == null || lng == null) { setNearestHydro(null); return }
    setHydroLive({ loading: true, data: null, error: null })
    resolveLiveHydropost(lat, lng, { tries: 5 })
      .then(res => {
        // Prefer ACTIVE post; if none has live data, fall back to nearest meta.
        const chosen = res.active ?? res.nearest
        setNearestHydro(chosen ?? null)
        if (res.active) {
          setHydroLive({ loading: false, data: res.active.data, error: null })
        } else {
          setHydroLive({ loading: false, data: null, error: null })
        }
      })
      .catch(err => setHydroLive({ loading: false, data: null, error: err.message || 'Ошибка' }))
  }, [activeCity])

  // ─── Dynamic RecCards reflecting the SELECTED day's data ────────────────
  const dayTip = (() => {
    if (!hasData) return { clothing: '—', umbrella: '—', river: '—' }
    const t = w.tempC
    const feels = w.feelsLikeC ?? w.tempC
    const precipChance = w.precipChance ?? 0
    let clothing
    if (t < -10)      clothing = 'Тёплый пуховик, шапка'
    else if (t < 0)   clothing = 'Куртка, шарф, перчатки'
    else if (t < 10)  clothing = 'Куртка, джинсы, ботинки'
    else if (t < 18)  clothing = 'Ветровка, джинсы'
    else if (t < 24)  clothing = 'Рубашка, лёгкие брюки'
    else              clothing = 'Футболка, шорты'

    const umbrella = precipChance >= 60 ? 'Возьмите зонт'
                   : precipChance >= 30 ? 'Зонт может пригодиться'
                   : 'Не потребуется'

    const river = nearestHydro?.station
      ? `Ближайший пост: ${nearestHydro.station.name}`
      : 'Подбираем гидропост'
    return { clothing, umbrella, river }
  })()

  // Pressure marker position (0–100): 720 = low, 760 = normal, 790 = high.
  const pressurePct = w?.pressureMmHg != null
    ? Math.min(100, Math.max(0, ((w.pressureMmHg - 720) / 70) * 100))
    : 50
  const pressureBand =
    w?.pressureMmHg == null ? 'normal'
      : Math.abs(w.pressureMmHg - 760) <= 8  ? 'normal'
      : w.pressureMmHg < 752 ? 'low'  : 'high'
  // Dew point approximation (Magnus formula simplified)
  const dewPointC = (hasData && w.tempC != null && w.humidity != null)
    ? Math.round((w.tempC - (100 - w.humidity) / 5))
    : null

  return (
    <div className="space-y-6 pt-4">
      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
          Погода в {activeCity}
        </h1>

        {/* Day picker — supports 1..N days where N is whatever WeatherAPI
            returned (free tier caps at 3, paid up to 14). Prev/Next clamp. */}
        <div className="flex items-center gap-1 rounded-full px-1.5 py-1 transition-colors duration-200
                        bg-white dark:bg-[#1A2540]/90
                        border border-slate-200 dark:border-[#2A3754]
                        shadow-sm dark:shadow-none">
          <button
            onClick={() => setDayIdx(i => Math.max(0, i - 1))}
            disabled={safeDayIdx === 0}
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 text-slate-900 dark:text-white whitespace-nowrap transition-colors duration-200">
            {isToday
              ? `Сегодня, ${selectedDay ? formatDayChip(selectedDay.date).slice(3) : '—'}`
              : (selectedDay ? formatDayChip(selectedDay.date) : '—')}
          </span>
          <button
            onClick={() => setDayIdx(i => Math.min(forecastDays.length - 1, i + 1))}
            disabled={safeDayIdx >= forecastDays.length - 1}
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day strip — quick day chips, each shows mini-summary */}
      {forecastDays.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
          {forecastDays.map((d, i) => {
            const active = i === safeDayIdx
            const max = d.maxTempC != null ? Math.round(d.maxTempC) : null
            const min = d.minTempC != null ? Math.round(d.minTempC) : null
            return (
              <button
                key={d.date}
                onClick={() => setDayIdx(i)}
                className={
                  'min-w-[110px] flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-2xl transition-all duration-200 ' +
                  (active
                    ? 'bg-[#2F80FF] text-white shadow-sm dark:shadow-lg dark:shadow-blue-900/40'
                    : `${card} hover:bg-slate-50 dark:hover:bg-[#162345]`)
                }
              >
                <span className={'text-[11px] font-semibold ' + (active ? 'text-white/90' : 'text-slate-500 dark:text-slate-400')}>
                  {i === 0 ? 'Сегодня' : formatDayChip(d.date)}
                </span>
                {d.conditionIcon && (
                  <img src={d.conditionIcon} alt={d.conditionText ?? ''} className="w-8 h-8" />
                )}
                <span className={'text-xs font-bold ' + (active ? 'text-white' : 'text-slate-800 dark:text-slate-100')}>
                  {max != null ? `${max >= 0 ? '+' : ''}${max}°` : '—'}
                  {min != null && (
                    <span className={'ml-1 font-normal ' + (active ? 'text-white/70' : 'text-slate-500 dark:text-slate-400')}>
                      / {min >= 0 ? '+' : ''}{min}°
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ===== HERO CARD ===== */}
      <section className={`${heroCard} rounded-3xl p-4 sm:p-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_minmax(320px,auto)] gap-4 lg:gap-8 items-center">
          {/* Left side — big temp */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-6xl sm:text-7xl font-bold leading-none tracking-tight text-slate-900 dark:text-white flex items-center gap-3 transition-colors duration-200">
                {hasData ? `${w.tempC >= 0 ? '+' : ''}${Math.round(w.tempC)}°C` : '—'}
                {w?.conditionIcon
                  ? <img src={w.conditionIcon} alt={w.conditionText ?? ''} className="w-20 h-20 sm:w-24 sm:h-24" />
                  : <SunCloudIcon className="w-20 h-20 sm:w-24 sm:h-24" />}
              </div>
              <div className="text-lg font-medium mt-4 text-slate-800 dark:text-white/90 transition-colors duration-200">
                {hasData ? w.conditionText : (isLoading ? 'Загрузка…' : 'Нет данных')}
              </div>
              <div className="text-sm mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">
                {hasData ? `Ощущается как ${w.feelsLikeC >= 0 ? '+' : ''}${Math.round(w.feelsLikeC)}°C` : ''}
              </div>
              {error && (
                <div className="text-xs mt-2 text-red-600 dark:text-red-400">Ошибка: {error}</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-full bg-slate-300/40 dark:bg-white/10" />

          {/* Right side — quick stats grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <QuickStat icon={<Sunrise className="w-4 h-4" />} iconColor="text-yellow-500" label="Восход" value="05:42" />
            <QuickStat icon={<Moon className="w-4 h-4" />} iconColor="text-orange-400" label="Закат" value="21:18" />
            <QuickStat icon={<Droplets className="w-4 h-4" />} iconColor="text-blue-400"
                       label="Влажность" value={hasData ? `${w.humidity}%` : '—'} />
            <QuickStat icon={<Gauge className="w-4 h-4" />} iconColor="text-blue-400"
                       label="Давление" value={hasData ? `${Math.round(w.pressureMmHg)} мм рт. ст.` : '—'} />
            <QuickStat icon={<Wind className="w-4 h-4" />} iconColor="text-blue-400"
                       label="Ветер" value={hasData ? `${w.windMs.toFixed(1)} м/с, ${w.windDir}` : '—'} />
            <QuickStat icon={<Eye className="w-4 h-4" />} iconColor="text-blue-400" label="Видимость" value="10 км" />
          </div>
        </div>
      </section>

      {/* ===== HOURLY FORECAST — smooth curve over the next 24 hours ===== */}
      <section className={`${card} rounded-3xl p-6`}>
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white transition-colors duration-200">
          По часам — 24 ч
        </h2>
        {hourlyForecast.length === 0
          ? <div className="text-sm text-slate-500 dark:text-slate-400 py-6">
              {isLoading ? 'Загрузка почасового прогноза…' : 'Нет данных'}
            </div>
          : <HourlyChart hours={hourlyForecast} />}
      </section>

      {/* ===== Official weather alerts from national met service ===== */}
      <OfficialAlertsBanner />

      {/* ===== Air-quality (AQI) — only when API returns data ===== */}
      {currentWeather?.aqi && <AqiBadge aqi={currentWeather.aqi} full />}

      {/* ===== Smart impact widget (wind/humidity/UV/pressure) ===== */}
      {hasData && (
        <WeatherImpactWidget current={w} hourly={hourlyForecast} />
      )}

      {/* ===== TWO COLUMNS — atmosphere + wind ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Атмосфера */}
        <section className={`${card} rounded-3xl p-6`}>
          <h3 className="text-[11px] uppercase tracking-widest font-semibold mb-5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Атмосфера
          </h3>

          {/* Давление */}
          <div className="mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">Давление</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                {w?.pressureMmHg != null ? `${Math.round(w.pressureMmHg)} мм рт. ст.` : '—'}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/40 overflow-hidden transition-colors duration-200">
              <div
                className={
                  'absolute inset-y-0 left-0 rounded-full ' +
                  (pressureBand === 'low' ? 'bg-[#3B82F6]' : pressureBand === 'high' ? 'bg-[#F97316]' : 'bg-[#22C55E]')
                }
                style={{ width: `${pressurePct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider mt-1.5 text-slate-400 dark:text-slate-500 transition-colors duration-200">
              <span className={pressureBand === 'low' ? 'text-blue-500 dark:text-blue-300 font-semibold' : ''}>Низкое</span>
              <span className={pressureBand === 'normal' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>Норма</span>
              <span className={pressureBand === 'high' ? 'text-orange-500 dark:text-orange-400 font-semibold' : ''}>Высокое</span>
            </div>
          </div>

          {/* Влажность */}
          <div className="mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">Влажность</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                {w?.humidity != null ? `${w.humidity}%` : '—'}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/40 overflow-hidden transition-colors duration-200">
              <div className="absolute inset-y-0 left-0 bg-[#3B82F6] rounded-full" style={{ width: `${w?.humidity ?? 0}%` }} />
            </div>
          </div>

          {/* Точка росы */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">Точка росы</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
              {dewPointC != null ? `${dewPointC >= 0 ? '+' : ''}${dewPointC}°C` : '—'}
            </span>
          </div>
        </section>

        {/* Ветер и осадки */}
        <section className={`${card} rounded-3xl p-6`}>
          <h3 className="text-[11px] uppercase tracking-widest font-semibold mb-5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Ветер и осадки
          </h3>

          {/* Wind direction + speed */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-500/15 transition-colors duration-200">
                <Navigation className="w-5 h-5 text-blue-500 dark:text-blue-300 -rotate-45" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white transition-colors duration-200">Скорость ветра</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
                  {w?.windDir ? `Направление: ${w.windDir}` : '—'}
                </div>
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
              {w?.windMs != null ? `${w.windMs.toFixed(1)} м/с` : '—'}
            </div>
          </div>

          {/* Порывы */}
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">
              {isToday ? 'Порывы' : 'Макс. ветер за день'}
            </span>
            <span className="text-sm font-semibold text-orange-500 dark:text-orange-400 transition-colors duration-200">
              {currentWeather?.windGustMs != null && isToday
                ? `до ${currentWeather.windGustMs.toFixed(1)} м/с`
                : (selectedDay?.maxWindMs != null
                    ? `до ${selectedDay.maxWindMs.toFixed(1)} м/с`
                    : '—')}
            </span>
          </div>

          {/* Вероятность осадков */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">Вероятность осадков</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                {selectedDay?.precipChance != null ? `${selectedDay.precipChance}%` : '—'}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/40 overflow-hidden transition-colors duration-200">
              <div className="absolute inset-y-0 left-0 bg-[#3B82F6] rounded-full"
                   style={{ width: `${selectedDay?.precipChance ?? 0}%` }} />
            </div>
            {selectedDay?.totalPrecipMm != null && (
              <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">
                Сумма осадков за день: {selectedDay.totalPrecipMm.toFixed(1)} мм
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===== WATER LEVEL — nearest hydropost to active city ===== */}
      <WaterLevelSection
        card={card}
        nearest={nearestHydro}
        live={hydroLive}
        hourly={hourlyForecast}
      />

      {/* ===== RECOMMENDATIONS ===== */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white transition-colors duration-200">
          Рекомендации на сегодня
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <RecCard
            category="ОДЕЖДА"
            title={dayTip.clothing}
            icon={<Shirt className="w-5 h-5 text-orange-500 dark:text-orange-400" strokeWidth={2} />}
            iconBg="bg-orange-100 dark:bg-orange-500/15"
            card={card}
          />
          <RecCard
            category="ЗОНТ"
            title={dayTip.umbrella}
            icon={<Umbrella className="w-5 h-5 text-slate-500 dark:text-slate-300" strokeWidth={2} />}
            iconBg="bg-slate-100 dark:bg-slate-500/15"
            card={card}
          />
          <RecCard
            category="РЕКА"
            title={
              hydroLive.data?.level != null
                ? `${Math.round(hydroLive.data.level)} см${hydroLive.data.status === 'critical' ? ' — критический' : hydroLive.data.status === 'warning' ? ' — повышенный' : ''}`
                : (hydroLive.loading ? 'Загрузка…' : 'Нет данных')
            }
            icon={<Waves className="w-5 h-5 text-cyan-500 dark:text-cyan-400" strokeWidth={2} />}
            iconBg="bg-cyan-100 dark:bg-cyan-500/15"
            card={card}
          />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <p className="text-center text-xs pt-4 pb-2 text-slate-400 dark:text-slate-500 transition-colors duration-200">
        Данные обновлены в 12:00. Источник: OpenWeatherMap, ЦГМС
      </p>
    </div>
  )
}

function WaterLevelSection({ card, nearest, live, hourly = [] }) {
  // 48h flood forecast — uses today's measured level + 48h precipitation
  const prediction = live?.data?.level != null
    ? predictFloodLevel(live.data, hourly)
    : null

  // Historical seasonal context — average for THIS month at this river
  const seasonal = live?.data?.level != null && nearest?.station?.river
    ? compareToNorm(nearest.station.river, live.data.level)
    : null

  if (!nearest?.station) {
    return (
      <section className={`${card} rounded-3xl p-6`}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Уровень воды</h3>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Не удалось найти ближайший гидропост для выбранного города.
        </div>
      </section>
    )
  }

  const st  = nearest.station
  const d   = live?.data
  const lvl = d?.level
  const warning = d?.warning ?? 400
  const danger  = d?.danger ?? 500
  const maxScale = Math.max(danger * 1.1, 500)
  const pct = lvl != null ? Math.min(100, Math.max(0, (lvl / maxScale) * 100)) : 0
  const warningPct = (warning / maxScale) * 100
  const dangerPct  = (danger  / maxScale) * 100

  const status = d?.status ?? 'normal'
  const trendColor = d?.delta == null ? 'text-slate-400'
    : d.delta > 0 ? 'text-orange-500 dark:text-orange-400'
    : d.delta < 0 ? 'text-blue-500 dark:text-blue-300'
    : 'text-slate-400'

  return (
    <section className={`${card} rounded-3xl p-6 sm:p-7`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            Уровень воды — река {st.river || '—'}
          </h3>
          <div className="text-xs mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Ближайший гидропост: <span className="font-medium text-slate-700 dark:text-slate-200">{st.name}</span>
            <span className="opacity-70"> · {nearest.distanceKm.toFixed(0)} км от города</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {live?.loading && (
            <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> загрузка…
            </div>
          )}
          {d?.noData && (
            <div className="text-sm text-slate-500 dark:text-slate-400">Нет оперативных данных</div>
          )}
          {d && !d.noData && lvl != null && (
            <>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(lvl)} см</div>
              {d.delta != null && (
                <div className={`text-xs font-medium mt-1 ${trendColor}`}>
                  {d.delta > 0 && `▲ +${d.delta} см/сут.`}
                  {d.delta < 0 && `▼ ${d.delta} см/сут.`}
                  {d.delta === 0 && '— без изменений'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Gradient bar — 3 zones derived from actual thresholds */}
      <div
        className="relative h-2.5 rounded-full overflow-visible mb-3"
        style={{
          background: `linear-gradient(to right,
            #22C55E 0%, #22C55E ${warningPct}%,
            #F59E0B ${warningPct}%, #F59E0B ${dangerPct}%,
            #EF4444 ${dangerPct}%, #EF4444 100%)`,
        }}
      >
        {lvl != null && (
          <div
            className={
              'absolute -top-1.5 w-5 h-5 rounded-full border-[3px] bg-white shadow-md ' +
              (status === 'critical' ? 'border-[#EF4444]'
                : status === 'warning' ? 'border-[#F59E0B]' : 'border-[#22C55E]')
            }
            style={{ left: `calc(${pct}% - 10px)` }}
          />
        )}
      </div>

      <div className="flex justify-between text-[11px]">
        <div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">Норма</div>
          <div className="text-slate-400 dark:text-slate-500">0 — {Math.round(warning)} см</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-orange-500 dark:text-orange-400">Внимание</div>
          <div className="text-slate-400 dark:text-slate-500">{Math.round(warning)} — {Math.round(danger)} см</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-red-500 dark:text-red-400">Критический</div>
          <div className="text-slate-400 dark:text-slate-500">≥ {Math.round(danger)} см</div>
        </div>
      </div>

      {/* Historical seasonal context */}
      {seasonal && (
        <div className="mt-4 rounded-2xl px-4 py-3 text-xs
                        bg-slate-50 dark:bg-white/[0.03]
                        border border-slate-200/70 dark:border-white/[0.04]
                        text-slate-700 dark:text-slate-300">
          <span className="font-semibold">Сезонный контекст:</span>
          {' '}среднее для {seasonal.norm.monthLabel} — <b>{seasonal.norm.avg} см</b>.
          {' '}Сейчас{' '}
          <span className={
            seasonal.verdict === 'much-higher' ? 'text-red-600 dark:text-red-400 font-semibold'
            : seasonal.verdict === 'higher'    ? 'text-orange-600 dark:text-orange-400 font-semibold'
            : seasonal.verdict === 'much-lower' ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : seasonal.verdict === 'lower'      ? 'text-blue-500 dark:text-blue-300 font-semibold'
            : 'text-emerald-600 dark:text-emerald-400 font-semibold'
          }>
            {seasonal.pct > 0 ? '+' : ''}{seasonal.pct}%
          </span>
          {' '}({seasonal.delta > 0 ? '+' : ''}{seasonal.delta} см к норме).
        </div>
      )}

      {/* 48-hour flood forecast */}
      {prediction && (
        <div className={
          'mt-5 rounded-2xl p-4 border transition-colors duration-200 '
          + (prediction.verdict === 'critical' ? 'bg-red-50 dark:bg-red-500/10 border-red-200/70 dark:border-red-500/30'
             : prediction.verdict === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/30'
             : prediction.verdict === 'watch'   ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200/70 dark:border-yellow-500/30'
             : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/30')
        }>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                Прогноз на 48 часов
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {prediction.predictedLevel} см
                <span className={
                  'ml-2 text-sm font-semibold '
                  + (prediction.predictedDelta > 0
                       ? 'text-orange-600 dark:text-orange-400'
                       : prediction.predictedDelta < 0
                         ? 'text-blue-600 dark:text-blue-300'
                         : 'text-slate-500')
                }>
                  {prediction.predictedDelta > 0 && `▲ +${prediction.predictedDelta}`}
                  {prediction.predictedDelta < 0 && `▼ ${prediction.predictedDelta}`}
                  {prediction.predictedDelta === 0 && '— без изменений'}
                  {prediction.predictedDelta !== 0 && ' см'}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Осадки за 48 ч: <b>{prediction.rainTotalMm} мм</b>
                {prediction.warmingDeltaCm > 0 && <> · снеготаяние ~+{prediction.warmingDeltaCm} см</>}
                {' · '}вероятность подтопления: <b>{prediction.floodProbability}%</b>
              </div>
            </div>
          </div>
          {prediction.willCrossDanger && (
            <div className="text-xs font-semibold text-red-700 dark:text-red-300 mt-1 flex items-start gap-1.5">
              <span>⚠️</span>
              <span>Уровень может пересечь критическую отметку. Следите за обстановкой и не приближайтесь к набережным.</span>
            </div>
          )}
          {!prediction.willCrossDanger && prediction.willCrossWarning && (
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1 flex items-start gap-1.5">
              <span>⚡</span>
              <span>Возможен выход на отметку «внимание» — проверяйте обновления чаще.</span>
            </div>
          )}
        </div>
      )}

      {live?.error && (
        <div className="mt-4 rounded-2xl px-4 py-3 text-xs
                        bg-red-50 dark:bg-red-500/10
                        border border-red-200/70 dark:border-red-500/20
                        text-red-700 dark:text-red-300">
          Ошибка загрузки: {live.error}
        </div>
      )}
    </section>
  )
}

function QuickStat({ icon, iconColor, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200
                      bg-white/70 dark:bg-white/10 ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
          {label}
        </div>
        <div className="text-sm font-semibold mt-0.5 text-slate-900 dark:text-white transition-colors duration-200">
          {value}
        </div>
      </div>
    </div>
  )
}

function RecCard({ category, title, icon, iconBg, card }) {
  return (
    <div className={`${card} rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 transition-colors duration-200">
          {category}
        </div>
        <div className="text-sm font-medium mt-0.5 text-slate-900 dark:text-white transition-colors duration-200">
          {title}
        </div>
      </div>
    </div>
  )
}
