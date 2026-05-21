import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Waves, MapPin, ChevronLeft, RefreshCw, Star, AlertTriangle, TrendingUp, TrendingDown, Activity, Wind, Droplets, CloudRain, Gauge,
} from 'lucide-react'
import clsx from 'clsx'
import allHydroStations from '../data/all_stations.json'
import { fetchHydroDataFromPage } from '../services/hydroService'
import { fetchCityWeather } from '../services/weatherService'
import { predictFloodLevel } from '../utils/floodPrediction'
import { useFavorites } from '../favorites/FavoritesContext'
import Skeleton from '../components/Skeleton'

const STATUS_META = {
  normal:   { text: 'Уровень в норме', tone: 'emerald', color: '#10b981' },
  warning:  { text: 'Вода поднимается', tone: 'amber',  color: '#f59e0b' },
  critical: { text: 'Критический уровень', tone: 'red', color: '#ef4444' },
}

const VERDICT_META = {
  normal:   { label: 'Прогноз спокойный', tone: 'emerald' },
  watch:    { label: 'Стоит понаблюдать',  tone: 'yellow'  },
  warning:  { label: 'Возможен выход за норму', tone: 'amber' },
  critical: { label: 'Критический сценарий',    tone: 'red'   },
}

const toneClasses = {
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  amber:   'bg-amber-50 dark:bg-amber-500/10   border-amber-200/60 dark:border-amber-500/30   text-amber-700 dark:text-amber-300',
  yellow:  'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  red:     'bg-red-50 dark:bg-red-500/10       border-red-200/60 dark:border-red-500/30       text-red-700 dark:text-red-300',
}

const card =
  'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
  'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

/**
 * Deep-linkable detail page for a single hydropost.
 * Route: /post/:id  →  finds the station in all_stations.json, fetches the
 *        current modelled level + 48h hourly weather for its coordinates,
 *        and renders the full diagnostic surface (current level, levels-vs-
 *        thresholds bar, 48h flood projection, ASCII sparkline of the hourly
 *        precipitation, link to map / favourite toggle).
 *
 * If the id doesn't match anything, redirects to /stations.
 */
