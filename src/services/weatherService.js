// Thin wrapper around the WeatherAPI.com /forecast.json endpoint.
//
// All converters return canonical units used by the rest of the app:
// temperature in °C, wind in m/s, pressure in mmHg. The downstream
// formatters in src/settings/units.js handle the user-selected display unit.

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY
const BASE_URL    = 'https://api.weatherapi.com/v1/forecast.json'
const SEARCH_URL  = 'https://api.weatherapi.com/v1/search.json'
const CURRENT_URL = 'https://api.weatherapi.com/v1/current.json'

// 16-rhumb wind compass → Russian abbreviation (matches the rest of the UI).
const WIND_DIR_RU = {
  N: 'С',   NNE: 'С-СВ', NE: 'СВ', ENE: 'В-СВ',
  E: 'В',   ESE: 'В-ЮВ', SE: 'ЮВ', SSE: 'Ю-ЮВ',
  S: 'Ю',   SSW: 'Ю-ЮЗ', SW: 'ЮЗ', WSW: 'З-ЮЗ',
  W: 'З',   WNW: 'З-СЗ', NW: 'СЗ', NNW: 'С-СЗ',
}

const kphToMs    = (kph)  => kph / 3.6
const mbToMmHg   = (mb)   => mb / 1.33322
const localizeWind = (dir) => WIND_DIR_RU[dir] ?? dir

// ─── LocalStorage cache (10-minute TTL) ──────────────────────────────────────
// Keyed by the raw `q` parameter so "Москва" and "55.75,37.62" cache separately.
// Cache lives at the fetchForecast layer, so every downstream consumer
// (Dashboard, Map, Profile, StationsPage…) benefits without per-call changes.
const CACHE_KEY_PREFIX = 'weather_cache:'
const CACHE_TTL_MS = 10 * 60 * 1000

function readCache(query) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + query)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw)
    if (Date.now() - savedAt > CACHE_TTL_MS) return null
    return data
  } catch { return null }
}

function writeCache(query, data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      CACHE_KEY_PREFIX + query,
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch { /* QuotaExceeded etc — silently skip */ }
}

/**
 * Raw fetch — throws on any non-2xx response or API-level error envelope.
 * The user explicitly asked for `days=2` so we have enough hours to build
 * a sliding 24-hour window across midnight.
 *
 * `query` accepts everything WeatherAPI's `q` parameter accepts: a city
 * name ("Москва"), a "lat,lon" pair, an IATA code, or an IP. Results are
 * cached in localStorage for 10 minutes per query string.
 */
export async function fetchForecast(query) {
  if (!API_KEY) throw new Error('VITE_WEATHER_API_KEY is not configured')

  const cached = readCache(query)
  if (cached) return cached

  // days=7 covers the multi-day picker on WeatherPage. WeatherAPI free tier
  // caps at 3 days; paid tiers return the full 7. Either way the array we
  // build downstream uses whatever the API returned, no need to special-case.
  //
  // aqi=yes    — air-quality index (PM2.5/PM10/CO/etc + EPA/DEFRA bands)
  // alerts=yes — official storm/flood alerts from national met services
  const url = `${BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes&lang=ru`
  const res = await fetch(url)
  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = payload?.error?.message || `WeatherAPI ${res.status}`
    throw new Error(msg)
  }
  writeCache(query, payload)
  return payload
}

/** Flatten WeatherAPI's `current` block into our canonical shape. */
export function normalizeCurrent(payload) {
  const c = payload?.current
  const loc = payload?.location
  const today = payload?.forecast?.forecastday?.[0]?.day
  if (!c || !loc) return null
  return {
    cityName:       loc.name,                                  // e.g. "Moscow" or "Москва"
    region:         loc.region,
    country:        loc.country,
    localtime:      loc.localtime,                              // "2026-05-20 14:32"
    tempC:          c.temp_c,
    feelsLikeC:     c.feelslike_c,
    humidity:       c.humidity,                                 // %
    pressureMmHg:   mbToMmHg(c.pressure_mb),
    pressureMb:     c.pressure_mb,                              // raw mb for delta calcs
    windMs:         kphToMs(c.wind_kph),
    windKph:        c.wind_kph,                                 // raw for impact analysis
    windDir:        localizeWind(c.wind_dir),
    windGustMs:     kphToMs(c.gust_kph ?? 0),
    precipMm:       c.precip_mm,
    precipChance:   today?.daily_chance_of_rain ?? 0,           // %
    uv:             c.uv ?? 0,                                  // 0..11+
    conditionText:  c.condition?.text,                          // localized when lang=ru
    conditionIcon:  c.condition?.icon ? `https:${c.condition.icon}` : null,
    isDay:          c.is_day === 1,
    aqi:            normalizeAqi(c.air_quality),                // null if no AQI data
  }
}

