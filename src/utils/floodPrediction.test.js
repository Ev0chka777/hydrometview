import { describe, it, expect } from 'vitest'
import { predictFloodLevel } from './floodPrediction'

const makeHourly = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))

describe('predictFloodLevel', () => {
  it('returns null without current hydro data', () => {
    expect(predictFloodLevel(null, [])).toBeNull()
    expect(predictFloodLevel({}, [])).toBeNull()
  })

  it('returns null with no hourly forecast', () => {
    expect(predictFloodLevel({ level: 100 }, [])).toBeNull()
  })

  it('predicts stable level when no rain and cold temps', () => {
    const hourly = makeHourly(48, () => ({ tempC: -5, precipMm: 0 }))
    const out = predictFloodLevel(
      { level: 100, warning: 300, danger: 450 },
      hourly,
    )
    expect(out.predictedDelta).toBe(0)
    expect(out.predictedLevel).toBe(100)
    expect(out.verdict).toBe('normal')
    expect(out.willCrossWarning).toBe(false)
    expect(out.willCrossDanger).toBe(false)
  })

  it('accumulates rain into a meaningful stage rise', () => {
    // 48h × 2 mm/h = 96 mm → 96 * 6 = 576 cm delta
    const hourly = makeHourly(48, () => ({ tempC: 0, precipMm: 2 }))
    const out = predictFloodLevel(
      { level: 100, warning: 300, danger: 450 },
      hourly,
    )
    expect(out.rainTotalMm).toBeCloseTo(96, 0)
    expect(out.predictedDelta).toBeGreaterThanOrEqual(500)
    expect(out.willCrossWarning).toBe(true)
    expect(out.willCrossDanger).toBe(true)
    expect(out.verdict).toBe('critical')
    expect(out.floodProbability).toBe(100)
  })

  it('adds snowmelt contribution when warm and above +5°C', () => {
    const hourly = makeHourly(48, () => ({ tempC: 12, precipMm: 0 }))
    const out = predictFloodLevel(
      { level: 100, warning: 300, danger: 450 },
      hourly,
    )
    // 12-5 = 7 deg above; warmingDeltaCm should be > 0 and capped reasonably
    expect(out.warmingDeltaCm).toBeGreaterThan(0)
    expect(out.warmingDeltaCm).toBeLessThanOrEqual(50)
  })

  it('flags "watch" when there is meaningful rain but no threshold crossing', () => {
    const hourly = makeHourly(48, () => ({ tempC: 0, precipMm: 0.5 }))  // 24 mm total
    const out = predictFloodLevel(
      { level: 100, warning: 9999, danger: 9999 },
      hourly,
    )
    expect(out.willCrossWarning).toBe(false)
    expect(out.verdict).toBe('watch')
  })

  it('respects horizon when fewer than 48 hours are available', () => {
    const hourly = makeHourly(12, () => ({ tempC: 10, precipMm: 1 }))
    const out = predictFloodLevel(
      { level: 100, warning: 300, danger: 450 },
      hourly,
    )
    expect(out.horizonHours).toBe(12)
  })

  it('clamps flood probability to [0, 100]', () => {
    const hourly = makeHourly(48, () => ({ tempC: 25, precipMm: 50 }))
    const out = predictFloodLevel(
      { level: 100, warning: 300, danger: 450 },
      hourly,
    )
    expect(out.floodProbability).toBeLessThanOrEqual(100)
    expect(out.floodProbability).toBeGreaterThanOrEqual(0)
  })
})
