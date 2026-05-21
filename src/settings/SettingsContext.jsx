import { createContext, useContext, useEffect, useState } from 'react'

export const DEFAULT_SETTINGS = {
  units: {
    temp: 'C',          // 'C' | 'F'
    wind: 'ms',         // 'ms' | 'kmh'
    pressure: 'mmHg',   // 'mmHg' | 'hPa'
  },
  language: 'ru',       // 'ru' | 'en'
  // Persona drives which contextual widget shows up on the Dashboard.
  // 'general' = no specialised widget (default until the user picks).
  persona: 'general',   // 'general' | 'fisher' | 'dacha' | 'tourist' | 'flood'
  map: {
    showRiverNames: true,
    markerStyle: 'detailed', // 'simple' | 'detailed'
  },
  notifications: {
    criticalWater: true,
    storm: true,
  },
  geolocation: {
    enabled: false,
    coords: null,       // { lat, lon } | null
    error: null,
  },
  activity: {
    registeredAt: null, // ISO string set on first mount
    hydropostsViewed: 0,
  },
}

const STORAGE_KEY = 'app_settings_v1'

function readStored() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      units: { ...DEFAULT_SETTINGS.units, ...(parsed.units ?? {}) },
      map: { ...DEFAULT_SETTINGS.map, ...(parsed.map ?? {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
      geolocation: { ...DEFAULT_SETTINGS.geolocation, ...(parsed.geolocation ?? {}) },
      activity: { ...DEFAULT_SETTINGS.activity, ...(parsed.activity ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  updateSection: () => {},
  resetSettings: () => {},
  requestGeolocation: () => {},
  disableGeolocation: () => {},
  incrementHydropostsViewed: () => {},
})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(readStored)

  // Set registration date on first ever mount
  useEffect(() => {
    if (!settings.activity.registeredAt) {
      setSettings(s => ({
        ...s,
        activity: { ...s.activity, registeredAt: new Date().toISOString() },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on every change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const updateSettings = (patch) => {
    setSettings(s => ({ ...s, ...patch }))
  }

  const updateSection = (section, patch) => {
    setSettings(s => ({ ...s, [section]: { ...s[section], ...patch } }))
  }

  const resetSettings = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      activity: settings.activity, // keep activity stats across reset
    })
  }

  const requestGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      updateSection('geolocation', { enabled: false, error: 'Geolocation API недоступен' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => updateSection('geolocation', {
        enabled: true,
        coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        error: null,
      }),
      err => updateSection('geolocation', {
        enabled: false,
        coords: null,
        error: err.message || 'Не удалось получить координаты',
      })
    )
  }

  const disableGeolocation = () => {
    updateSection('geolocation', { enabled: false, coords: null, error: null })
  }

  const incrementHydropostsViewed = () => {
    setSettings(s => ({
      ...s,
      activity: { ...s.activity, hydropostsViewed: s.activity.hydropostsViewed + 1 },
    }))
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      updateSection,
      resetSettings,
      requestGeolocation,
      disableGeolocation,
      incrementHydropostsViewed,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
