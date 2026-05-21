// Find the closest hydropost that ACTUALLY has live data.
// Many gauges in all_stations.json are dormant on the source side
// (the page exists but says "Оперативные данные неизвестны"). We try
// the N nearest in parallel and surface the first one with a real level.

import { findNearestHydroposts } from './nearestHydropost'
import { fetchHydroDataFromPage } from '../services/hydroService'

/**
 * @param {number} lat
 * @param {number} lng
 * @param {object} [opts]
 * @param {number} [opts.tries=5]   — how many nearest gauges to probe
 *
 * @returns {Promise<{
 *   nearest: { station, distanceKm },           // first checked (truly closest)
 *   active:  { station, distanceKm, data } | null,  // first with live data
 *   tried:   Array<{ station, distanceKm, status }>,
 * }>}
 */
export async function resolveLiveHydropost(lat, lng, { tries = 5 } = {}) {
  const candidates = findNearestHydroposts(lat, lng, tries)
  if (candidates.length === 0) return { nearest: null, active: null, tried: [] }

  // Probe all in parallel — already cached in LS so repeat calls are free.
  const probes = await Promise.all(candidates.map(async (c) => {
    try {
      const data = await fetchHydroDataFromPage(c.station.urlPath)
      return { ...c, data, status: data.noData ? 'no-data' : 'ok' }
    } catch (e) {
      return { ...c, data: null, status: 'error', error: e.message || 'fetch error' }
    }
  }))

  const active = probes.find(p => p.status === 'ok' && p.data?.level != null) ?? null
  return {
    nearest: candidates[0],
    active,
    tried: probes,
  }
}
