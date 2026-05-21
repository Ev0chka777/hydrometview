import { describe, it, expect } from 'vitest'
import { findNearestHydropost, findNearestHydroposts } from './nearestHydropost'

describe('findNearestHydropost', () => {
  it('returns null for missing coords', () => {
    expect(findNearestHydropost(null, null)).toBeNull()
    expect(findNearestHydropost(undefined, 0)).toBeNull()
  })

  it('returns an object with station + distance for Moscow coords', () => {
    const moscow = findNearestHydropost(55.7558, 37.6173)
    expect(moscow).not.toBeNull()
    expect(moscow.station).toBeDefined()
    expect(moscow.station.id).toBeDefined()
    expect(typeof moscow.distanceKm).toBe('number')
    expect(moscow.distanceKm).toBeGreaterThanOrEqual(0)
    expect(moscow.distanceKm).toBeLessThan(500) // there must be a post within 500km of Moscow
  })

  it('returns results sorted by distance ascending', () => {
    const results = findNearestHydroposts(55.7558, 37.6173, 5)
    expect(results.length).toBeGreaterThan(1)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distanceKm).toBeGreaterThanOrEqual(results[i - 1].distanceKm)
    }
  })

  it('respects the count parameter', () => {
    const three = findNearestHydroposts(55.7558, 37.6173, 3)
    expect(three).toHaveLength(3)
    const one = findNearestHydroposts(55.7558, 37.6173, 1)
    expect(one).toHaveLength(1)
  })

  it('returns empty array for missing coords (not null)', () => {
    expect(findNearestHydroposts(null, null, 5)).toEqual([])
  })
})
