import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import FloodAlertBanner from './components/FloodAlertBanner'
import OnboardingTour from './components/OnboardingTour'
import RouteLoader from './components/RouteLoader'
import RouteAnnouncer from './components/RouteAnnouncer'
import { useTheme } from './theme/ThemeContext'
import { useAuth } from './auth/AuthContext'

// ─── Lazy routes — each page becomes its own JS chunk ─────────────────────
// Initial paint only ships the app shell (~Header/BottomNav/Banner) + the
// shared vendor chunks. Route code arrives on demand and is cached by the
// browser + our Service Worker for instant repeat visits.
const Dashboard           = lazy(() => import('./pages/Dashboard'))
const WeatherPage         = lazy(() => import('./pages/WeatherPage'))
const FavoritesPage       = lazy(() => import('./pages/FavoritesPage'))
const AlertsPage          = lazy(() => import('./pages/AlertsPage'))
const MapPage             = lazy(() => import('./pages/MapPage'))
const StationsPage        = lazy(() => import('./pages/StationsPage'))
const SettingsPage        = lazy(() => import('./pages/SettingsPage'))
const ChartsPage          = lazy(() => import('./pages/ChartsPage'))
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'))
const AuthPage            = lazy(() => import('./pages/AuthPage'))
const FaqPage             = lazy(() => import('./pages/FaqPage'))
const ProfilePage         = lazy(() => import('./pages/ProfilePage'))
const ComparePage         = lazy(() => import('./pages/ComparePage'))
const HydropostDetailPage = lazy(() => import('./pages/HydropostDetailPage'))

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }
  return children
}

export default function App() {
  const { theme } = useTheme()

  // ─── Idle-time preload of likely-next routes ────────────────────────────
  // After first paint, when the browser is idle, prefetch the heaviest /
  // most-visited routes so subsequent navigations feel instant. Avoids the
  // "click → 200 ms blank skeleton" UX cost of pure on-demand loading.
  useEffect(() => {
    const preload = () => {
      import('./pages/Dashboard')
      import('./pages/MapPage')
      import('./pages/WeatherPage')
      import('./pages/RecommendationsPage')
    }
    const ric = typeof window !== 'undefined' && window.requestIdleCallback
    if (ric) ric(preload, { timeout: 2000 })
    else setTimeout(preload, 1500)
  }, [])

  return (
    <div
      className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-[#EEF2F8] dark:bg-[#0A1428] text-slate-900 dark:text-slate-100 transition-colors duration-200`}
    >
      {/* Skip link for keyboard users — first focusable on the page */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only"
      >
        Перейти к основному содержимому
      </a>

      <RouteAnnouncer />
      <Header />
      <FloodAlertBanner />
      <main id="main-content" className="px-4 lg:px-8 pb-24 lg:pb-8 pt-4" tabIndex={-1}>
        {/* pb-24 leaves room for the mobile BottomNav (~64px) */}
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/weather" element={<RequireAuth><WeatherPage /></RequireAuth>} />
            <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
            <Route path="/hydro" element={<Navigate to="/favorites" replace />} />
            <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
            <Route path="/alerts" element={<RequireAuth><AlertsPage /></RequireAuth>} />
            <Route path="/stations" element={<RequireAuth><StationsPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/charts" element={<RequireAuth><ChartsPage /></RequireAuth>} />
            <Route path="/recommendations" element={<RequireAuth><RecommendationsPage /></RequireAuth>} />
            <Route path="/compare" element={<RequireAuth><ComparePage /></RequireAuth>} />
            <Route path="/post/:id" element={<RequireAuth><HydropostDetailPage /></RequireAuth>} />
            <Route path="/faq" element={<FaqPage />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
      <OnboardingTour />
    </div>
  )
}
