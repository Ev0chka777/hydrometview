// Hydropost level "fetcher" — actually a deterministic model that combines
// a stable per-station baseline with REAL precipitation + temperature data
// from WeatherAPI at the station's coordinates.
//
// Background:
//   • allrivers.info is a Vue/SPA — initial HTML is an empty <div id="app">,
//     real data is rendered client-side via AJAX. No public JSON endpoint
//     and AllOrigins/CORS-proxies are rate-limited or blocked on this host.
//   • A pure-frontend Vite app cannot run their JS to extract numbers.
//   • Real Roshydromet APIs require an enterprise contract.
//
// What this service does instead:
//   1. Look up the station in all_stations.json
//   2. Compute a stable baseline level from a hash of station.id
//      (so the same post always shows the same baseline across reloads)
//   3. Fetch real current weather for the station's coords via WeatherAPI
//      (uses the existing 15-min LocalStorage cache → free for cached calls)
//   4. Apply rainfall delta + snowmelt delta → final level
//   5. Return a payload identical in shape to the old scraper, plus
//      `{ simulated: true }` so the UI can honestly say "оценка".

import allHydroStations from '../data/all_stations.json'
import { fetchCurrentForCity } from './weatherService'

const CACHE_KEY_PREFIX = 'hydro_v3:'
const CACHE_TTL_MS     = 60 * 60 * 1000   // 1 hour — re-evaluate as weather changes

// ─── LocalStorage cache helpers ──────────────────────────────────────────────
function readCache(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + key)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw)
    if (Date.now() - savedAt > CACHE_TTL_MS) return null
    return data
  } catch { return null }
}
function writeCache(key, data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch { /* quota */ }
}

// Tiny deterministic hash for string → 32-bit int.
function stableHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function classifyStatus(level, warning, danger) {
  if (level >= danger)  return 'critical'
  if (level >= warning) return 'warning'
  return 'normal'
}

/**
 * Compute the hydro payload for one station based on its baseline and
 * the real weather at its coordinates.
 *
 * @param {{id, name, lat, lng, river}} station
 * @returns {Promise<{
 *   level: number, delta: number, warning: number, danger: number,
 *   status: 'normal'|'warning'|'critical',
 *   simulated: true,
 *   weatherSnap: { tempC, precipMm, conditionText },
 *   fetchedAt: number, fromCache?: boolean,
 * }>}
 */
async function modelLevelFromWeather(station) {
  // Pull real current weather for the station's coordinates (15-min cache)
  const weather = await fetchCurrentForCity({
    id: station.id, lat: station.lat, lng: station.lng,
  })

  // ── Baseline level (stable per station) ──────────────────────────────────
  // Distribute across 120…380 cm — typical mid-river values.
  const idHash = stableHash(station.id)
  const baseline = 120 + (idHash % 261)              // 120..380 inclusive

  // ── Precipitation impact ─────────────────────────────────────────────────
  // WeatherAPI's `precip_mm` (current snapshot, daily total in our normalized
  // shape varies) — we use whichever is available.
  const precipMm = Number.isFinite(weather?.precipMm)
    ? weather.precipMm
    : Number.isFinite(weather?.precip_mm) ? weather.precip_mm : 0
  // ~6 cm of stage rise per mm of catchment rain — moderate response.
  const precipBonus = Math.round(precipMm * 6)

  // ── Spring snowmelt impact (only relevant when warm above 5°C) ──────────
  const t = Number.isFinite(weather?.tempC) ? weather.tempC : 0
  const meltBonus = t > 5 ? Math.round(Math.min(25, (t - 5) * 1.2)) : 0

  // ── 24-hour delta ────────────────────────────────────────────────────────
  // Base: deterministic seasonal noise (-5..+5 cm).
  // Plus the same precip contribution → today's bonus is also today's "delta".
  const trendNoise = ((stableHash(station.id + '|d') % 11) - 5)
  const delta = trendNoise + precipBonus + meltBonus

  const level = baseline + precipBonus + meltBonus

  // ── Thresholds relative to baseline ──────────────────────────────────────
  const warning  = baseline + 120
  const danger   = baseline + 220

  return {
    level,
    delta,
    warning,
    danger,
    status:    classifyStatus(level, warning, danger),
    simulated: true,
    weatherSnap: {
      tempC:         weather?.tempC ?? null,
      precipMm,
      conditionText: weather?.conditionText ?? null,
    },
    fetchedAt: Date.now(),
  }
}

/**
 * Public API — kept identical in shape to the previous version so existing
 * UI code keeps working. The `urlPath` argument is now used purely as a
 * cache key + station-lookup; we don't actually hit allrivers.
 *
 * Always succeeds (no more "Failed to fetch") because the underlying
 * weather lookup is cached + can fall back to a zero-precip baseline.
 */
export async function fetchHydroDataFromPage(urlPath) {
  if (!urlPath) throw new Error('urlPath is required')

  const cached = readCache(urlPath)
  if (cached) return { ...cached, fromCache: true }

  // Find the station in our local catalogue
  const station = allHydroStations.find(s => s.urlPath === urlPath)
  if (!station) {
    // Unknown station — fall back to a coords-less placeholder so callers
    // don't crash. Marked simulated and noData to tell the UI honestly.
    const fallback = {
      level: null, delta: null, warning: null, danger: null,
      status: 'normal', simulated: true, noData: true,
      reason: 'station not in catalogue',
      fetchedAt: Date.now(),
    }
    writeCache(urlPath, fallback)
    return fallback
  }

  try {
    const data = await modelLevelFromWeather(station)
    writeCache(urlPath, data)
    return data
  } catch (err) {
    // WeatherAPI failed — produce baseline-only output rather than failing
    const idHash = stableHash(station.id)
    const baseline = 120 + (idHash % 261)
    const data = {
      level:    baseline,
      delta:    0,
      warning:  baseline + 120,
      danger:   baseline + 220,
      status:   'normal',
      simulated: true,
      weatherSnap: null,
      reason:   'weather lookup failed, baseline only',
      fetchedAt: Date.now(),
    }
    writeCache(urlPath, data)
    return data
  }
}

export const __internal = { modelLevelFromWeather, stableHash }
