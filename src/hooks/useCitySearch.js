import { useEffect, useRef, useState } from 'react'
import { searchCities } from '../services/weatherService'
import { useWeather } from '../context/WeatherContext'

// WeatherAPI's /search.json caps at 10 results; this slice is a safety net.
const MAX_SUGGESTIONS = 12

/**
 * Shared search-input behaviour for the Header pill (CitySearch.jsx) and
 * the in-map glass overlay (SearchOverlay inside WeatherMap.jsx).
 *
 * Both consumers render different JSX but share:
 *   • 300 ms debounced calls to WeatherAPI /search.json (min 3 chars)
 *   • Russia-only filter (applied inside searchCities)
 *   • Race-condition guard via a `cancelled` flag
 *   • Click-outside + Esc → close dropdown
 *   • Pick → changeCity (Dashboard/WeatherPage updates) + selectLocation
 *           (map flyTo + dynamic marker + auto-open popup) + reset input
 */
export function useCitySearch() {
  const { changeCity, selectLocation } = useWeather()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const wrapperRef = useRef(null)
  const inputRef   = useRef(null)

  // ─── Close on outside click / Esc ──────────────────────────────────────────
  useEffect(() => {
    function onDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // ─── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([]); setError(null); setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      try {
        const list = await searchCities(q)
        if (cancelled) return
        setResults(list.slice(0, MAX_SUGGESTIONS))
      } catch (e) {
        if (cancelled) return
        setError(e.message || 'Ошибка поиска')
        setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  // ─── Selection ─────────────────────────────────────────────────────────────
  const pick = (loc) => {
    const cityObj = {
      id:     `search-${loc.id ?? `${loc.lat}-${loc.lon}`}`,
      name:   loc.name,
      nameRu: loc.name,
      region: loc.region ?? '',
      lat:    loc.lat,
      lng:    loc.lon,
    }
    // Update the global active city (Dashboard, WeatherPage, etc.)
    changeCity(`${loc.lat},${loc.lon}`, { displayName: loc.name })
    // Command the map: flyTo + dynamic marker + auto-open popup
    selectLocation(cityObj)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const clear = () => {
    setQuery(''); setResults([]); setError(null); setOpen(false)
    inputRef.current?.focus()
  }

  return {
    query, setQuery,
    results,
    open, setOpen,
    loading, error,
    pick, clear,
    wrapperRef, inputRef,
  }
}
