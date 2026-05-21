import { describe, it, expect } from 'vitest'
import { pickTipOfDay } from './tipOfDay'

describe('pickTipOfDay', () => {
  it('returns a default-shaped tip for empty context', () => {
    const tip = pickTipOfDay({})
    expect(tip).toHaveProperty('title')
    // text is optional only for the generic default — when matched it should exist
    expect(typeof tip.title).toBe('string')
  })

  it('prioritises thunderstorm over other tips', () => {
    const tip = pickTipOfDay({
      conditionText: 'Гроза с дождём',
      tempC: 18,
      humidity: 90,
    })
    expect(tip.id).toBe('thunder')
  })

  it('triggers the critical AQI tip when EPA >= 5', () => {
    const tip = pickTipOfDay({ aqi: { epa: 5, label: 'Очень вредное' } })
    expect(tip.id).toBe('aqi-very-bad')
    expect(tip.text).toMatch(/AQI 5\/6/)
    expect(tip.text).toMatch(/очень вредное/i)
  })

  it('uses a function-based text template with actual values (no NaN)', () => {
    const tip = pickTipOfDay({ precipChance: 75 })
    expect(tip.id).toBe('umbrella')
    expect(tip.text).toMatch(/75%/)
    expect(tip.text).not.toMatch(/NaN/i)
  })

  it('warns about extreme cold based on feels-like, not air temp alone', () => {
    const tip = pickTipOfDay({ tempC: -5, feelsLikeC: -20, windMs: 10 })
    expect(tip.id).toBe('extreme-cold')
  })

  it('warns about extreme heat based on feels-like', () => {
    const tip = pickTipOfDay({ tempC: 25, feelsLikeC: 32 })
    expect(tip.id).toBe('extreme-heat')
  })

  it('warns about high wind once threshold is crossed', () => {
    const tip = pickTipOfDay({ windMs: 14, tempC: 10 })
    expect(tip.id).toBe('high-wind')
  })

  it('triggers the pleasant default for mild, dry weather', () => {
    const tip = pickTipOfDay({
      tempC: 18, feelsLikeC: 18, windMs: 2,
      precipChance: 10, humidity: 50, uv: 3, conditionText: 'Ясно', isDay: true,
    })
    expect(tip.id).toBe('perfect-mild')
  })

  it('does not throw if a tip text fn references missing fields', () => {
    expect(() => pickTipOfDay({ precipChance: null })).not.toThrow()
  })
})
