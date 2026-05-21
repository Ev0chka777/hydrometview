import { useEffect } from 'react'

/**
 * Trap keyboard focus inside a container while it's active.
 * Standard pattern for modals/drawers per WAI-ARIA Authoring Practices.
 *
 * Behaviour:
 *   • On activation: moves focus to the first focusable child
 *   • Tab from last focusable → loops back to first
 *   • Shift+Tab from first → loops to last
 *   • On deactivation: restores focus to whatever was focused before
 *
 * @param {boolean} active
 * @param {React.RefObject<HTMLElement>} containerRef
 */
export function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const container = containerRef.current
    const previouslyFocused = document.activeElement

    const getFocusables = () => Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]),' +
      'select:not([disabled]), textarea:not([disabled]),' +
      '[tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null)   // visible only

    const focusables = getFocusables()
    if (focusables[0]) focusables[0].focus()

    function handler(e) {
      if (e.key !== 'Tab') return
      const list = getFocusables()
      if (list.length === 0) return
      const first = list[0]
      const last  = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    container.addEventListener('keydown', handler)
    return () => {
      container.removeEventListener('keydown', handler)
      // Restore previous focus when trap deactivates (e.g., modal closes)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus() } catch {}
      }
    }
  }, [active])
}
