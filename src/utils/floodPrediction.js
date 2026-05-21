// Extrapolate the next 48 hours of water level based on:
//   • current level (from hydropost model)
//   • cumulative precipitation in the next 48 h (from WeatherAPI hourly)
//   • warming trend (snowmelt approximation)
// Uses the same coefficients as the hydropost model so predictions are
// consistent with what users see "now".

const CM_PER_MM_RAIN = 6     // 1 mm rain ≈ 6 cm stage rise (catchment-averaged)
const CM_PER_DEG_C   = 1.2   // each °C above +5 ≈ 1.2 cm/day extra melt
const MAX_MELT_CM    = 25    // cap snowmelt contribution per day

/**
 * @param {{ level, warning, danger }} currentHydro — output of fetchHydroDataFromPage
 * @param {Array<{ tempC, precipMm?, totalPrecipMm? }>} hourly48
 * @returns {{
 *   predictedLevel: number,           // cm after 48h
 *   predictedDelta: number,           // delta from current
 *   rainTotalMm: number,              // sum over the window
 *   warmingDeltaCm: number,           // melt contribution
 *   floodProbability: number,         // 0..100 %
 *   willCrossWarning: boolean,
 *   willCrossDanger: boolean,
 *   horizonHours: number,             // actually used (≤ 48)
 *   verdict: 'normal' | 'watch' | 'warning' | 'critical',
 * } | null}
 */
export function predictFloodLevel(currentHydro, hourly48 = []) {
  if (!currentHydro || currentHydro.level == null) return null
  const horizon = Math.min(48, hourly48.length)
  if (horizon === 0) return null

  // Sum rain across the prediction window. WeatherAPI's hour.precip_mm is
  // per-hour mm, summing gives 48h cumulative directly.
  let rainTotalMm = 0
  let avgTempAbove5 = 0
  let warmHours = 0
  for (let i = 0; i < horizon; i++) {
    const h = hourly48[i]
    const mm = h?.precipMm ?? h?.precip_mm ?? 0
    rainTotalMm += Number.isFinite(mm) ? mm : 0
    const t = h?.tempC
    if (Number.isFinite(t) && t > 5) { avgTempAbove5 += (t - 5); warmHours++ }
  }

  // Daily-average melt → scaled by horizon
  const dailyMelt = warmHours > 0
    ? Math.min(MAX_MELT_CM, (avgTempAbove5 / warmHours) * CM_PER_DEG_C)
    : 0
  const warmingDeltaCm = (dailyMelt * horizon) / 24

  const precipDeltaCm = rainTotalMm * CM_PER_MM_RAIN
  const predictedDelta = Math.round(precipDeltaCm + warmingDeltaCm)
  const predictedLevel = Math.round(currentHydro.level + predictedDelta)

  const warning = currentHydro.warning ?? Infinity
  const danger  = currentHydro.danger  ?? Infinity
  const willCrossWarning = predictedLevel >= warning && currentHydro.level < warning
  const willCrossDanger  = predictedLevel >= danger  && currentHydro.level < danger

  // Probability — same scale as RecommendationsPage floodProb:
  // baseline + position-vs-thresholds + delta velocity
  let p = 5
  if (predictedLevel >= danger)        p = 90
  else if (predictedLevel >= warning)  p = 55 + ((predictedLevel - warning) / Math.max(1, danger - warning)) * 30
  else                                 p = 5  + ((predictedLevel) / Math.max(1, warning)) * 25
  if (predictedDelta > 0)              p += Math.min(15, predictedDelta * 0.3)
  if (rainTotalMm > 5)                 p += Math.min(15, rainTotalMm * 0.6)
  const floodProbability = Math.round(Math.min(100, Math.max(0, p)))

  let verdict = 'normal'
  if (predictedLevel >= danger)  verdict = 'critical'
  else if (predictedLevel >= warning) verdict = 'warning'
  else if (rainTotalMm > 15 || predictedDelta > 20) verdict = 'watch'

  return {
    predictedLevel,
    predictedDelta,
    rainTotalMm: Math.round(rainTotalMm * 10) / 10,
    warmingDeltaCm: Math.round(warmingDeltaCm),
    floodProbability,
    willCrossWarning,
    willCrossDanger,
    horizonHours: horizon,
    verdict,
  }
}