// ─── Air-quality index ──────────────────────────────────────────────────────
// WeatherAPI returns the US-EPA index 1-6 (`us-epa-index`) and DEFRA 1-10.
// We surface EPA + the underlying pollutants for advanced UIs.
const EPA_LABELS = {
  1: { label: 'Хорошее',         color: '#10b981' },
  2: { label: 'Умеренное',       color: '#84cc16' },
  3: { label: 'Чувствительным',  color: '#eab308' },
  4: { label: 'Вредное',         color: '#f97316' },
  5: { label: 'Очень вредное',   color: '#ef4444' },
  6: { label: 'Опасное',         color: '#7f1d1d' },
}
function normalizeAqi(a) {
  if (!a || a['us-epa-index'] == null) return null
  const epa = a['us-epa-index']
  const meta = EPA_LABELS[epa] ?? EPA_LABELS[1]
  return {
    epa,                              // 1..6
    label:    meta.label,
    color:    meta.color,
    pm25:     a.pm2_5  != null ? Math.round(a.pm2_5 * 10) / 10  : null,  // µg/m³
    pm10:     a.pm10   != null ? Math.round(a.pm10  * 10) / 10  : null,
    no2:      a.no2    != null ? Math.round(a.no2   * 10) / 10  : null,
    o3:       a.o3     != null ? Math.round(a.o3    * 10) / 10  : null,
    so2:      a.so2    != null ? Math.round(a.so2   * 10) / 10  : null,
    co:       a.co     != null ? Math.round(a.co    * 10) / 10  : null,
  }
}

/**
 * Normalize the `alerts` block. Each alert is a structured object:
 *   { headline, desc, severity, areas, effective, expires, event, instruction }
 * We return only the user-facing fields and skip empties/duplicates.
 */
export function extractAlerts(payload) {
  const list = payload?.alerts?.alert
  if (!Array.isArray(list) || list.length === 0) return []
  const seen = new Set()
  const out = []
  for (const a of list) {
    const headline = (a.headline ?? a.event ?? '').trim()
    if (!headline) continue
    const key = headline.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      headline,
      event:       a.event ?? '',
      severity:    a.severity ?? '',         // "Minor" | "Moderate" | "Severe" | "Extreme"
      urgency:     a.urgency ?? '',
      areas:       a.areas ?? '',
      effective:   a.effective ?? null,
      expires:     a.expires ?? null,
      desc:        (a.desc ?? '').trim(),
      instruction: (a.instruction ?? '').trim(),
    })
  }
  return out
}

/**
 * Build the 24-hour sliding window starting from the current hour at the
 * city's local time. Pulls today + tomorrow, drops past hours, returns
 * exactly 24 entries normalized for the UI.
 */
export function extractHourly24(payload) {
  const days = payload?.forecast?.forecastday ?? []
  const allHours = days.flatMap(d => d.hour ?? [])
  if (!allHours.length) return []

  // WeatherAPI returns `time_epoch` (UTC seconds) and `time` ("YYYY-MM-DD HH:00").
  // The current city-local hour can be derived from `location.localtime_epoch`.
  const nowEpoch = payload?.location?.localtime_epoch ?? Math.floor(Date.now() / 1000)
  const currentHourEpoch = nowEpoch - (nowEpoch % 3600)

  return allHours
    .filter(h => h.time_epoch >= currentHourEpoch)
    .slice(0, 24)
    .map(h => ({
      epoch:         h.time_epoch,
      time:          h.time,                                  // "YYYY-MM-DD HH:00"
      hourLabel:     h.time.slice(11, 16),                    // "HH:00"
      tempC:         h.temp_c,
      feelsLikeC:    h.feelslike_c,
      pressureMmHg:  mbToMmHg(h.pressure_mb ?? 1013),
      conditionText: h.condition?.text,
      conditionIcon: h.condition?.icon ? `https:${h.condition.icon}` : null,
      chanceOfRain:  h.chance_of_rain,
      isDay:         h.is_day === 1,
    }))
}

/**
 * Day-level summary for each `forecastday` returned by the API. Used by
 * the recommendations page (today / tomorrow buttons) where we need
 * avg/max temps and probability of rain at a day granularity.
 */
