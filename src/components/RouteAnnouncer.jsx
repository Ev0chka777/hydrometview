import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Map of route → human-readable page title (for tab title + SR announcement).
// SPA route changes don't trigger native page-load announcements, so we
// nudge assistive tech by updating document.title + dropping a polite
// live-region message into the DOM.
const TITLES = {
  '/':                'Главная',
  '/auth':            'Вход в HydroMetView',
  '/weather':         'Погода',
  '/favorites':       'Избранное',
  '/map':             'Карта',
  '/alerts':          'Оповещения',
  '/stations':        'Станции',
  '/settings':        'Настройки',
  '/profile':         'Профиль',
  '/charts':          'Графики',
  '/recommendations': 'Рекомендации',
  '/compare':         'Сравнение городов',
  '/faq':             'О проекте',
}

export default function RouteAnnouncer() {
  const location = useLocation()
  useEffect(() => {
    const page = TITLES[location.pathname] ?? 'Страница'
    document.title = `${page} — HydroMetView`
  }, [location.pathname])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      Открыт раздел: {TITLES[location.pathname] ?? 'страница'}
    </div>
  )
}
