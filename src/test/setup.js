// Vitest global setup. Wires `@testing-library/jest-dom` matchers (toBeInTheDocument,
// toHaveClass, etc.) and resets the DOM between tests.

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom doesn't ship matchMedia — several of our components (theme detection,
// reduced-motion guards) call it on mount. Provide a deterministic default
// stub so tests don't need to mock it individually.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// IntersectionObserver isn't in jsdom either. A small no-op stub keeps any
// component that lazy-loads on viewport entry from blowing up.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class IO {
    observe()    {}
    unobserve()  {}
    disconnect() {}
    takeRecords() { return [] }
  }
  window.IntersectionObserver = IO
  globalThis.IntersectionObserver = IO
}
