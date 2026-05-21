// Geomagnetic Kp index from NOAA Space Weather Prediction Center.
//
// Endpoint:  https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
//            returns an array of { time_tag, kp_index, ... }, last entry
//            is the most recent reading (~1-minute cadence).
//
// CORS:      NOAA serves this with CORS enabled — no proxy needed.
// Cache:     LocalStorage 1 hour (Kp updates slowly, no point in spamming).

const URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
const CACHE_KEY = 'geomag_kp_v1'
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour

function readCache() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw)
    if (Date.now() - savedAt > CACHE_TTL_MS) return null
    return data
  } catch { return null }
}
function writeCache(data) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })) }
  catch { /* quota */ }
}

/**
 * Classify a Kp value into a human-friendly bucket.
 * Standard NOAA G-scale mapping:
 *   Kp 0–3  : calm / unsettled
 *   Kp 4    : active
 *   Kp 5    : G1 minor storm
 *   Kp 6    : G2 moderate storm
 *   Kp 7    : G3 strong storm
 *   Kp 8–9  : G4–G5 severe / extreme storm
 */
export function classifyKp(kp) {
  if (kp == null || Number.isNaN(kp)) return { level: 'unknown', label: 'нет данных', advice: null }
  if (kp <= 3) return {
    level: 'calm',
    label: 'спокойная',
    advice: 'Магнитная обстановка спокойная — метеозависимые могут не беспокоиться.',
  }
  if (kp <= 4) return {
    level: 'active',
    label: 'активная',
    advice: 'Магнитное поле возмущено. Возможна лёгкая усталость у чувствительных людей.',
  }
  if (kp <= 5) return {
    level: 'storm',
    label: 'буря G1',
    advice: 'Геомагнитная буря — у метеозависимых возможны головные боли, скачки давления.',
  }
  if (kp <= 6) return {
    level: 'storm',
    label: 'буря G2',
    advice: 'Умеренная геомагнитная буря — берегите сердечно-сосудистую систему, избегайте перегрузок.',
  }
  return {
    level: 'severe',
    label: kp <= 7 ? 'сильная буря G3' : 'экстремальная буря',
    advice: 'Сильная геомагнитная буря — метеозависимым лучше отложить серьёзные дела, пить больше воды.',
  }
}

/**
 * Fetch the latest planetary Kp index. Returns:
 *   { kp: number, classification: { level, label, advice }, fetchedAt, fromCache }
 * Throws on network / shape errors.
 */
export async function fetchLatestKp() {
  const cached = readCache()
  if (cached) return { ...cached, fromCache: true }

  const res = await fetch(URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`NOAA SWPC ${res.status}`)
  const arr = await res.json()
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('Empty Kp feed')

  const latest = arr[arr.length - 1]
  const kp = Number(latest.kp_index ?? latest.kp ?? NaN)
  const data = {
    kp,
    classification: classifyKp(kp),
    timeTag:        latest.time_tag,
    fetchedAt:      Date.now(),
  }
  writeCache(data)
  return { ...data, fromCache: false }
}
