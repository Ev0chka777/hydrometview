// Astro helpers — no external API needed.

// Moon phase approximation (Conway's formula, accurate to ~1 day).
// Returns { phase: 0..7, label, illumination: 0..1 }
//   0=new, 1=waxing crescent, 2=first quarter, 3=waxing gibbous,
//   4=full, 5=waning gibbous, 6=last quarter, 7=waning crescent
const MOON_LABELS = [
  'Новолуние', 'Молодая луна', 'Первая четверть', 'Растущая луна',
  'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна',
]
const MOON_EMOJI = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']

export function moonPhase(date = new Date()) {
  // Conway 1968 algorithm
  let y = date.getFullYear()
  let m = date.getMonth() + 1
  const d = date.getDate()
  if (m < 3) { y -= 1; m += 12 }
  const a = Math.floor(y / 100)
  const b = Math.floor(a / 4)
  const c = 2 - a + b
  const e = Math.floor(365.25 * (y + 4716))
  const f = Math.floor(30.6001 * (m + 1))
  const jd = c + d + e + f - 1524.5
  const daysSinceNew = (jd - 2451549.5) % 29.53059
  const norm = (daysSinceNew + 29.53059) % 29.53059
  const phase = Math.round((norm / 29.53059) * 8) % 8
  // Illumination as cosine wave on phase angle
  const illum = (1 - Math.cos(2 * Math.PI * norm / 29.53059)) / 2
  return {
    phase,
    label: MOON_LABELS[phase],
    emoji: MOON_EMOJI[phase],
    illumination: illum,
    daysSinceNew: norm,
  }
}

/**
 * Classify pressure trend over the past 6 hours of hourly forecast.
 * `hours` — first ≥6 entries are interpreted as the next-6h forecast,
 * which is a fair proxy for "what's coming".
 */
export function pressureTrend(hours = []) {
  const pts = hours.slice(0, 6).map(h => h.pressureMmHg).filter(p => p != null)
  if (pts.length < 3) return { delta: null, label: 'нет данных', direction: 'flat' }
  const delta = pts[pts.length - 1] - pts[0]
  if (Math.abs(delta) < 1.5) return { delta, label: 'стабильное', direction: 'flat' }
  if (delta > 0) return { delta, label: `растёт на +${delta.toFixed(1)} мм`, direction: 'up' }
  return { delta, label: `падает на ${delta.toFixed(1)} мм`, direction: 'down' }
}

/**
 * Simple "fishing rating" heuristic — based on Russian fisher folklore +
 * common pressure/temperature wisdom. Score 0..100, plus a short reason.
 */
export function fishingRating({ current, pressureTrendDir, moonPhase }) {
  if (!current) return { score: null, label: 'нет данных', reason: '' }
  let score = 60   // baseline OK day
  const reasons = []

  // Stable pressure = good
  if (pressureTrendDir === 'flat') { score += 15; reasons.push('стабильное давление') }
  // Falling slowly = good
  if (pressureTrendDir === 'down') { score += 10; reasons.push('давление падает') }
  if (pressureTrendDir === 'up')   { score -= 15; reasons.push('давление растёт') }

  // Wind: 2-5 m/s ideal; calm or strong both bad
  const w = current.windMs ?? 0
  if (w >= 2 && w <= 5)    { score += 10; reasons.push('лёгкий ветерок') }
  else if (w < 1)          { score -= 10; reasons.push('штиль') }
  else if (w > 8)          { score -= 25; reasons.push('сильный ветер') }

  // Moon phase: new and full = best
  if (moonPhase === 0 || moonPhase === 4) { score += 10; reasons.push('фаза луны благоприятна') }

  // Temperature shock — extreme cold/heat reduces activity
  const t = current.tempC ?? 10
  if (t < -5 || t > 28) { score -= 15; reasons.push('экстремальная температура') }

  score = Math.max(0, Math.min(100, score))
  let label = 'неблагоприятный'
  if (score >= 75) label = 'отличный'
  else if (score >= 55) label = 'хороший'
  else if (score >= 35) label = 'средний'
  return { score, label, reason: reasons.slice(0, 3).join(', ') }
}
