// Heuristic "weather impact" index — looks at wind, humidity, UV and
// pressure deviation and returns a level (low / medium / high) plus
// localized Russian advisories for display.
//
// The function is pure — accepts a normalized current-weather object
// (the shape returned by normalizeCurrent or fetchCurrentForCity).
// `hourlyForecast` is optional; if supplied, the pressure-trend check
// looks at the next-12h spread instead of just the snapshot deviation.

const PRESSURE_BASELINE_MMHG = 760

/**
 * @typedef {Object} ImpactInput
 * @property {number} [windKph]      — wind speed in km/h
 * @property {number} [humidity]     — % 0..100
 * @property {number} [uv]           — UV index, 0..11+
 * @property {number} [pressureMb]   — millibars (hPa)
 * @property {number} [pressureMmHg] — already in mmHg (alternative to mb)
 * @property {Array<{pressureMmHg?: number}>} [hourlyForecast]
 *
 * @returns {{
 *   level: 'low'|'medium'|'high',
 *   headline: string,
 *   advisories: string[]
 * }}
 */
export function calculateWeatherImpact(currentData = {}, hourlyForecast = []) {
  const factors = []

  // Normalize input — accept either wind_kph (raw) or windKph (normalized)
  const windKph    = currentData.windKph ?? currentData.wind_kph ?? 0
  const humidity   = currentData.humidity ?? 0
  const uv         = currentData.uv ?? 0
  const pressureMmHg = currentData.pressureMmHg
    ?? (currentData.pressureMb ?? currentData.pressure_mb ? (currentData.pressureMb ?? currentData.pressure_mb) / 1.33322 : null)

  // ── 1. Cold-wind risk: strong wind + high humidity ────────────────────────
  if (windKph > 25 && humidity > 80) {
    factors.push({ level: 'high', text: 'Высокий риск простуды: сильный ледяной ветер при высокой влажности. Одевайтесь теплее, защитите дыхательные пути.' })
  } else if (windKph > 25) {
    factors.push({ level: 'medium', text: 'Сильный ветер — возможны порывы. Закрепите предметы на балконе и будьте осторожны на открытых местах.' })
  } else if (humidity > 85 && windKph <= 10) {
    factors.push({ level: 'medium', text: 'Высокая влажность при слабом ветре — переносимость жары/холода усиливается.' })
  }

  // ── 2. UV exposure ────────────────────────────────────────────────────────
  if (uv > 7) {
    factors.push({ level: 'high', text: 'Высокий УФ-индекс — защитите кожу и глаза. SPF 30+, шляпа, солнцезащитные очки.' })
  } else if (uv > 5) {
    factors.push({ level: 'medium', text: 'Повышенный УФ-индекс — рекомендуется солнцезащитный крем при долгом пребывании на солнце.' })
  }

  // ── 3. Pressure: deviation from norm + trend across next 12h ──────────────
  if (pressureMmHg != null) {
    const deviation = Math.abs(pressureMmHg - PRESSURE_BASELINE_MMHG)

    // Trend across the next-12h window if hourly is provided
    let spread = 0
    if (hourlyForecast.length >= 3) {
      const next12 = hourlyForecast.slice(0, 12).map(h => h.pressureMmHg).filter(p => p != null)
      if (next12.length >= 3) {
        spread = Math.max(...next12) - Math.min(...next12)
      }
    }

    if (deviation > 15 || spread > 8) {
      factors.push({ level: 'high', text: 'Резкие перепады давления — возможны головные боли и слабость у метеозависимых людей.' })
    } else if (deviation > 8 || spread > 4) {
      factors.push({ level: 'medium', text: 'Атмосферное давление отклоняется от нормы — возможен дискомфорт у метеочувствительных.' })
    }
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  if (factors.length === 0) {
    return {
      level: 'low',
      headline: 'Погодная нагрузка низкая',
      advisories: ['Погодные факторы спокойные, без значимого влияния на самочувствие.'],
    }
  }

  const hasHigh = factors.some(f => f.level === 'high')
  return {
    level: hasHigh ? 'high' : 'medium',
    headline: hasHigh ? 'Высокий индекс метеочувствительности' : 'Умеренная погодная нагрузка',
    advisories: factors.map(f => f.text),
  }
}

/** UI helpers — keep palette logic out of the component */
export const IMPACT_LEVEL_LABEL = {
  low:    'Низкий',
  medium: 'Средний',
  high:   'Высокий',
}
