import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchCityWeather } from '../services/weatherService'

const DEFAULT_CITY = 'Москва'

const WeatherContext = createContext({
  activeCity:      DEFAULT_CITY,
  currentWeather:  null,
  hourlyForecast:  [],
  forecastDays:    [],
  isLoading:       false,
  error:           null,
  selectedLocation: null,
  changeCity:      async () => {},
  selectLocation:  () => {},
  refresh:         async () => {},
})

export function WeatherProvider({ children, initialCity = DEFAULT_CITY }) {
  const [activeCity,     setActiveCity]     = useState(initialCity)
  const [currentWeather, setCurrentWeather] = useState(null)
  const [hourlyForecast, setHourlyForecast] = useState([])
  const [forecastDays,   setForecastDays]   = useState([])
  const [weatherAlerts,  setWeatherAlerts]  = useState([])
  const [isLoading,      setIsLoading]      = useState(false)
  const [error,          setError]          = useState(null)
  // Wall-clock timestamp of the most recent successful fetch — used by UI
  // to render "обновлено N минут назад" honestly instead of hardcoded text.
  const [lastUpdated,    setLastUpdated]    = useState(null)
  // One-shot channel for "the user picked a place in the search box".
  // WeatherMap subscribes to it, performs flyTo + opens a popup. Stored
  // as a fresh object reference even when the same city is re-selected,
  // so dependent effects fire each time.
  const [selectedLocation, setSelectedLocation] = useState(null)

  // Single source of truth for "go fetch and replace everything for {city}".
  //
  // `query` is what WeatherAPI's `q` parameter receives — a name ("Москва"),
  // a "lat,lon" string, etc. `displayName` is what the UI shows; defaults
  // to `query` for backward compatibility. Coord-based queries from the
  // autocomplete pass a friendly name so headings still read "Казань",
  // not "55.7,49.1".
  const changeCity = useCallback(async (query, opts = {}) => {
    if (!query) return
    const displayName = opts.displayName ?? query
    setIsLoading(true)
    setError(null)
    setActiveCity(displayName)
    try {
      const { current, hourly, days, alerts } = await fetchCityWeather(query)
      setCurrentWeather(current)
      setHourlyForecast(hourly)
      setForecastDays(days)
      setWeatherAlerts(alerts ?? [])
      setLastUpdated(Date.now())
    } catch (e) {
      setError(e.message || 'Не удалось загрузить погоду')
      setCurrentWeather(null)
      setHourlyForecast([])
      setForecastDays([])
      setWeatherAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch on first mount.
  useEffect(() => {
    changeCity(initialCity)
    // initialCity is intentionally captured at mount; subsequent updates
    // happen via changeCity() from UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = useCallback(() => changeCity(activeCity), [activeCity, changeCity])

  /**
   * Broadcast a selected place to map-side subscribers.
   * @param {{ id: string, nameRu: string, lat: number, lng: number } | null} loc
   */
  const selectLocation = useCallback((loc) => {
    // Stamp with `pickedAt` so reselecting the same city yields a new ref
    // and downstream useEffect deps fire.
    setSelectedLocation(loc ? { ...loc, pickedAt: Date.now() } : null)
  }, [])

  return (
    <WeatherContext.Provider
      value={{ activeCity, currentWeather, hourlyForecast, forecastDays, weatherAlerts, isLoading, error, lastUpdated, selectedLocation, changeCity, selectLocation, refresh }}
    >
      {children}
    </WeatherContext.Provider>
  )
}

export const useWeather = () => useContext(WeatherContext)
