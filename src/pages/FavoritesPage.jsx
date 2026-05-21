import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  Star, MapPin, Heart, AlertTriangle, Droplets, ChevronRight,
  Building2, Waves, ArrowRight, LineChart as LineChartIcon
} from 'lucide-react'
import { useFavorites } from '../favorites/FavoritesContext'
import { hydroposts, getHydropost, hydropostStatus } from '../data/hydroposts'
import { cities, getCity } from '../data/cities'
import { fetchManyCurrent } from '../services/weatherService'

// ---- small inline weather icons (city cards) ----
function CityWeatherIcon({ kind, className = 'w-10 h-10' }) {
  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="16" cy="16" r="6" fill="#FCD34D" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
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
        <circle cx="11" cy="11" r="5" fill="#FCD34D" />
        {[0, 60, 120, 180, 240, 300].map(d => (
          <line key={d}
            x1={11 + Math.cos(d * Math.PI / 180) * 7}
            y1={11 + Math.sin(d * Math.PI / 180) * 7}
            x2={11 + Math.cos(d * Math.PI / 180) * 9.5}
            y2={11 + Math.sin(d * Math.PI / 180) * 9.5}
            stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        <path d="M9 22 Q9 18 13 18 Q14 14 18 14 Q23 14 23 19 Q27 19 27 22 Q27 25 23 25 H12 Q7 25 7 22 Q7 22 9 22Z" fill="#CBD5E1" />
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
  return null
}

export default function FavoritesPage() {
  const { favorites } = useFavorites()
  // Hydrate each favourite key. Entries that match cities.js (e.g. 'spb',
  // 'msk') come back with full static data. Free-form names that were
  // starred from the map (e.g. "Сосновый Бор", "Гатчина") aren't in
  // cities.js — for those we synthesize a minimal entry so the card still
  // renders. All weather fields come from the API later anyway.
  const favCities = favorites.cities
    .map(key => getCity(key) ?? { id: key, name: key })
    .filter(Boolean)
  const favPosts = favorites.posts.map(getHydropost).filter(Boolean)
  const total = favCities.length + favPosts.length

  // Live weather for every favourited city. Refetches when the list changes.
  const [cityLive, setCityLive] = useState({})
  const favCityIds = favCities.map(c => c.id).join(',')
  useEffect(() => {
    if (favCities.length === 0) { setCityLive({}); return }
    let cancelled = false
    fetchManyCurrent(favCities.map(c => c.name)).then(results => {
      if (cancelled) return
      const next = {}
      results.forEach((r, i) => { if (r.current) next[favCities[i].id] = r.current })
      setCityLive(next)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favCityIds])

  return (
    <div className="pt-6 pb-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
            Избранное
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">
            {total > 0
              ? `Городов: ${favCities.length}, гидропостов: ${favPosts.length}`
              : 'Здесь будут города и посты, которые вы отметите звёздочкой'}
          </p>
        </div>
        {total > 0 && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                       bg-white hover:bg-slate-50 text-slate-700 border border-slate-200
                       dark:bg-[#131E36]/80 dark:hover:bg-[#1A2746] dark:text-slate-200 dark:border-white/[0.06]
                       shadow-sm dark:shadow-none"
          >
            <MapPin className="w-4 h-4" /> К карте
          </Link>
        )}
      </header>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-10">
          {favCities.length > 0 && (
            <Section
              icon={<Building2 className="w-4 h-4" />}
              title="Избранные города"
              count={favCities.length}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {favCities.map(city => (
                  <CityCard key={city.id} city={city} live={cityLive[city.id]} />
                ))}
              </div>
            </Section>
          )}

          {favPosts.length > 0 && (
            <Section
              icon={<Waves className="w-4 h-4" />}
              title="Избранные гидропосты"
              count={favPosts.length}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {favPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Section header ============

function Section({ icon, title, count, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200
                        bg-blue-50 text-[#2F80FF]
                        dark:bg-blue-500/15 dark:text-blue-300">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
          {title}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full transition-colors duration-200
                         bg-slate-100 text-slate-500
                         dark:bg-white/[0.06] dark:text-slate-400">
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

// ============ Empty state ============

function EmptyState() {
  return (
    <div className="rounded-3xl py-16 px-6 text-center transition-colors duration-200
                    bg-white dark:bg-[#131E36]/80
                    border border-slate-200/70 dark:border-white/[0.04]
                    shadow-sm dark:shadow-xl dark:shadow-black/20">
      <div className="mx-auto mb-6 w-28 h-28 relative">
        <div className="absolute inset-0 rounded-full bg-blue-50 dark:bg-blue-500/10 transition-colors duration-200" />
        <div className="absolute inset-3 rounded-full bg-blue-100/60 dark:bg-blue-500/15 transition-colors duration-200" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="w-12 h-12 text-[#2F80FF] dark:text-blue-300" strokeWidth={1.8} fill="currentColor" />
        </div>
        <Star
          className="absolute -top-1 -right-1 w-7 h-7 text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.4)]"
          strokeWidth={1.8}
        />
      </div>

      <h2 className="text-xl font-semibold text-slate-900 dark:text-white transition-colors duration-200">
        У вас пока нет избранных мест
      </h2>
      <p className="text-sm mt-2 max-w-md mx-auto text-slate-500 dark:text-slate-400 transition-colors duration-200">
        Нажимайте звёздочку рядом с названием города или в карточке гидропоста на карте —
        отмеченные места появятся здесь для быстрого доступа.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                   bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                   shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40"
      >
        <MapPin className="w-4 h-4" strokeWidth={2.2} />
        Перейти к карте
      </Link>
    </div>
  )
}

// ============ City card ============

function CityCard({ city, live }) {
  const { removeCity } = useFavorites()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState(false)

  function handleUnfavorite() {
    setRemoving(true)
    setTimeout(() => removeCity(city.id), 260)
  }

  // Live data preferred; while loading, fall back to the static mock so the
  // card never renders an empty block. `tempRound` etc. only get computed once.
  const tempC      = live ? Math.round(live.tempC)      : null
  const feelsLikeC = live ? Math.round(live.feelsLikeC) : null
  const conditionText = live?.conditionText ?? '…'
  const conditionIcon = live?.conditionIcon
  const humidity   = live ? live.humidity                   : null
  const windMs     = live ? Number(live.windMs.toFixed(1))  : null
  const windDir    = live?.windDir ?? ''

  return (
    <article
      className={clsx(
        'rounded-3xl p-5 transition-all duration-300 ease-out',
        'bg-white dark:bg-[#131E36]/80',
        'border border-slate-200/70 dark:border-white/[0.04]',
        'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20',
        removing ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
          {city.name}
        </h3>
        <button
          onClick={handleUnfavorite}
          aria-label="Удалить из избранного"
          title="Удалить из избранного"
          className="shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" strokeWidth={2} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {conditionIcon
          ? <img src={conditionIcon} alt={conditionText} className="w-14 h-14 shrink-0" />
          : <CityWeatherIcon kind={city.icon} className="w-14 h-14 shrink-0" />}
        <div>
          <div className="text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-white transition-colors duration-200">
            {tempC == null ? '—' : `${tempC >= 0 ? '+' : ''}${tempC}°C`}
          </div>
          <div className="text-xs mt-1.5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            {conditionText}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mb-5 transition-colors duration-200">
        <span className="inline-flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5 text-blue-500 dark:text-blue-300" fill="currentColor" />
          {humidity ?? '—'}%
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span>{windMs ?? '—'} м/с {windDir}</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span>Ощ. {feelsLikeC == null ? '—' : `${feelsLikeC >= 0 ? '+' : ''}${feelsLikeC}°`}</span>
      </div>

      <button
        onClick={() => navigate('/weather')}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                   bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                   shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
      >
        Посмотреть подробнее
        <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
      </button>
    </article>
  )
}

// ============ Hydropost card ============

function PostCard({ post }) {
  const { removePost } = useFavorites()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState(false)

  function handleUnfavorite() {
    setRemoving(true)
    setTimeout(() => removePost(post.id), 260)
  }

  const status = hydropostStatus(post)
  const aboveNorm = post.waterLevel - post.waterNorm
  const waterPct = Math.min(100, Math.max(0, (post.waterLevel / post.waterCritical) * 100))

  const statusBadge = {
    critical: { label: 'Критический', cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', icon: AlertTriangle, dot: 'bg-red-500' },
    warning:  { label: 'Внимание',    cls: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20', icon: AlertTriangle, dot: 'bg-orange-500' },
    normal:   { label: 'Норма',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', icon: null, dot: 'bg-emerald-500' },
    low:      { label: 'Низкий',      cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20', icon: null, dot: 'bg-blue-500' },
  }[status] || { label: '—', cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: null, dot: 'bg-slate-400' }
  const StatusIcon = statusBadge.icon

  return (
    <article
      className={clsx(
        'rounded-3xl p-5 transition-all duration-300 ease-out',
        'bg-white dark:bg-[#131E36]/80',
        'border border-slate-200/70 dark:border-white/[0.04]',
        'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20',
        removing ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-white transition-colors duration-200">
            {post.river}
          </h3>
          <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            {post.city} · Пост №{post.number}
          </div>
        </div>
        <button
          onClick={handleUnfavorite}
          aria-label="Удалить из избранного"
          title="Удалить из избранного"
          className="shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" strokeWidth={2} />
        </button>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Уровень воды
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
              {post.waterLevel}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-200">см</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Норма {post.waterNorm}{' '}
            {aboveNorm !== 0 && (
              <span className={aboveNorm > 0 ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-blue-500 dark:text-blue-300 font-semibold'}>
                ({aboveNorm > 0 ? '+' : ''}{aboveNorm})
              </span>
            )}
          </div>
        </div>
        <div className={clsx(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors duration-200',
          statusBadge.cls
        )}>
          {StatusIcon
            ? <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
            : <span className={clsx('w-2 h-2 rounded-full', statusBadge.dot)} />}
          {statusBadge.label}
        </div>
      </div>

      {/* Mini status indicator bar */}
      <div className="relative mb-2">
        <div
          className="h-1.5 rounded-full"
          style={{ background: 'linear-gradient(to right, #22C55E 0%, #22C55E 55%, #F59E0B 55%, #F59E0B 80%, #EF4444 80%, #EF4444 100%)' }}
        />
        <div
          className="absolute -top-1 w-0.5 h-3.5 bg-slate-900 dark:bg-white transition-colors duration-200"
          style={{ left: `${waterPct}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-5 transition-colors duration-200">
        <span>0</span>
        <span className="text-red-500 dark:text-red-400">Критический ({post.waterCritical})</span>
      </div>

      <button
        onClick={() => navigate(`/charts?post=${post.id}`)}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                   bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                   shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
      >
        <LineChartIcon className="w-4 h-4" strokeWidth={2.2} />
        Посмотреть подробнее
      </button>
    </article>
  )
}
