import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { FavoritesProvider } from './favorites/FavoritesContext.jsx'
import { SettingsProvider } from './settings/SettingsContext.jsx'
import { WeatherProvider } from './context/WeatherContext.jsx'
import { NotificationCenterProvider } from './notifications/NotificationCenterContext.jsx'
import './index.css'

// ─── PWA Service Worker registration ─────────────────────────────────────────
// Caches the app shell + WeatherAPI responses + map tiles so the app stays
// functional offline. Critical for flood-zone users whose connectivity is
// flaky during emergencies — the very scenario the app is built for.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <SettingsProvider>
            <NotificationCenterProvider>
              <WeatherProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </WeatherProvider>
            </NotificationCenterProvider>
          </SettingsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
