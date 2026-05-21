import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  NotificationCenterProvider,
  useNotificationCenter,
} from './NotificationCenterContext'

const wrapper = ({ children }) => (
  <NotificationCenterProvider>{children}</NotificationCenterProvider>
)

describe('NotificationCenterContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with an empty history and zero unread', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('push() prepends a record with auto-assigned id + timestamp + read=false', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => {
      result.current.push({ kind: 'flood', title: 'High water', body: 'Moscow river' })
    })
    expect(result.current.notifications).toHaveLength(1)
    const [n] = result.current.notifications
    expect(n.id).toBeTruthy()
    expect(n.kind).toBe('flood')
    expect(n.read).toBe(false)
    expect(typeof n.timestamp).toBe('number')
    expect(result.current.unreadCount).toBe(1)
  })

  it('dedupes identical unread entries fired within 10 minutes', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => {
      result.current.push({ kind: 'storm', title: 'Storm', body: 'A' })
      result.current.push({ kind: 'storm', title: 'Storm', body: 'B' })
    })
    expect(result.current.notifications).toHaveLength(1)
  })

  it('markRead flips a single entry', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => { result.current.push({ kind: 'flood', title: 'X' }) })
    const id = result.current.notifications[0].id

    act(() => { result.current.markRead(id) })
    expect(result.current.notifications[0].read).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAllRead flips every unread entry', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => {
      result.current.push({ kind: 'flood', title: 'A' })
      result.current.push({ kind: 'storm', title: 'B' })
    })
    expect(result.current.unreadCount).toBe(2)
    act(() => { result.current.markAllRead() })
    expect(result.current.unreadCount).toBe(0)
    expect(result.current.notifications.every(n => n.read)).toBe(true)
  })

  it('clear() drops everything', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => {
      result.current.push({ kind: 'flood', title: 'A' })
      result.current.push({ kind: 'storm', title: 'B' })
    })
    act(() => { result.current.clear() })
    expect(result.current.notifications).toEqual([])
  })

  it('persists to localStorage so a fresh provider rehydrates', () => {
    const first = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => { first.result.current.push({ kind: 'flood', title: 'Persisted' }) })

    // Re-render with a fresh provider (simulates page reload)
    const second = renderHook(() => useNotificationCenter(), { wrapper })
    expect(second.result.current.notifications.length).toBeGreaterThanOrEqual(1)
    expect(second.result.current.notifications.some(n => n.title === 'Persisted')).toBe(true)
  })

  it('caps history at the MAX_ENTRIES limit', () => {
    const { result } = renderHook(() => useNotificationCenter(), { wrapper })
    act(() => {
      // Each push has a unique title so dedupe doesn't merge them
      for (let i = 0; i < 60; i++) {
        result.current.push({ kind: 'flood', title: `Alert ${i}` })
      }
    })
    expect(result.current.notifications.length).toBeLessThanOrEqual(50)
  })
})
