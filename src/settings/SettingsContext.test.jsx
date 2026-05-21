import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SettingsProvider, useSettings, DEFAULT_SETTINGS } from './SettingsContext'

const wrapper = ({ children }) => <SettingsProvider>{children}</SettingsProvider>

describe('SettingsContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exposes DEFAULT_SETTINGS on first mount', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.settings.units).toEqual(DEFAULT_SETTINGS.units)
    expect(result.current.settings.language).toBe('ru')
    expect(result.current.settings.persona).toBe('general')
  })

  it('updateSettings shallow-merges top-level keys', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => { result.current.updateSettings({ language: 'en' }) })
    expect(result.current.settings.language).toBe('en')
    // Other top-level keys preserved
    expect(result.current.settings.persona).toBe('general')
  })

  it('updateSection deep-merges into a section without dropping siblings', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => { result.current.updateSection('units', { temp: 'F' }) })
    expect(result.current.settings.units.temp).toBe('F')
    expect(result.current.settings.units.wind).toBe('ms')   // sibling preserved
    expect(result.current.settings.units.pressure).toBe('mmHg')
  })

  it('toggling notifications.criticalWater off keeps storm setting intact', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => { result.current.updateSection('notifications', { criticalWater: false }) })
    expect(result.current.settings.notifications.criticalWater).toBe(false)
    expect(result.current.settings.notifications.storm).toBe(true)
  })

  it('persists changes to localStorage', () => {
    const first = renderHook(() => useSettings(), { wrapper })
    act(() => { first.result.current.updateSettings({ persona: 'fisher' }) })

    // Fresh provider should rehydrate from LS
    const second = renderHook(() => useSettings(), { wrapper })
    expect(second.result.current.settings.persona).toBe('fisher')
  })

  it('disableGeolocation clears coords and error without changing other sections', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.updateSection('geolocation', {
        enabled: true,
        coords: { lat: 55.7, lon: 37.6 },
        error: 'stale',
      })
    })
    act(() => { result.current.disableGeolocation() })
    expect(result.current.settings.geolocation.enabled).toBe(false)
    expect(result.current.settings.geolocation.coords).toBeNull()
    expect(result.current.settings.geolocation.error).toBeNull()
  })

  it('incrementHydropostsViewed bumps the counter monotonically', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    const initial = result.current.settings.activity.hydropostsViewed
    act(() => {
      result.current.incrementHydropostsViewed()
      result.current.incrementHydropostsViewed()
      result.current.incrementHydropostsViewed()
    })
    expect(result.current.settings.activity.hydropostsViewed).toBe(initial + 3)
  })

  it('resetSettings restores defaults but preserves activity stats', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.updateSettings({ persona: 'flood', language: 'en' })
      result.current.incrementHydropostsViewed()
    })
    const visitsBefore = result.current.settings.activity.hydropostsViewed

    act(() => { result.current.resetSettings() })
    expect(result.current.settings.persona).toBe('general')
    expect(result.current.settings.language).toBe('ru')
    // Activity preserved across reset (don't punish curious users)
    expect(result.current.settings.activity.hydropostsViewed).toBe(visitsBefore)
  })

  it('reads stored settings on first mount and merges with defaults for new keys', () => {
    // Simulate an older app version where `persona` didn't exist yet
    localStorage.setItem('app_settings_v1', JSON.stringify({
      language: 'en',
      units: { temp: 'F' },
    }))
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.settings.language).toBe('en')
    expect(result.current.settings.units.temp).toBe('F')
    expect(result.current.settings.units.wind).toBe('ms')       // backfilled default
    expect(result.current.settings.persona).toBe('general')      // backfilled default
    expect(result.current.settings.notifications).toBeDefined()  // backfilled default
  })
})
