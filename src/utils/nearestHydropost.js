// Find the nearest hydropost from all_stations.json to a given lat/lng.
// Used by WeatherPage and RecommendationsPage to show the water-level
// widget for the river closest to the currently active city.

import allHydroStations from '../data/all_stations.json'

// Haversine distance (km) between two [lat, lng] pairs.
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Returns the nearest hydropost to the given coordinates, with its distance
 * in kilometers, or null if `all_stations.json` is empty or coords missing.
 */
export function findNearestHydropost(lat, lng) {
  const list = findNearestHydroposts(lat, lng, 1)
  return list[0] ?? null
}

/**
 * Returns the top-N nearest hydroposts sorted by distance.
 * Useful for "try the closest few until one has live data" fallback.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} count — how many to return
 * @returns {Array<{ station: object, distanceKm: number }>}
 */
export function findNearestHydroposts(lat, lng, count = 5) {
  if (lat == null || lng == null) return []
  if (!allHydroStations.length) return []
  // For huge lists this is O(N) per call but that's ~1500 ops — negligible.
  return allHydroStations
    .map(st => ({ station: st, distanceKm: haversineKm(lat, lng, st.lat, st.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count)
}
