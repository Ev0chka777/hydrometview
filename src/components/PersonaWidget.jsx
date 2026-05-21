import { useEffect, useState, useMemo } from 'react'
import {
  Fish, Sprout, Mountain, Waves,
  Sunrise, Moon, Gauge, Wind, Snowflake, CloudRain, Sun, AlertTriangle, TrendingUp, TrendingDown,
} from 'lucide-react'
import clsx from 'clsx'
import { useWeather } from '../context/WeatherContext'
import { useSettings } from '../settings/SettingsContext'
import { russiaCities } from '../data/russiaCities'
import { findNearestHydropost } from '../utils/nearestHydropost'
import { fetchHydroDataFromPage } from '../services/hydroService'
import { moonPhase, pressureTrend, fishingRating } from '../utils/astro'
import { predictFloodLevel } from '../utils/floodPrediction'
import Skeleton from './Skeleton'

const PERSONA_META = {
  fisher:  { Icon: Fish,     label: 'Рыбак',                color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-500/15' },
  dacha:   { Icon: Sprout,   label: 'Дачник',               color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  tourist: { Icon: Mountain, label: 'Турист',               color: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-500/15' },
  flood:   { Icon: Waves,    label: 'Житель паводка',       color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-500/15' },
}

export default function PersonaWidget({ className = '' }) {
  const { settings } = useSettings()
  const { currentWeather, hourlyForecast, forecastDays } = useWeather()
  const persona = settings.persona ?? 'general'
  if (persona === 'general') return null
  const meta = PERSONA_META[persona]
  if (!meta) return null

  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  return (
    <section className={`${card} rounded-3xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', meta.bg)}>
          <meta.Icon className={clsx('w-5 h-5', meta.color)} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
            Режим
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white">{meta.label}</div>
        </div>
      </div>

      {persona === 'fisher'  && <FisherPanel  weather={currentWeather} hourly={hourlyForecast} />}
      {persona === 'dacha'   && <DachaPanel   weather={currentWeather} days={forecastDays} />}
      {persona === 'tourist' && <TouristPanel weather={currentWeather} days={forecastDays} />}
      {persona === 'flood'   && <FloodPanel   weather={currentWeather} hourly={hourlyForecast} />}
    </section>
  )
}

// ─── Рыбак ──────────────────────────────────────────────────────────────────
function FisherPanel({ weather, hourly }) {
  const moon = useMemo(() => moonPhase(new Date()), [])
  const press = useMemo(() => pressureTrend(hourly), [hourly])
  const rating = useMemo(() => fishingRating({
    current: weather,
    pressureTrendDir: press.direction,
    moonPhase: moon.phase,
  }), [weather, press, moon])

  if (!weather) return <LoadingHint />

  return (
    <div className="space-y-3">
      {/* Big rating */}
      <div className={clsx(
        'rounded-2xl p-3 flex items-center gap-3 border',
        rating.score >= 75 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20'
        : rating.score >= 55 ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20'
        : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20'
      )}>
        <div className="text-3xl font-bold text-slate-900 dark:text-white shrink-0">{rating.score}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Клёв: {rating.label}
          </div>
          {rating.reason && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {rating.reason}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<Gauge className="w-3.5 h-3.5 text-blue-500" />}
              label="Давление" value={press.label} />
        <Tile icon={<span className="text-base leading-none">{moon.emoji}</span>}
              label="Луна" value={moon.label} />
        <Tile icon={<Wind className="w-3.5 h-3.5 text-blue-500" />}
              label="Ветер на воде"
              value={weather.windMs != null ? `${weather.windMs.toFixed(1)} м/с, ${weather.windDir}` : '—'} />
        <Tile icon={<Sunrise className="w-3.5 h-3.5 text-amber-500" />}
              label="Рассвет/закат" value="по локации" />
      </div>
    </div>
  )
}

// ─── Дачник ─────────────────────────────────────────────────────────────────
function DachaPanel({ weather, days }) {
  if (!weather) return <LoadingHint />

  const nextNights = (days ?? []).slice(0, 3).map(d => ({ date: d.date, minT: d.minTempC }))
  const frostNights = nextNights.filter(n => n.minT != null && n.minT <= 0)
  const weekRain = (days ?? []).slice(0, 7).reduce((acc, d) => acc + (d.totalPrecipMm ?? 0), 0)

  return (
    <div className="space-y-3">
      <Tile icon={<Snowflake className={frostNights.length ? 'w-4 h-4 text-blue-500' : 'w-4 h-4 text-slate-400'} />}
            label="Заморозки в 3 ночи"
            value={frostNights.length
              ? `${frostNights.length}/3 ночи ниже 0°C — укройте рассаду`
              : 'Не ожидаются'}
            big />
      <Tile icon={<CloudRain className="w-4 h-4 text-blue-500" />}
            label="Осадки за неделю"
            value={`${weekRain.toFixed(1)} мм` + (weekRain >= 15 ? ' — поливать не нужно' : weekRain < 3 ? ' — нужен полив' : '')}
            big />
      <Tile icon={<Sprout className="w-4 h-4 text-emerald-500" />}
            label="Среднесуточная сейчас"
            value={weather.tempC != null
              ? `${weather.tempC >= 0 ? '+' : ''}${Math.round(weather.tempC)}°C`
                + (weather.tempC >= 10 ? ' — сезон рассады' : weather.tempC >= 5 ? ' — почва прогревается' : ' — слишком холодно для посадки')
              : '—'}
            big />
    </div>
  )
}

// ─── Турист ─────────────────────────────────────────────────────────────────
function TouristPanel({ weather, days }) {
  if (!weather) return <LoadingHint />

  // Pick "best" day in the next 7: maximize (avgTemp + 10) - rainChance*0.3 - precipMm
  const best = (days ?? []).slice(0, 7).reduce((acc, d, i) => {
    const score = (d.avgTempC ?? 0) - (d.precipChance ?? 0) * 0.3 - (d.totalPrecipMm ?? 0) * 0.5
    if (!acc || score > acc.score) return { score, day: d, idx: i }
    return acc
  }, null)

  const uvWarning = (weather.uv ?? 0) >= 6
  const dryDays = (days ?? []).slice(0, 7).filter(d => (d.precipChance ?? 0) < 30).length

  return (
    <div className="space-y-3">
      {best && (
        <div className="rounded-2xl p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20">
          <div className="text-[10px] uppercase tracking-widest font-bold text-orange-700 dark:text-orange-300 mb-1">
            Лучший день для выезда
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {best.idx === 0 ? 'Сегодня' : best.idx === 1 ? 'Завтра' : formatDateLabel(best.day.date)}
            {best.day.avgTempC != null && <>, средняя {best.day.avgTempC >= 0 ? '+' : ''}{Math.round(best.day.avgTempC)}°C</>}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {best.day.conditionText ?? ''} · осадки {best.day.precipChance ?? 0}%
          </div>
        </div>
      )}
      <Tile icon={<Sun className={uvWarning ? 'w-4 h-4 text-orange-500' : 'w-4 h-4 text-amber-500'} />}
            label="УФ-индекс"
            value={(weather.uv ?? 0).toFixed?.(1) ?? weather.uv ?? '—'}
            hint={uvWarning ? 'Высокий — нужен SPF и шляпа' : 'Безопасный'}
            big />
      <Tile icon={<CloudRain className="w-4 h-4 text-blue-500" />}
            label="Сухих дней впереди"
            value={`${dryDays} из 7`}
            big />
    </div>
  )
}

// ─── Житель паводкоопасного района ──────────────────────────────────────────
function FloodPanel({ weather, hourly }) {
  const { activeCity } = useWeather()
  const [hydro, setHydro] = useState(null)
  const [station, setStation] = useState(null)

  useEffect(() => {
    if (!activeCity) return
    const match = russiaCities.find(c => c.nameRu === activeCity)
    if (!match) return
    const nearest = findNearestHydropost(match.lat, match.lng)
    if (!nearest?.station) return
    setStation(nearest)
    fetchHydroDataFromPage(nearest.station.urlPath)
      .then(setHydro)
      .catch(() => setHydro(null))
  }, [activeCity])

  if (!weather || !station) return <LoadingHint />

  const prediction = hydro ? predictFloodLevel(hydro, hourly ?? []) : null

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20">
        <div className="text-[10px] uppercase tracking-widest font-bold text-blue-700 dark:text-blue-300 mb-1">
          Ближайший пост
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {station.station.name}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          Река {station.station.river} · {Math.round(station.distanceKm)} км от города
        </div>
      </div>

      {hydro?.level != null && (
        <Tile icon={<Waves className="w-4 h-4 text-blue-500" />}
              label="Уровень сейчас"
              value={`${Math.round(hydro.level)} см`}
              hint={hydro.status === 'critical' ? 'ОПАСНЫЙ' : hydro.status === 'warning' ? 'Повышенный' : 'Норма'}
              big />
      )}

      {prediction && (
        <div className={clsx(
          'rounded-2xl p-3 border',
          prediction.verdict === 'critical' ? 'bg-red-50 dark:bg-red-500/10 border-red-200/60 dark:border-red-500/30'
          : prediction.verdict === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/30'
          : prediction.verdict === 'watch'   ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-500/30'
          : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/30'
        )}>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1">
            Прогноз через 48 ч
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {prediction.predictedLevel} см
            </span>
            <span className={clsx(
              'text-xs font-bold inline-flex items-center gap-0.5',
              prediction.predictedDelta > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {prediction.predictedDelta > 0
                ? <><TrendingUp className="w-3 h-3" />+{prediction.predictedDelta} см</>
                : <><TrendingDown className="w-3 h-3" />{prediction.predictedDelta} см</>}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Осадки за 48ч: {prediction.rainTotalMm} мм. Вероятность подтопления: {prediction.floodProbability}%
          </div>
          {prediction.willCrossDanger && (
            <div className="mt-2 inline-flex items-start gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5" strokeWidth={2.4} />
              Уровень может пересечь критическую отметку — следите за обстановкой!
            </div>
          )}
          {!prediction.willCrossDanger && prediction.willCrossWarning && (
            <div className="mt-2 inline-flex items-start gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5" strokeWidth={2.4} />
              Возможен выход на отметку «внимание»
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function Tile({ icon, label, value, hint, big = false }) {
  return (
    <div className={clsx(
      'flex items-center gap-2.5 rounded-xl border transition-colors',
      'bg-slate-50/60 dark:bg-white/[0.03]',
      'border-slate-200/70 dark:border-white/[0.04]',
      big ? 'p-3' : 'p-2.5',
    )}>
      <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-white/[0.05]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</div>
        {hint && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  )
}

function LoadingHint() {
  // Mirrors the typical 3-tile layout the panels render so the section
  // doesn't pop in height when real data arrives.
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-2.5">
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-10 rounded-xl" />
      <Skeleton className="h-10 rounded-xl" />
    </div>
  )
}

const RU_MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`
}
