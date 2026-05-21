import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer, TileLayer, Marker, Popup,
  LayersControl, FeatureGroup, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Locate, Search, MapPin, X, Loader2, AlertTriangle, AlertCircle, Star, TrendingUp, TrendingDown, Minus, Crosshair } from 'lucide-react'
import { cities } from '../data/cities'
import { russiaCities } from '../data/russiaCities'
import allHydroStations from '../data/all_stations.json'
import { fetchCurrentForCity } from '../services/weatherService'
import { fetchHydroDataFromPage } from '../services/hydroService'
import { findNearestHydroposts } from '../utils/nearestHydropost'
import { useWeather } from '../context/WeatherContext'
import { useFavorites } from '../favorites/FavoritesContext'
import { useCitySearch } from '../hooks/useCitySearch'
import { useTheme } from '../theme/ThemeContext'

// ─── Favourite key bridge ────────────────────────────────────────────────────
// Dashboard's star button stores favourites under either a cities.js short
// id (e.g. 'msk') or the raw city name for cities outside that dictionary.
// The map uses russiaCities slugs ('moscow'). This helper produces the SAME
// canonical key Dashboard uses, so toggling from either side stays in sync.
function cityFavKey(city) {
  const jsId = Object.values(cities).find(c => c.name === city.nameRu)?.id
  return jsId ?? city.nameRu
}

// Tolerant check: accepts favourites stored under any of (city.id, city.nameRu,
// cities.js short id) — covers legacy entries before the key unification.
function isInFavorites(city, favList) {
  if (!favList?.length) return false
  if (favList.includes(city.id))     return true
  if (favList.includes(city.nameRu)) return true
  const jsId = Object.values(cities).find(c => c.name === city.nameRu)?.id
  return jsId ? favList.includes(jsId) : false
}
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'

// ─── Dynamic cities persistence ──────────────────────────────────────────────
// Cities chosen from the search box that aren't part of the static top-100
// live here. Persisted across reloads so the user's "custom" pins survive.
const DYNAMIC_CITIES_KEY = 'dynamic_cities_v1'

function readDynamicCities() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DYNAMIC_CITIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeDynamicCities(list) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(DYNAMIC_CITIES_KEY, JSON.stringify(list)) } catch {}
}

// Match a search result against russiaCities by coord proximity (~20 km
// at mid-latitudes). If we already have Moscow as 'moscow', we don't want
// a second 'search-…' entry sitting on top of it.
function findExistingCityByCoords(lat, lng) {
  return russiaCities.find(c => Math.abs(c.lat - lat) < 0.2 && Math.abs(c.lng - lng) < 0.2)
}

// ─── Cluster icon factory ────────────────────────────────────────────────────
// Returns a Tailwind-flavoured circular badge with the count. Size scales
// with cluster density so 3 markers ≠ 200 markers visually.
function createClusterCustomIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  return L.divIcon({
    html: `<div class="hmv-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
    className: 'hmv-cluster-wrapper',
    iconSize: L.point(size, size, true),
  })
}

// Free precipitation/cloud tiles from OpenWeatherMap. Requires an `appid`.
// For local testing without a key the tiles will 401 (transparent overlay
// stays empty) — that's fine for demoing the layer-switcher. Drop a real
// key into `OWM_API_KEY` to see the radar.
const OWM_API_KEY = '' // 'YOUR_API_KEY'
const OWM_PRECIP_URL = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`

/**
 * Child of <MapContainer> that uses the `useMap` hook to grab the live map
 * instance and isolate it from the surrounding page.
 *
 * The actual cause of the "page jumps when you click +/−" bug is NOT event
 * bubbling — it's that Leaflet calls `.focus()` on the map container after
 * any control click (its internal `_refocusOnMap` behaviour). When the map
 * is taller than the viewport, the browser then scrolls the page down to
 * bring the focused element fully into view.
 *
 * Fix: monkey-patch `focus()` on the container so it always runs with
 * `preventScroll: true`. Leaflet still gets its focus for keyboard nav,
 * but the browser no longer scrolls the page to chase it.
 */
function MapEventIsolator() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const container = map.getContainer()

    L.DomEvent.disableScrollPropagation(container)
    L.DomEvent.disableClickPropagation(container)

    const originalFocus = container.focus.bind(container)
    container.focus = (opts) => originalFocus({ ...(opts || {}), preventScroll: true })

    // Strip Leaflet's default attribution prefix (the "🇺🇦 Leaflet" link).
    // We keep tile-provider attribution (© OSM / © CARTO) via the TileLayers
    // themselves — those are required for licence compliance. The Leaflet
    // self-link is optional and can be safely removed.
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false)
    }

    return () => { container.focus = originalFocus }
  }, [map])
  return null
}

/**
 * Captures the live Leaflet map instance via the `useMap` hook and lifts
 * it up to the parent. Lets overlay UI rendered OUTSIDE <MapContainer>
 * (search input, locate button) drive `flyTo` and friends.
 */
function MapHandle({ onReady }) {
  const map = useMap()
  useEffect(() => { onReady(map) }, [map, onReady])
  return null
}

