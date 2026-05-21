import { describe, it, expect } from 'vitest'
import { moonPhase, pressureTrend, fishingRating } from './astro'

describe('moonPhase', () => {
  it('returns a phase in [0..7] with the matching label and emoji', () => {
    const m = moonPhase(new Date('2024-01-15'))
    expect(m.phase).toBeGreaterThanOrEqual(0)
    expect(m.phase).toBeLessThanOrEqual(7)
    expect(typeof m.label).toBe('string')
    expect(m.label.length).toBeGreaterThan(0)
    expect(typeof m.emoji).toBe('string')
  })

  it('produces illumination in [0..1]', () => {
    const m = moonPhase(new Date('2024-06-21'))
    expect(m.illumination).toBeGreaterThanOrEqual(0)
    expect(m.illumination).toBeLessThanOrEqual(1)
  })

  it('approximates a known full moon (2024-01-25 ≈ full)', () => {
    const m = moonPhase(new Date('2024-01-25'))
    // Algorithm is ~1 day accurate; full = phase 4.
    expect([3, 4, 5]).toContain(m.phase)
  })
})

describe('pressureTrend', () => {
  it('returns null delta when fewer than 3 points', () => {
    const t = pressureTrend([{ pressureMmHg: 760 }, { pressureMmHg: 761 }])
    expect(t.delta).toBeNull()
    expect(t.direction).toBe('flat')
  })

  it('classifies a stable trend as "flat" when |delta| < 1.5', () => {
    const t = pressureTrend(Array.from({ length: 6 }, () => ({ pressureMmHg: 760.5 })))
    expect(t.direction).toBe('flat')
    expect(t.label).toMatch(/стабильн/i)
  })

  it('detects a rising trend', () => {
    const t = pressureTrend([
      { pressureMmHg: 755 }, { pressureMmHg: 756 }, { pressureMmHg: 757 },
      { pressureMmHg: 758 }, { pressureMmHg: 759 }, { pressureMmHg: 762 },
    ])
    expect(t.direction).toBe('up')
    expect(t.delta).toBeGreaterThan(0)
  })

  it('detects a falling trend', () => {
    const t = pressureTrend([
      { pressureMmHg: 765 }, { pressureMmHg: 763 }, { pressureMmHg: 760 },
      { pressureMmHg: 758 }, { pressureMmHg: 756 }, { pressureMmHg: 755 },
    ])
    expect(t.direction).toBe('down')
    expect(t.delta).toBeLessThan(0)
  })
})

describe('fishingRating', () => {
  it('returns null score with no current weather', () => {
    const r = fishingRating({ current: null })
    expect(r.score).toBeNull()
  })

  it('gives "excellent" for ideal conditions (stable pressure + light wind + new moon)', () => {
    const r = fishingRating({
      current: { windMs: 3, tempC: 18 },
      pressureTrendDir: 'flat',
      moonPhase: 0,
    })
    expect(r.score).toBeGreaterThanOrEqual(75)
    expect(r.label).toBe('отличный')
  })

  it('penalises strong wind heavily', () => {
    const r = fishingRating({
      current: { windMs: 12, tempC: 15 },
      pressureTrendDir: 'flat',
      moonPhase: 2,
    })
    expect(r.score).toBeLessThan(60)
    expect(r.reason).toMatch(/ветер/i)
  })

  it('clamps to [0, 100]', () => {
    const bad = fishingRating({
      current: { windMs: 20, tempC: -20 },
      pressureTrendDir: 'up',
      moonPhase: 2,
    })
    expect(bad.score).toBeGreaterThanOrEqual(0)
    expect(bad.score).toBeLessThanOrEqual(100)
  })
})
