import { describe, it, expect } from 'vitest'
import { calculateWeatherImpact, IMPACT_LEVEL_LABEL } from './weatherImpact'

describe('calculateWeatherImpact', () => {
  it('returns "low" for benign weather', () => {
    const res = calculateWeatherImpact({
      windKph: 8, humidity: 45, uv: 2, pressureMmHg: 760,
    })
    expect(res.level).toBe('low')
    expect(res.advisories).toHaveLength(1)
  })

  it('escalates to "high" on cold wind + high humidity combo', () => {
    const res = calculateWeatherImpact({
      windKph: 30, humidity: 90, uv: 1, pressureMmHg: 760,
    })
    expect(res.level).toBe('high')
    expect(res.advisories.some(t => /простуды/i.test(t))).toBe(true)
  })

  it('flags high UV separately from wind', () => {
    const res = calculateWeatherImpact({
      windKph: 5, humidity: 40, uv: 9, pressureMmHg: 758,
    })
    expect(res.level).toBe('high')
    expect(res.advisories.some(t => /УФ-индекс/i.test(t))).toBe(true)
  })

  it('detects pressure deviation against 760 mmHg baseline', () => {
    const res = calculateWeatherImpact({
      windKph: 5, humidity: 50, uv: 1, pressureMmHg: 778,
    })
    expect(res.level).toBe('high')
    expect(res.advisories.some(t => /давления/i.test(t))).toBe(true)
  })

  it('accepts pressureMb and converts internally', () => {
    // 1033 mb ≈ 774 mmHg → deviation 14 → medium band
    const res = calculateWeatherImpact({
      windKph: 5, humidity: 50, uv: 1, pressureMb: 1033,
    })
    expect(['medium', 'high']).toContain(res.level)
  })

  it('considers next-12h pressure spread when hourly data provided', () => {
    const res = calculateWeatherImpact(
      { windKph: 5, humidity: 50, uv: 1, pressureMmHg: 762 },
      Array.from({ length: 12 }, (_, i) => ({ pressureMmHg: 762 + (i % 2 ? 5 : -5) })),
    )
    // Spread of 10 → triggers "high" pressure factor
    expect(res.level).toBe('high')
  })

  it('exports human labels for every level', () => {
    expect(IMPACT_LEVEL_LABEL.low).toBe('Низкий')
    expect(IMPACT_LEVEL_LABEL.medium).toBe('Средний')
    expect(IMPACT_LEVEL_LABEL.high).toBe('Высокий')
  })

  it('does not crash on empty input', () => {
    expect(() => calculateWeatherImpact()).not.toThrow()
    expect(calculateWeatherImpact().level).toBe('low')
  })
})