/**
 * Round target-shaped button under the +/- zoom control. On click:
 *   1. Asks the browser for the user's coordinates.
 *   2. Pre-fetches WeatherAPI current data for those coords (15-min LS
 *      cache means repeat clicks at the same spot don't hit the network).
 *   3. Hands the resolved home-city object up to the parent via `onLocate`,
 *      which seeds state and dispatches selectLocation — the rest of the
 *      flyTo/marker/popup machinery runs through the dynamic-cities pipeline.
 */
function LocateButton({ map, onLocate }) {
  const [busy, setBusy] = useState(false)

  const handleClick = () => {
    if (!map || busy) return
    if (!('geolocation' in navigator)) {
      window.alert('Геолокация не поддерживается этим браузером.')
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        // Coords in the id → same spot reuses the 15-min cache; different
        // spot gets a fresh fetch. Old home pins are pruned in the parent.
        const home = {
          id:     `home-${lat.toFixed(3)}-${lng.toFixed(3)}`,
          name:   'My location',
          nameRu: 'Моя локация',
          lat, lng,
          isHome: true,
        }
        try {
          const data = await fetchCurrentForCity(home)
          home.nameRu = data?.placeName ?? home.nameRu
          onLocate(home, data ?? null)
        } catch (err) {
          onLocate(home, null)
          window.alert('Не удалось получить погоду по локации: ' + (err.message || err))
        } finally {
          setBusy(false)
        }
      },
      (err) => {
        setBusy(false)
        window.alert('Не удалось определить местоположение: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!map || busy}
      title="Моя локация"
      aria-label="Определить мою локацию"
      className="absolute top-[88px] left-[10px] z-[1000] w-9 h-9 rounded-full flex items-center justify-center
                 bg-white hover:bg-slate-50 text-slate-700
                 dark:bg-[#1A2540] dark:hover:bg-[#22305A] dark:text-slate-200
                 border border-slate-200 dark:border-[#2A3754]
                 shadow-md transition-colors duration-150
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Locate className={'w-4 h-4 ' + (busy ? 'animate-pulse text-[#2F80FF]' : '')} strokeWidth={2.4} />
    </button>
  )
}

/**
 * Glass-panel search input centered at the top of the map. Shares
 * autocomplete behaviour with the Header's <CitySearch /> via the
 * `useCitySearch` hook — same data source (WeatherAPI /search.json),
 * same Russia-only filter, same flyTo + dynamic-marker pipeline. Only
 * the visual treatment differs.
 */
function SearchOverlay() {
  const {
    query, setQuery,
    results,
    open, setOpen,
    loading, error,
    pick, clear,
    wrapperRef, inputRef,
  } = useCitySearch()

  const showDropdown = open && query.trim().length >= 3

  return (
    <div
      ref={wrapperRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[340px] max-w-[calc(100%-110px)]"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск города…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-full pl-9 pr-10 py-2 text-sm outline-none transition-colors
                     bg-white/95 dark:bg-[#131E36]/95 backdrop-blur-md
                     border border-slate-200 dark:border-white/10
                     text-slate-700 dark:text-slate-200
                     placeholder-slate-400 dark:placeholder-slate-500
                     shadow-lg shadow-slate-900/10 dark:shadow-black/40
                     focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); clear() }}
            aria-label="Очистить"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                       text-slate-400 hover:text-slate-700 hover:bg-slate-200/60
                       dark:hover:text-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div
          className="mt-1.5 rounded-2xl overflow-hidden
                     bg-white/95 dark:bg-[#131E36]/95 backdrop-blur
                     border border-slate-200/70 dark:border-white/[0.06]
                     shadow-xl shadow-slate-900/15 dark:shadow-black/50"
        >
          {/* Status strip */}
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold
                          text-slate-500 dark:text-slate-400
                          border-b border-slate-200/70 dark:border-white/[0.06]">
            {loading ? 'Ищем…' : error ? 'Ошибка' : results.length > 0 ? `Найдено: ${results.length}` : 'Города России'}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
              <span>{error}</span>
            </div>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Ничего не найдено в России
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto py-1">
              {results.map(loc => (
                <li key={loc.id ?? `${loc.lat},${loc.lon}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(loc) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors
                               text-slate-700 dark:text-slate-200
                               hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2.2} />
                    <span className="truncate font-medium">{loc.name}</span>
                    {loc.region && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        , {loc.region}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Fix leaflet default icons broken by Vite bundling ────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// City markers come from src/data/russiaCities.js (top-100). They are
// loaded lazily by viewport via the `moveend` listener inside <WeatherMap />.

// Hydropost data now comes from src/data/all_stations.json — see top-of-file
// import `allHydroStations`. Live water levels are scraped lazily on popup
// open via `src/services/hydroService.js`.

// ─── Status colour + text mapping ────────────────────────────────────────────
const STATUS_COLOR = {
  normal:   '#3b82f6', // blue  — уровень в норме
  warning:  '#f97316', // orange — вода поднимается
  critical: '#ef4444', // red   — критический уровень
}

const STATUS_TEXT = {
  normal:   'Уровень в норме',
  warning:  'Вода поднимается',
  critical: 'Критический уровень!',
}

// ─── Color buckets ───────────────────────────────────────────────────────────
// Slate-grey for the loading/unknown state so the user sees the marker
// exists even before the API responds.
function getMarkerColor(t) {
  if (t == null || Number.isNaN(t)) return '#94a3b8'
  if (t < 0)  return '#3b82f6'   // blue
  if (t < 10) return '#22c55e'   // green
  if (t < 20) return '#eab308'   // yellow
  if (t < 25) return '#f97316'   // orange
  return '#ef4444'               // red
}

// Small interactive star, used in both city and hydropost popups. Toggles
// the favourite state on click; visual state is driven by `active`.
function FavStar({ active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={title ?? (active ? 'Убрать из избранного' : 'Добавить в избранное')}
      className="ml-auto shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full
                 transition-transform duration-150 hover:scale-110 active:scale-95
                 hover:bg-yellow-50"
    >
      <Star
        className={active ? 'w-4 h-4 text-yellow-400' : 'w-4 h-4 text-slate-400'}
        fill={active ? '#facc15' : 'transparent'}
        strokeWidth={2.2}
      />
    </button>
  )
}

// ─── City popup body — rendered as a child of <Popup> ──────────────────────
function CityPopupBody({ city, live, isFavorite, onToggleFavorite }) {
  // ── Geolocation popup variant ────────────────────────────────────────────
  if (city.isHome) {
    if (!live || live.tempC == null) {
      return (
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2F80FF',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Моя локация
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Определяем погоду…</div>
        </div>
      )
    }
    const feelsLike = live.feelsLikeC ?? live.tempC
    const feelsRounded = Math.round(feelsLike)
    const feelsSign = feelsRounded >= 0 ? '+' : ''
    const actualRounded = Math.round(live.tempC)
    const actualSign = actualRounded >= 0 ? '+' : ''
    const color = getMarkerColor(feelsLike)
    const place = live.placeName ?? city.nameRu
    return (
      <div style={{ minWidth: 250 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#2F80FF',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Моя локация
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color }}>
            {actualSign}{actualRounded}°C
          </div>
          {live.conditionIcon && (
            <img src={live.conditionIcon} alt={live.conditionText} style={{ width: 32, height: 32 }} />
          )}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          Ощущается как {feelsSign}{feelsRounded}°C
        </div>
        <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
          Погода по вашей геолокации: <b>{place}</b>, {live.conditionText}
        </div>
      </div>
    )
  }

  // ── Default city variant ─────────────────────────────────────────────────
  if (!live) {
    return (
      <div style={{ minWidth: 190 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{city.nameRu}</span>
          <FavStar active={isFavorite} onClick={onToggleFavorite} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Загрузка…</div>
      </div>
    )
  }
  const temp = live.tempC
  if (temp == null) {
    return (
      <div style={{ minWidth: 190 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{city.nameRu}</span>
          <FavStar active={isFavorite} onClick={onToggleFavorite} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Нет данных</div>
      </div>
    )
  }
  // Big number = actual temperature (matches what users intuitively expect).
  // "Feels like" is a small caption underneath. Marker COLOR on the map is
  // still driven by feels-like in the parent — that's the impact heuristic,
  // separate from the display preference here.
  const feelsLike = live.feelsLikeC ?? temp
  const feelsRounded = Math.round(feelsLike)
  const feelsSign = feelsRounded >= 0 ? '+' : ''
  const actualRounded = Math.round(temp)
  const actualSign = actualRounded >= 0 ? '+' : ''
  const color = getMarkerColor(feelsLike)
  return (
    <div style={{ minWidth: 210 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Метеоданные
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{city.nameRu}</span>
        <FavStar active={isFavorite} onClick={onToggleFavorite} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color }}>
          {actualSign}{actualRounded}°C
        </div>
        {live.conditionIcon && (
          <img src={live.conditionIcon} alt={live.conditionText} style={{ width: 32, height: 32 }} />
        )}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
        Ощущается как {feelsSign}{feelsRounded}°C
      </div>

      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
        {live.conditionText}
      </div>
    </div>
  )
}

// ─── Hydropost popup body — drives the lazy scrape flow ──────────────────
// `live` shapes:
//   undefined                     → user hasn't opened this popup yet
//   { loading: true }             → fetch in flight, show spinner
//   { error: '…' }                → fetch failed
//   { data: {…}, fallbackFrom?:…} → success (fallbackFrom present when this
//                                   gauge is dormant and we substituted a
//                                   neighbour's live data)
function HydroPopupBody({ station, live, isFavorite, onToggleFavorite }) {
  const data = live?.data
  const fallback = live?.fallbackFrom
  const status = data?.status ?? 'normal'
  const statusColor = levelColor(status)
  const statusText  = STATUS_TEXT[status]

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Гидропост
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{station.name}</span>
        <FavStar active={isFavorite} onClick={onToggleFavorite} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Река: {station.river}</div>

      {/* ── Loading spinner ─────────────────────────────────────────────── */}
      {live?.loading && !data && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40 animate-ping" />
            <Loader2 className="relative w-4 h-4 text-blue-500 animate-spin" strokeWidth={2.4} />
          </span>
          <span>Получаем уровень воды…</span>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {live?.error && !data && (
        <div className="mt-3 flex items-start gap-2 rounded-xl px-2.5 py-2 text-xs
                        bg-red-50 dark:bg-red-500/10
                        border border-red-200/70 dark:border-red-500/20
                        text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{live.error}</span>
        </div>
      )}

      {/* ── Success: dormant gauge (no real-time on source) ─────────────── */}
      {data && data.noData && (
        <div className="mt-3 flex items-start gap-2 rounded-xl px-2.5 py-2 text-xs
                        bg-slate-50 dark:bg-white/[0.04]
                        border border-slate-200/70 dark:border-white/[0.06]
                        text-slate-600 dark:text-slate-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" strokeWidth={2.4} />
          <span>
            Оперативные данные по этому посту сегодня недоступны на источнике.
            Попробуйте позже или загляните в архив за предыдущие сутки.
          </span>
        </div>
      )}

      {/* ── Fallback notice if we used a neighbour ─────────────────────── */}
      {fallback && data && !data.noData && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px]
                        bg-blue-50 dark:bg-blue-500/10
                        border border-blue-200/60 dark:border-blue-500/20
                        text-blue-700 dark:text-blue-300">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>
            На этом посту нет оперативных данных, показываем ближайший:{' '}
            <b>{fallback.name}</b>
            {live.fallbackDistanceKm != null && ` (${Math.round(live.fallbackDistanceKm)} км)`}.
          </span>
        </div>
      )}

      {/* ── Success: level + delta + status ─────────────────────────────── */}
      {data && !data.noData && data.level != null && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(data.level)} см</span>
            <span style={{ fontSize: 10, opacity: 0.55 }}>над нулём поста</span>
          </div>

          {data.delta != null && (
            <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: data.delta > 0 ? '#f97316' : data.delta < 0 ? '#3b82f6' : '#64748b' }}>
              {data.delta > 0 && <>▲ +{data.delta} см за сутки</>}
              {data.delta < 0 && <>▼ {data.delta} см за сутки</>}
              {data.delta === 0 && <>— уровень не изменился</>}
            </div>
          )}

          {(data.warning != null || data.danger != null) && (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              {data.warning != null && <>Пойма: {data.warning} см. </>}
              {data.danger != null && <>Опасный: {data.danger} см.</>}
            </div>
          )}

          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800,
                        color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {statusText}
          </div>
        </>
      )}

      {/* User-friendly disclosure when level is computed from current weather */}
      {data?.simulated && !data.noData && data.level != null && (
        <div className="mt-2 px-2 py-1.5 rounded-lg text-[10px] leading-snug
                        bg-slate-50 dark:bg-white/[0.04]
                        border border-slate-200 dark:border-white/[0.06]
                        text-slate-500 dark:text-slate-400">
          Расчёт уровня воды на основе средних значений поста
          и&nbsp;<b>актуальной погоды</b> в&nbsp;координатах гидропоста
          {data.weatherSnap?.precipMm > 0 && <> (осадки сегодня:&nbsp;{data.weatherSnap.precipMm.toFixed(1)}&nbsp;мм)</>}.
        </div>
      )}

      {data?.fromCache && (
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, fontStyle: 'italic' }}>
          из кэша (обновлено{' '}
          {new Date(data.fetchedAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })})
        </div>
      )}

      {/* Deep-link to the full hydropost detail page — uses a hash so
          Leaflet's popup link handler doesn't fight react-router's. The
          map-side onClick uses history.pushState for SPA navigation. */}
      <a
        href={`/post/${station.id}`}
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
          e.preventDefault()
          window.history.pushState({}, '', `/post/${station.id}`)
          // Trigger react-router to re-evaluate by firing popstate
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
        style={{
          display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 600,
          color: '#2F80FF', textDecoration: 'none',
        }}
      >
        Открыть карточку поста →
      </a>
    </div>
  )
}

// Reusable gold-star SVG for favourite markers. Inlined (not lucide-react)
// because divIcon HTML is a string, not React.
const STAR_SVG = `
  <svg viewBox="0 0 24 24" width="13" height="13" fill="#facc15"
       stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
`

// ─── City marker — round colored dot with white border ──────────────────────
// Uses Tailwind utilities for the structural look (shadow-md, border-2,
// border-white, rounded-full, transition-colors duration-300) and an inline
// background-color for the dynamic temperature hue (Tailwind can't prune
// arbitrary HEX values).
//
// `opts.isHome`     — bigger 26px dot, border-4, animate-ping ring (geolocation)
// `opts.isFavorite` — 22px dot, gold star overlay top-right, gold glow ring,
//                     promoted via zIndexOffset on the <Marker /> level
function makeCityDivIcon(temp, opts = {}) {
  const color = getMarkerColor(temp)

  if (opts.isHome) {
    return L.divIcon({
      className: 'home-marker-divicon',
      html: `
        <div style="position:relative;width:26px;height:26px;">
          <span
            class="absolute inset-0 rounded-full animate-ping"
            style="background-color:${color};opacity:0.55;">
          </span>
          <div
            class="absolute inset-0 rounded-full shadow-lg border-4 border-white transition-colors duration-300"
            style="background-color:${color};">
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -16],
    })
  }

  if (opts.isFavorite) {
    return L.divIcon({
      className: 'city-marker-divicon',
      html: `
        <div class="relative" style="width:22px;height:22px;">
          <div
            class="absolute inset-0 rounded-full border-2 border-white transition-colors duration-300
                   shadow-[0_0_10px_rgba(234,179,8,0.75)]"
            style="background-color:${color};">
          </div>
          <div class="absolute" style="top:-6px;right:-6px;">
            ${STAR_SVG}
          </div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    })
  }

  return L.divIcon({
    className: 'city-marker-divicon',
    html: `
      <div
        class="rounded-full shadow-md border-2 border-white transition-colors duration-300"
        style="width:16px;height:16px;background-color:${color};">
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  })
}

function levelColor(status) {
  return STATUS_COLOR[status] ?? STATUS_COLOR.normal
}

// ─── divIcon factory for hydroposts (droplet SVG + optional pulse) ───────────
// `opts.isFavorite` adds a small gold star at the top-right and a soft
// gold drop-shadow glow on the droplet itself.
function hydroDivIcon(status, opts = {}) {
  const color = levelColor(status)
  const pulse = status === 'critical'
    ? `<span class="pulsating-marker" style="--pulse-color:${color}"></span>`
    : ''
  const star = opts.isFavorite
    ? `<div class="absolute" style="top:-2px;right:-2px;">${STAR_SVG}</div>`
    : ''
  const dropShadow = opts.isFavorite
    ? 'drop-shadow(0 0 8px rgba(234,179,8,.75)) drop-shadow(0 2px 4px rgba(0,0,0,.35))'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,.35))'
  return L.divIcon({
    className: 'hydropost-divicon',
    html: `
      <div class="relative" style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;
                  filter:${dropShadow};">
        ${pulse}
        <svg viewBox="0 0 24 24" width="30" height="30" fill="${color}" stroke="white" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"
             style="position:relative;z-index:1;">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
        ${star}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

/**
 * Reusable interactive map of Russia.
 *
 * @param {'both'|'weather'|'hydro'} layer — which marker layer(s) to render.
 * @param {string} className — Tailwind classes for the outer wrapper (controls size).
 *                             The parent MUST provide a definite height, otherwise
 *                             Leaflet collapses to 0 px.
 * @param {(id: string) => void} onHydropostClick — optional analytics hook.
 * @param {boolean} showSearch — render the city search input over the map.
 */
export default function WeatherMap({
  layer = 'both',
  className = 'w-full h-full',
  onHydropostClick,
  showSearch = false,
}) {
  const [mapInstance, setMapInstance] = useState(null)
  // id → { tempC, conditionText, conditionIcon }
  const [cityWeather, setCityWeather] = useState({})
  // Drives the base TileLayer between OSM (light) and CartoDB Dark Matter (dark).
  // CartoDB's dark style was designed for cartography, so it stays readable
  // without the invert-hue-rotate filter hack we use as fallback.
  const { theme } = useTheme()

  // ─── Hydropost live data ────────────────────────────────────────────────────
  // stationId → { loading?: true, data?: parsed, error?: string }
  // Empty by default — we DO NOT fetch on mount. A fetch is triggered when
  // the user opens a marker's popup, via the `popupopen` event on the Marker.
  const [hydroLive, setHydroLive] = useState({})
  const hydroInflightRef = useRef(new Set())  // prevent double-fetch on rapid popup toggling

  const triggerHydroFetch = useCallback(async (station) => {
    if (!station?.urlPath) return
    // Fast path — already cached on this marker
    setHydroLive(prev => {
      if (prev[station.id]?.data || prev[station.id]?.loading) return prev
      return { ...prev, [station.id]: { loading: true } }
    })
    if (hydroInflightRef.current.has(station.id)) return
    hydroInflightRef.current.add(station.id)

    try {
      // 1) Try the station the user actually clicked
      const direct = await fetchHydroDataFromPage(station.urlPath)
      if (!direct.noData && direct.level != null) {
        setHydroLive(prev => ({ ...prev, [station.id]: { data: direct } }))
        return
      }
      // 2) The clicked gauge is dormant — probe the 4 next-nearest in
      //    parallel and present the first one that returns live data,
      //    attributed to its real source post.
      const neighbours = findNearestHydroposts(station.lat, station.lng, 6)
        .filter(n => n.station.id !== station.id)
        .slice(0, 4)
      const probes = await Promise.all(neighbours.map(async n => {
        try {
          const d = await fetchHydroDataFromPage(n.station.urlPath)
          return { ...n, data: d }
        } catch { return null }
      }))
      const winner = probes.find(p => p?.data && !p.data.noData && p.data.level != null)
      if (winner) {
        setHydroLive(prev => ({
          ...prev,
          [station.id]: { data: winner.data, fallbackFrom: winner.station, fallbackDistanceKm: winner.distanceKm },
        }))
      } else {
        // Genuinely no data in the whole neighborhood — surface clean noData
        setHydroLive(prev => ({ ...prev, [station.id]: { data: direct } }))
      }
    } catch (err) {
      setHydroLive(prev => ({ ...prev, [station.id]: { error: err.message || 'Ошибка парсинга' } }))
    } finally {
      hydroInflightRef.current.delete(station.id)
    }
  }, [])

  // ─── Favourites integration ─────────────────────────────────────────────────
  // Single source of truth for "is this favourited" lives in FavoritesContext.
  // We re-render markers whenever the favourites array changes — automatic
  // because useFavorites() returns a new object reference on each update.
  const { favorites, toggleCity, togglePost, isFavoritePost } = useFavorites()
  const isCityFav    = (city) => isInFavorites(city, favorites.cities)
  const toggleCityFav = (city) => toggleCity(cityFavKey(city))
  const toggleHydroFav = (post) => togglePost(post.id)
  // Mirror of which ids we already fetched (or are fetching). Lives in a
  // ref so the moveend closure always sees the latest set without forcing
  // the effect to re-subscribe on every fetch completion.
  const fetchedIdsRef = useRef(new Set())

  // Cities added on the fly via the search box. Hydrated from LocalStorage
  // so the user's custom pins survive page reloads.
  const [dynamicCities, setDynamicCities] = useState(() => readDynamicCities())

  // markerRefs[id] → underlying L.Marker instance, used to call openPopup()
  // when the user picks a city from the search dropdown.
  const markerRefsRef = useRef({})

  // Single source of truth for "all cities to render". Dedupe by id, with
  // dynamic entries overriding base entries if both exist.
  const allCities = useMemo(() => {
    const map = new Map()
    russiaCities.forEach(c => map.set(c.id, c))
    dynamicCities.forEach(c => map.set(c.id, c))
    return Array.from(map.values())
  }, [dynamicCities])

  // ─── Receive search picks AND geolocation: flyTo + dynamic marker + openPopup ──
  const { activeCity, selectedLocation, selectLocation } = useWeather()

  // ─── One-shot auto-fit on first mount, driven by Favourites ───────────────
  // Empty list  → keep the default center/zoom (or whatever LocateButton sets)
  // 1 favourite → flyTo(coords, 10)
  // 2+          → fitBounds(coords, padding 50px)
  //
  // The didAutoFitRef ensures this never re-runs after the user starts
  // panning. If the user opened the map via header-search (selectedLocation
  // is already set), we yield to that handler — don't fight for the camera.
  const didAutoFitRef = useRef(false)
  useEffect(() => {
    if (!mapInstance || didAutoFitRef.current) return
    didAutoFitRef.current = true
    if (selectedLocation) return // selectedLocation effect will fly instead

    const favPostSet = new Set(favorites.posts)

    const cityPoints = [...russiaCities, ...dynamicCities]
      .filter(c => isInFavorites(c, favorites.cities))
      .map(c => [c.lat, c.lng])

    const postPoints = allHydroStations
      .filter(p => favPostSet.has(p.id))
      .map(p => [p.lat, p.lng])

    const all = [...cityPoints, ...postPoints]
    if (all.length === 0) return
    if (all.length === 1) {
      mapInstance.flyTo(all[0], 10, { duration: 1.4 })
      return
    }
    mapInstance.fitBounds(all, { padding: [50, 50] })
    // We intentionally exclude favorites/dynamicCities/selectedLocation from
    // deps — this is a once-on-mount effect. Re-running on favourite changes
    // would yank the camera while the user is panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance])

  // Pre-seed weather state with the data LocateButton already fetched. The
  // marker then renders coloured on its very first mount (no grey flash),
  // and refreshVisible skips a duplicate request because the id is marked
  // as already-fetched. Then dispatch selectLocation which triggers the
  // selectedLocation effect above (flyTo + openPopup).
  const handleLocate = useCallback((home, data) => {
    if (data) {
      setCityWeather(prev => ({ ...prev, [home.id]: data }))
      fetchedIdsRef.current.add(home.id)
    }
    selectLocation(home)
  }, [selectLocation])
  // Track the last `pickedAt` we've already acted on, so re-renders /
  // re-mounts / HMR don't keep yanking the camera back to a stale selection.
  const lastAppliedPickRef = useRef(0)

  useEffect(() => {
    if (!selectedLocation || !mapInstance) return

    // Only honour FRESH picks (within ~10s). After that, the user is panning
    // the map themselves — staying put is the correct behaviour.
    const pickedAt = selectedLocation.pickedAt ?? 0
    if (Date.now() - pickedAt > 10_000) return
    if (pickedAt <= lastAppliedPickRef.current) return
    lastAppliedPickRef.current = pickedAt

    const isHome = !!selectedLocation.isHome

    // For home: always render as a dynamic marker even if a static city
    // happens to sit nearby — we want the distinct "your location" styling.
    // For search picks: reuse an existing static pin when coords align.
    const matchedBase = isHome
      ? null
      : findExistingCityByCoords(selectedLocation.lat, selectedLocation.lng)
    const targetId = matchedBase ? matchedBase.id : selectedLocation.id

    if (!matchedBase) {
      setDynamicCities(prev => {
        // For home: prune older home pins (stale coords) — only one at a time.
        const base = isHome ? prev.filter(c => !c.isHome || c.id === selectedLocation.id) : prev

        const idx = base.findIndex(c => c.id === selectedLocation.id)
        const entry = {
          id:     selectedLocation.id,
          name:   selectedLocation.name ?? selectedLocation.nameRu,
          nameRu: selectedLocation.nameRu,
          lat:    selectedLocation.lat,
          lng:    selectedLocation.lng,
          isHome: isHome || undefined,
        }

        let next
        if (idx === -1) next = [...base, entry]
        else            next = base.map((c, i) => (i === idx ? entry : c))

        if (next === prev) return prev
        writeDynamicCities(next)
        return next
      })
    }

    // Per spec: zoom 11 for geolocation, zoom 12 for search picks.
    const zoom = isHome ? 11 : 12
    mapInstance.flyTo([selectedLocation.lat, selectedLocation.lng], zoom, { duration: 1.4 })

    // Open the popup once Leaflet finishes the fly animation — by then the
    // Marker has mounted (if dynamic) and got a ref into markerRefsRef.
    const onMoveEnd = () => {
      const marker = markerRefsRef.current[targetId]
      if (marker) marker.openPopup()
      mapInstance.off('moveend', onMoveEnd)
    }
    mapInstance.on('moveend', onMoveEnd)
    return () => { mapInstance.off('moveend', onMoveEnd) }
  }, [selectedLocation, mapInstance])

  // ─── Viewport-driven loader ─────────────────────────────────────────────────
  // Subscribes to Leaflet's `moveend` (fires after pan AND zoom). For each
  // top-100 city inside the current bounds, request its current weather —
  // unless we already loaded it. The fetchCurrentForCity service layer
  // wraps the API call in a 15-min LocalStorage cache, so even on a cold
  // component mount a panning user mostly hits cache.
  useEffect(() => {
    if (!mapInstance) return

    let cancelled = false

    async function refreshVisible() {
      const bounds = mapInstance.getBounds()
      const visible = allCities.filter(c => bounds.contains([c.lat, c.lng]))
      const fetched = fetchedIdsRef.current

      await Promise.all(visible.map(async (c) => {
        if (fetched.has(c.id)) return
        fetched.add(c.id) // claim before await — prevents duplicate fetches
        try {
          const data = await fetchCurrentForCity(c)
          if (cancelled) return
          setCityWeather(prev => ({ ...prev, [c.id]: data }))
        } catch {
          // Per-city failure shouldn't break the rest — mark as resolved-empty
          // so we don't hammer a 404'd endpoint on every moveend.
          if (cancelled) return
          setCityWeather(prev => ({ ...prev, [c.id]: { tempC: null, conditionText: '', conditionIcon: null } }))
        }
      }))
    }

    refreshVisible() // initial sweep
    mapInstance.on('moveend', refreshVisible)
    return () => {
      cancelled = true
      mapInstance.off('moveend', refreshVisible)
    }
  }, [mapInstance, allCities])
  return (
    // `relative isolate z-0` creates a new stacking context, so Leaflet's
    // internal z-index values (up to 700 for popups) cannot escape this box
    // and overlap the sticky <Header />.
    <div className={`relative isolate z-0 ${className}`}>
      {/* Leaflet visual tweaks for theme + popup look */}
      <style>{`
        .leaflet-container { background: #DBEAFE; position: relative; }
        .dark .leaflet-container { background: #0c1524; }
        /* No tile filter needed in dark mode — CartoDB Dark Matter is
           natively dark-themed, so we ship it raw without any invert/hue trick. */
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important;
          color: #475569 !important;
        }
        .dark .leaflet-control-attribution {
          background: rgba(10,20,40,0.85) !important;
          color: #94a3b8 !important;
        }
        .dark .leaflet-control-attribution a { color: #cbd5e1 !important; }

        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 6px 24px rgba(15,23,42,.12);
        }
        .dark .leaflet-popup-content-wrapper, .dark .leaflet-popup-tip {
          background: #131E36;
          color: #f1f5f9;
          box-shadow: 0 8px 32px rgba(0,0,0,.5);
        }
        .leaflet-popup-content { margin: 10px 14px; font-family: inherit; }

        .leaflet-control-zoom a {
          background: #ffffff !important; color: #0f172a !important;
          border-color: rgba(0,0,0,.1) !important;
          touch-action: none;
        }
        .dark .leaflet-control-zoom a {
          background: #1A2540 !important; color: #f1f5f9 !important;
          border-color: #2A3754 !important;
        }

        /* ── LayersControl panel — top-right, theme-aware ── */
        .leaflet-control-layers {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, .08) !important;
          border-radius: 12px !important;
          box-shadow: 0 6px 24px rgba(15,23,42,.12) !important;
          padding: 4px !important;
        }
        .dark .leaflet-control-layers {
          background: #131E36 !important;
          color: #f1f5f9 !important;
          border-color: rgba(255,255,255,.06) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,.5) !important;
        }
        .leaflet-control-layers-toggle {
          background-color: #ffffff !important;
          border-radius: 10px !important;
          width: 36px !important;
          height: 36px !important;
        }
        .dark .leaflet-control-layers-toggle {
          background-color: #131E36 !important;
          filter: invert(0.92) hue-rotate(180deg);
        }
        .leaflet-control-layers-expanded {
          padding: 10px 14px !important;
          min-width: 180px;
          font-size: 13px;
        }
        .leaflet-control-layers-separator {
          border-top: 1px solid rgba(15,23,42,.08) !important;
          margin: 6px 0 !important;
        }
        .dark .leaflet-control-layers-separator {
          border-top-color: rgba(255,255,255,.08) !important;
        }
        .leaflet-control-layers label {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 2px;
          cursor: pointer;
          font-weight: 500;
        }
        .leaflet-control-layers label input { margin-right: 2px; }
      `}</style>

      <MapContainer
        center={[62, 90]}
        zoom={4}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', position: 'relative' }}
      >
        <MapEventIsolator />
        <MapHandle onReady={setMapInstance} />

        <LayersControl position="topright">
          {/* ── Base layer — light/dark variants ──
              Re-keyed by theme so Leaflet swaps the underlying L.TileLayer
              instance entirely (instead of in-place URL mutation, which
              leaves a checkerboard during the tile crossfade). */}
          <LayersControl.BaseLayer
            checked
            name={theme === 'dark' ? 'CartoDB Dark Matter' : 'OpenStreetMap'}
          >
            {theme === 'dark' ? (
              <TileLayer
                key="dark"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                noWrap={false}
                maxZoom={20}
                maxNativeZoom={20}
              />
            ) : (
              <TileLayer
                key="light"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                noWrap={false}
                maxZoom={18}
                maxNativeZoom={19}
              />
            )}
          </LayersControl.BaseLayer>

          {/* ── Overlay: city weather markers (clustered) ── */}
          <LayersControl.Overlay
            checked={layer === 'both' || layer === 'weather'}
            name="Погода (Города)"
          >
            <FeatureGroup>
              <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom
                zoomToBoundsOnClick
                maxClusterRadius={60}
                iconCreateFunction={createClusterCustomIcon}
              >
                {allCities.map(city => {
                  const live = cityWeather[city.id]
                  // Marker color now follows "feels like" — falls back to
                  // actual temperature when feelsLikeC is missing (older
                  // cache entries pre-v2 or partial API responses).
                  const colorTemp = live?.feelsLikeC ?? live?.tempC
                  const fav = isCityFav(city)
                  return (
                    <Marker
                      key={city.id}
                      position={[city.lat, city.lng]}
                      icon={makeCityDivIcon(colorTemp, { isHome: !!city.isHome, isFavorite: fav })}
                      zIndexOffset={fav ? 1000 : 0}
                      ref={(el) => {
                        if (el) markerRefsRef.current[city.id] = el
                        else delete markerRefsRef.current[city.id]
                      }}
                    >
                      <Popup autoPan={false}>
                        <CityPopupBody
                          city={city}
                          live={live}
                          isFavorite={fav}
                          onToggleFavorite={() => toggleCityFav(city)}
                        />
                      </Popup>
                    </Marker>
                  )
                })}
              </MarkerClusterGroup>
            </FeatureGroup>
          </LayersControl.Overlay>

          {/* ── Overlay: hydropost markers (clustered) ── */}
          <LayersControl.Overlay
            checked={layer === 'both' || layer === 'hydro'}
            name="Гидропосты"
          >
            <FeatureGroup>
              <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom
                zoomToBoundsOnClick
                maxClusterRadius={60}
                iconCreateFunction={createClusterCustomIcon}
              >
                {allHydroStations.map(station => {
                  const fav = isFavoritePost(station.id)
                  const live = hydroLive[station.id]
                  // Default to 'normal' (blue) until the popup is opened
                  // and the scraper returns. Status flips when data arrives.
                  const status = live?.data?.status ?? 'normal'
                  return (
                    <Marker
                      key={station.id}
                      position={[station.lat, station.lng]}
                      icon={hydroDivIcon(status, { isFavorite: fav })}
                      zIndexOffset={fav ? 1000 : 0}
                      eventHandlers={{
                        popupopen: () => {
                          triggerHydroFetch(station)
                          if (onHydropostClick) onHydropostClick(station.id)
                        },
                      }}
                    >
                      {/* autoPan=false → клик по гидропосту не «отъезжает» картой */}
                      <Popup autoPan={false}>
                        <HydroPopupBody
                          station={station}
                          live={live}
                          isFavorite={fav}
                          onToggleFavorite={() => toggleHydroFav(station)}
                        />
                      </Popup>
                    </Marker>
                  )
                })}
              </MarkerClusterGroup>
            </FeatureGroup>
          </LayersControl.Overlay>

          {/* ── Overlay: precipitation radar (OpenWeatherMap, needs API key) ── */}
          <LayersControl.Overlay name="Осадки (радар)">
            <TileLayer
              url={OWM_PRECIP_URL}
              attribution='Осадки © <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              opacity={0.55}
              maxZoom={18}
            />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      {/* Overlay UI — rendered as siblings of <MapContainer>, NOT children,
          so they don't interfere with Leaflet's event handling. The wrapper
          `relative isolate z-0` above keeps them stacked inside the map's
          own z-index context. */}
      <LocateButton map={mapInstance} onLocate={handleLocate} />
      <RecenterButton map={mapInstance} activeCity={activeCity} />
      {showSearch && <SearchOverlay />}
    </div>
  )
}

/**
 * "Вернуться к городу" — фокусирует камеру на активном городе. Полезно,
 * когда пользователь свободно панорамировал и хочет вернуться.
 */
function RecenterButton({ map, activeCity }) {
  const match = activeCity
    ? russiaCities.find(c => c.nameRu === activeCity)
    : null
  if (!match) return null

  const handleClick = () => {
    if (!map) return
    map.flyTo([match.lat, match.lng], 11, { duration: 1.2 })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!map}
      title={`Вернуться к городу: ${activeCity}`}
      aria-label={`Вернуться к городу: ${activeCity}`}
      className="absolute top-[132px] left-[10px] z-[1000] w-9 h-9 rounded-full flex items-center justify-center
                 bg-white hover:bg-slate-50 text-slate-700
                 dark:bg-[#1A2540] dark:hover:bg-[#22305A] dark:text-slate-200
                 border border-slate-200 dark:border-[#2A3754]
                 shadow-md transition-colors duration-150
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Crosshair className="w-4 h-4" strokeWidth={2.4} />
    </button>
  )
}