export default function HydropostDetailPage() {
  const { id } = useParams()
  const station = useMemo(() => allHydroStations.find(s => s.id === id), [id])

  const [hydro,   setHydro]   = useState(null)
  const [hourly,  setHourly]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const { isFavoritePost, togglePost } = useFavorites()

  useEffect(() => {
    if (!station) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchHydroDataFromPage(station.urlPath),
      fetchCityWeather(`${station.lat},${station.lng}`).catch(() => null),
    ]).then(([h, w]) => {
      if (cancelled) return
      setHydro(h)
      setHourly(w?.hourly ?? [])
      setLoading(false)
    }).catch(err => {
      if (cancelled) return
      setError(err?.message || 'Не удалось загрузить данные')
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [station, refreshTick])

  if (!station) return <Navigate to="/stations" replace />

  const fav = isFavoritePost(station.id)

  return (
    <div className="max-w-5xl mx-auto pt-2 space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-start gap-3">
        <Link
          to="/stations"
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl
                     bg-white dark:bg-[#131E36]/80 border border-slate-200 dark:border-white/[0.06]
                     hover:bg-slate-50 dark:hover:bg-[#1A2746] transition-colors"
          aria-label="Назад к списку станций"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-blue-500 dark:text-blue-300 mb-1">
            Гидропост
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
            {station.name}
          </h1>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Река {station.river} · {station.lat.toFixed(3)}°, {station.lng.toFixed(3)}°
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => togglePost(station.id)}
            aria-label={fav ? 'Убрать из избранного' : 'Добавить в избранное'}
            className={clsx(
              'inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
              fav
                ? 'bg-yellow-100 dark:bg-yellow-400/20 text-yellow-500'
                : 'bg-white dark:bg-[#131E36]/80 border border-slate-200 dark:border-white/[0.06] text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A2746]'
            )}
          >
            <Star className="w-5 h-5" fill={fav ? 'currentColor' : 'transparent'} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            aria-label="Обновить данные"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl
                       bg-white dark:bg-[#131E36]/80 border border-slate-200 dark:border-white/[0.06]
                       hover:bg-slate-50 dark:hover:bg-[#1A2746] transition-colors text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className={clsx('rounded-2xl border px-4 py-3 text-sm flex items-start gap-2', toneClasses.red)}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* ── Main: current level + 48h forecast ────────────────────── */}
        <div className="space-y-4">
          {loading
            ? <Skeleton className="h-44 rounded-3xl" />
            : <CurrentLevelCard station={station} data={hydro} />}

          {loading
            ? <Skeleton className="h-56 rounded-3xl" />
            : <ForecastCard hydro={hydro} hourly={hourly} />}

          {loading
            ? <Skeleton className="h-40 rounded-3xl" />
            : <PrecipSparklineCard hourly={hourly} />}
        </div>

        {/* ── Side: station meta + quick links ───────────────────────── */}
        <aside className="space-y-4">
          <section className={`${card} rounded-3xl p-5`}>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">
              О посте
            </div>
            <dl className="space-y-2 text-sm">
              <Pair label="ID" value={<code className="text-xs">{station.id}</code>} />
              <Pair label="Река"   value={station.river} />
              <Pair label="Регион" value={station.region ?? '—'} />
              <Pair label="Координаты" value={`${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`} />
              {hydro?.warning != null && <Pair label="Пойма (см)"   value={hydro.warning} />}
              {hydro?.danger != null  && <Pair label="Опасный (см)" value={hydro.danger} />}
            </dl>
          </section>

          <section className={`${card} rounded-3xl p-5`}>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">
              Перейти
            </div>
            <div className="space-y-2">
              <Link
                to="/map"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                           bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08]
                           text-slate-700 dark:text-slate-200 transition-colors"
              >
                <MapPin className="w-4 h-4 text-slate-500" strokeWidth={2.2} />
                Открыть на карте
              </Link>
              <Link
                to="/charts"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                           bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08]
                           text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Activity className="w-4 h-4 text-slate-500" strokeWidth={2.2} />
                Графики и тренды
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
function Pair({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 dark:text-white text-right truncate">{value}</dd>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
function CurrentLevelCard({ station, data }) {
  const status = data?.status ?? 'normal'
  const meta = STATUS_META[status] ?? STATUS_META.normal

  if (!data || data.noData || data.level == null) {
    return (
      <section className={`${card} rounded-3xl p-5`}>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Оперативные данные по этому посту сегодня недоступны. Попробуйте обновить позже.
        </div>
      </section>
    )
  }

  // Visual "level vs warning vs danger" bar
  const warning = data.warning ?? null
  const danger  = data.danger  ?? null
  const max = Math.max(data.level, warning ?? 0, danger ?? 0) * 1.1 || 100
  const pct = v => v == null ? null : (v / max) * 100

  return (
    <section className={`${card} rounded-3xl p-5`}>
      <div className="flex items-baseline gap-3 mb-1">
        <div className="text-4xl font-bold text-slate-900 dark:text-white">
          {Math.round(data.level)} <span className="text-base font-medium text-slate-500">см</span>
        </div>
        {data.delta != null && data.delta !== 0 && (
          <span className={clsx(
            'inline-flex items-center gap-0.5 text-sm font-semibold',
            data.delta > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
          )}>
            {data.delta > 0
              ? <><TrendingUp className="w-3.5 h-3.5" />+{data.delta} см/сут</>
              : <><TrendingDown className="w-3.5 h-3.5" />{data.delta} см/сут</>}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        над нулём поста
      </div>

      <div className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4', toneClasses[meta.tone])}>
        <Waves className="w-3.5 h-3.5" strokeWidth={2.4} />
        {meta.text}
      </div>

      {/* Stage vs thresholds bar — visual answer to "how close are we?" */}
      {(warning != null || danger != null) && (
        <div className="mt-2">
          <div className="relative h-3 rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, pct(data.level))}%`, background: meta.color }}
            />
            {warning != null && (
              <span
                title={`Пойма: ${warning} см`}
                className="absolute top-0 bottom-0 w-px bg-amber-500"
                style={{ left: `${pct(warning)}%` }}
              />
            )}
            {danger != null && (
              <span
                title={`Опасный: ${danger} см`}
                className="absolute top-0 bottom-0 w-px bg-red-500"
                style={{ left: `${pct(danger)}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>0</span>
            {warning != null && <span>{warning} см (пойма)</span>}
            {danger  != null && <span>{danger} см (опасн.)</span>}
          </div>
        </div>
      )}

      {data.simulated && (
        <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          Расчёт уровня основан на типичных значениях этого поста
          и&nbsp;<b>актуальной погоде</b> в&nbsp;координатах гидропоста.
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
function ForecastCard({ hydro, hourly }) {
  const prediction = hydro ? predictFloodLevel(hydro, hourly) : null
  if (!prediction) {
    return (
      <section className={`${card} rounded-3xl p-5`}>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Нет данных для прогноза на 48 часов.
        </div>
      </section>
    )
  }

  const meta = VERDICT_META[prediction.verdict]

  return (
    <section className={`${card} rounded-3xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
            Прогноз через 48 часов
          </div>
          <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded-full text-[11px] font-semibold', toneClasses[meta.tone])}>
            {meta.label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {prediction.predictedLevel} <span className="text-sm font-medium text-slate-500">см</span>
          </div>
          <div className={clsx(
            'text-xs font-semibold',
            prediction.predictedDelta > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
          )}>
            {prediction.predictedDelta > 0 ? `+${prediction.predictedDelta}` : prediction.predictedDelta} см
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
        <Stat icon={<CloudRain className="w-4 h-4 text-blue-500" />}
              label="Осадки 48ч" value={`${prediction.rainTotalMm} мм`} />
        <Stat icon={<Activity className="w-4 h-4 text-purple-500" />}
              label="Вероятность" value={`${prediction.floodProbability}%`} />
        <Stat icon={<Waves className="w-4 h-4 text-cyan-500" />}
              label="Снеготаяние" value={`${prediction.warmingDeltaCm} см`} />
      </div>

      {prediction.willCrossDanger && (
        <div className={clsx('mt-4 rounded-2xl border px-4 py-3 text-sm flex items-start gap-2', toneClasses.red)}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>Уровень может пересечь критическую отметку — следите за обстановкой и подпишитесь на уведомления.</span>
        </div>
      )}
      {!prediction.willCrossDanger && prediction.willCrossWarning && (
        <div className={clsx('mt-4 rounded-2xl border px-4 py-3 text-sm flex items-start gap-2', toneClasses.amber)}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>Возможен выход на отметку «внимание». Уберите вещи из подтопляемой зоны.</span>
        </div>
      )}
    </section>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.04]">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">{label}</div>
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Compact precipitation sparkline for the next 48 hours. Pure SVG, no
 * recharts dependency — keeps this page's bundle small.
 */
function PrecipSparklineCard({ hourly }) {
  const slice = (hourly ?? []).slice(0, 48)
  if (slice.length === 0) {
    return (
      <section className={`${card} rounded-3xl p-5`}>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Нет почасового прогноза для построения графика.
        </div>
      </section>
    )
  }

  const maxMm = Math.max(0.5, ...slice.map(h => h.precipMm ?? 0))
  const minT  = Math.min(...slice.map(h => h.tempC ?? 0))
  const maxT  = Math.max(...slice.map(h => h.tempC ?? 0))
  const tSpan = Math.max(1, maxT - minT)

  const W = 100  // viewBox units → bars scale to container
  const H = 60
  const barW = W / slice.length

  return (
    <section className={`${card} rounded-3xl p-5`}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
            Осадки + температура · 48 ч
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
            Пиковые осадки: {maxMm.toFixed(1)} мм/ч
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
          {Math.round(minT)}° … {Math.round(maxT)}°
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-32"
        role="img"
        aria-label="Сравнение осадков и температуры на ближайшие 48 часов"
      >
        {/* Rain bars */}
        {slice.map((h, i) => {
          const mm = h.precipMm ?? 0
          const barH = (mm / maxMm) * (H * 0.7)
          return (
            <rect
              key={i}
              x={i * barW + 0.15}
              y={H - barH}
              width={Math.max(0, barW - 0.3)}
              height={barH}
              fill="#3b82f6"
              opacity={mm > 0 ? 0.75 : 0.15}
            />
          )
        })}
        {/* Temperature line */}
        <polyline
          fill="none"
          stroke="#f97316"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          points={slice.map((h, i) => {
            const x = i * barW + barW / 2
            const y = H - ((h.tempC - minT) / tSpan) * (H * 0.6) - 5
            return `${x},${y}`
          }).join(' ')}
        />
      </svg>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500" /> мм осадков
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-0.5 bg-orange-500" /> температура
        </span>
      </div>
    </section>
  )
}