export function extractDaysSummary(payload) {
  const days = payload?.forecast?.forecastday ?? []
  return days.map(d => ({
    date:           d.date,                                 // "YYYY-MM-DD"
    maxTempC:       d.day?.maxtemp_c,
    minTempC:       d.day?.mintemp_c,
    avgTempC:       d.day?.avgtemp_c,
    avgHumidity:    d.day?.avghumidity,
    maxWindMs:      kphToMs(d.day?.maxwind_kph ?? 0),
    totalPrecipMm:  d.day?.totalprecip_mm,
    precipChance:   d.day?.daily_chance_of_rain ?? 0,
    conditionText:  d.day?.condition?.text,
    conditionIcon:  d.day?.condition?.icon ? `https:${d.day.condition.icon}` : null,
    sunrise:        d.astro?.sunrise,
    sunset:         d.astro?.sunset,
  }))
}

/**
 * Convenience: fetch + normalize in one shot.
 */
export async function fetchCityWeather(city) {
  const payload = await fetchForecast(city)
  return {
    raw:     payload,
    current: normalizeCurrent(payload),
    hourly:  extractHourly24(payload),
    days:    extractDaysSummary(payload),
    alerts:  extractAlerts(payload),
  }
}

/**
 * Fan-out fetch for the interactive map. Returns one entry per requested
 * city. Failures are isolated — a 404 on Сочи doesn't break Мурманск.
 */
export async function fetchManyCurrent(cityNames) {
  const settled = await Promise.allSettled(cityNames.map(fetchForecast))
  return settled.map((s, i) => {
    if (s.status === 'rejected') {
      return { name: cityNames[i], error: s.reason?.message ?? 'fetch failed', current: null }
    }
    const current = normalizeCurrent(s.value)
    return { name: cityNames[i], error: null, current }
  })
}

// ─── Lightweight `/current.json` fetcher for map markers ────────────────────
// Separate from `fetchForecast` (which uses forecast.json + 10-min cache)
// because the city-marker layer doesn't need hourly/daily data — just the
// current snapshot — and the user spec asks for a dedicated 15-minute cache.
// Bumped to v2 when feelsLikeC + impact-widget fields joined the cached shape.
const CITY_CACHE_PREFIX = 'city_current_v2:'
const CITY_CACHE_TTL_MS = 15 * 60 * 1000

function readCityCache(id) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CITY_CACHE_PREFIX + id)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw)
    if (Date.now() - savedAt > CITY_CACHE_TTL_MS) return null
    return data
  } catch { return null }
}

function writeCityCache(id, data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      CITY_CACHE_PREFIX + id,
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch { /* quota exceeded etc */ }
}

/**
 * Fetch the current weather for one city. Keyed by `city.id` in LocalStorage
 * with a 15-minute TTL, so a panning user doesn't burn the API quota.
 *
 * @param {{ id: string, lat: number, lng: number, nameRu?: string }} city
 * @returns {Promise<{ tempC: number, conditionText: string, conditionIcon: string|null }>}
 */
export async function fetchCurrentForCity(city) {
  if (!API_KEY) throw new Error('VITE_WEATHER_API_KEY is not configured')

  const cached = readCityCache(city.id)
  if (cached) return cached

  // `q=lat,lng` avoids name-based geocoding and Cyrillic encoding issues.
  // `lang=ru` localizes the condition text. `encodeURIComponent` per spec.
  const q = encodeURIComponent(`${city.lat},${city.lng}`)
  const url = `${CURRENT_URL}?key=${API_KEY}&q=${q}&lang=ru`

  const res = await fetch(url)
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(payload?.error?.message || `WeatherAPI ${res.status}`)
  }

  const c = payload?.current
  const loc = payload?.location
  const data = {
    placeName:     loc?.name ?? null,
    region:        loc?.region ?? null,
    tempC:         c?.temp_c,
    feelsLikeC:    c?.feelslike_c,
    humidity:      c?.humidity,
    windKph:       c?.wind_kph,
    windMs:        c?.wind_kph != null ? c.wind_kph / 3.6 : null,
    windDir:       (WIND_DIR_RU[c?.wind_dir] ?? c?.wind_dir) || '',
    pressureMb:    c?.pressure_mb,
    pressureMmHg:  c?.pressure_mb != null ? mbToMmHg(c.pressure_mb) : null,
    uv:            c?.uv ?? 0,
    conditionText: c?.condition?.text ?? '',
    conditionIcon: c?.condition?.icon ? `https:${c.condition.icon}` : null,
  }
  writeCityCache(city.id, data)
  return data
}

// ─── Internal: WeatherAPI search ─────────────────────────────────────────────
async function searchWeatherApi(query) {
  if (!API_KEY) return []
  try {
    const url = `${SEARCH_URL}?key=${API_KEY}&q=${encodeURIComponent(query)}`
    const res = await fetch(url)
    const payload = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(payload)) return []
    return payload
      .filter(loc => {
        const c = (loc.country || '').toLowerCase()
        return c.includes('russia') || c.includes('россия')
      })
      .map(loc => ({
        id:       `wapi-${loc.id}`,
        name:     loc.name,
        region:   loc.region ?? '',
        country:  loc.country,
        lat:      loc.lat,
        lon:      loc.lon,
        _source:  'wapi',
      }))
  } catch { return [] }
}

// ─── Internal: OSM Nominatim search ──────────────────────────────────────────
// More accurate for Russian populated-place lookups than WeatherAPI's search
// (it can disambiguate "Кудрово, Всеволожский район" from a homonymous hamlet).
async function searchNominatim(query) {
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
      q:              query,
      countrycodes:   'ru',
      format:         'jsonv2',
      limit:          '10',
      addressdetails: '1',
      'accept-language': 'ru',
    }).toString()
    const res = await fetch(url, { headers: { 'Accept-Language': 'ru' } })
    if (!res.ok) return []
    const arr = await res.json().catch(() => null)
    if (!Array.isArray(arr)) return []
    return arr
      // Keep only populated places — never streets, houses, POIs
      .filter(r => /^(city|town|village|hamlet|municipality|administrative|suburb)$/i.test(r.addresstype ?? r.type ?? ''))
      .map(r => {
        const addr = r.address ?? {}
        const name = addr[r.addresstype] ?? addr.city ?? addr.town ?? addr.village ?? addr.hamlet
                  ?? (r.display_name?.split(',')[0]?.trim()) ?? r.name ?? '—'
        // Prefer regional admin name over federal-district label
        const region = addr.state ?? addr.region ?? addr.county ?? ''
        return {
          id:      `osm-${r.osm_type}-${r.osm_id}`,
          name,
          region,
          country: addr.country ?? 'Россия',
          lat:     parseFloat(r.lat),
          lon:     parseFloat(r.lon),
          _source: 'osm',
          _rank:   r.place_rank ?? 99,    // OSM's own importance (lower = bigger settlement)
        }
      })
  } catch { return [] }
}

// ─── Ranking + deduplication ─────────────────────────────────────────────────
function dedupeByLocation(results, deltaDeg = 0.05) {
  const out = []
  for (const r of results) {
    const dup = out.find(x => Math.abs(x.lat - r.lat) < deltaDeg && Math.abs(x.lon - r.lon) < deltaDeg)
    if (!dup) {
      out.push(r)
    } else if (r._source === 'osm' && dup._source !== 'osm') {
      // Replace WeatherAPI duplicate with the OSM one (more accurate coords)
      Object.assign(dup, r)
    }
  }
  return out
}

function rankResults(results, query) {
  const q = query.trim().toLowerCase()
  return results
    .map(r => {
      const n = (r.name || '').toLowerCase()
      let score = 0
      if (n === q)              score += 100
      else if (n.startsWith(q)) score += 70
      else if (n.includes(q))   score += 40
      // OSM is generally more authoritative for Russian populated places
      if (r._source === 'osm')  score += 8
      // Big settlements first (Nominatim place_rank: town=18, village=19, hamlet=20)
      if (r._rank != null)      score += Math.max(0, 22 - r._rank)
      // Having explicit region info is a small quality signal
      if (r.region)             score += 2
      return { ...r, _score: score }
    })
    .sort((a, b) => b._score - a._score)
}

/**
 * Autocomplete for Russian populated places — combines OSM Nominatim
 * (authoritative for settlement disambiguation) and WeatherAPI search
 * (broader coverage of edge cases). Results are deduplicated by coordinate
 * proximity and ranked by relevance.
 *
 * Returns array of `{ id, name, region, country, lat, lon }` — same shape
 * the rest of the app already consumes.
 */
export async function searchCities(query) {
  if (!query || query.trim().length < 3) return []

  // Fire both providers in parallel. Per-provider failures are isolated.
  const [wapi, osm] = await Promise.all([
    searchWeatherApi(query),
    searchNominatim(query),
  ])

  return dedupeByLocation(rankResults([...osm, ...wapi], query))
}

/**
 * Fan-out fetch by coordinates — used by StationsPage to pull weather
 * AT each hydropost rather than at its nearest city. WeatherAPI's `q`
 * accepts "lat,lon" directly. Cached, isolated, fully normalized.
 */
export async function fetchManyByCoords(coords /* [{ lat, lon }] */) {
  const queries = coords.map(c => `${c.lat},${c.lon}`)
  const settled = await Promise.allSettled(queries.map(fetchForecast))
  return settled.map((s, i) => {
    if (s.status === 'rejected') {
      return { coords: coords[i], error: s.reason?.message ?? 'fetch failed', current: null, days: [] }
    }
    return {
      coords:  coords[i],
      error:   null,
      current: normalizeCurrent(s.value),
      days:    extractDaysSummary(s.value),
    }
  })
}
