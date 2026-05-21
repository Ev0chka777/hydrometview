import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Sun, Moon, LogOut, Bell, AlertTriangle, Info,
  User, Star, Lightbulb, Radio, HelpCircle, Settings, ChevronDown,
  Menu, Search as SearchIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTheme } from '../theme/ThemeContext'
import { useAuth } from '../auth/AuthContext'
import { useNotificationCenter } from '../notifications/NotificationCenterContext'
import logo from '../assets/logo.svg'
import CitySearch from './CitySearch'
import MobileMenu from './MobileMenu'

const navItems = [
  { to: '/weather', label: 'Погода' },
  { to: '/map', label: 'Карта' },
  { to: '/compare', label: 'Сравнить' },
]

const dropdownItems = [
  { to: '/profile', label: 'Личный кабинет', Icon: User },
  { to: '/favorites', label: 'Избранное', Icon: Star },
  { to: '/alerts', label: 'Оповещения', Icon: Bell },
  { to: '/recommendations', label: 'Рекомендации', Icon: Lightbulb },
  { to: '/stations', label: 'Станции', Icon: Radio },
  { to: '/faq', label: 'О проекте', Icon: HelpCircle },
  { to: '/settings', label: 'Настройки', Icon: Settings },
]

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)  // mobile: collapsed search
  const notifRef = useRef(null)
  const profileRef = useRef(null)
  // Real history from the cross-app NotificationCenter — populated by
  // useFloodAlerts (favourites going critical) and OfficialAlertsBanner
  // (national met service storm/flood alerts). Falls back to an empty list
  // gracefully — the dropdown renders an "no alerts yet" empty state.
  const { notifications, unreadCount, markRead, markAllRead, clear } = useNotificationCenter()
  const recentAlerts = notifications.slice(0, 6)

  useEffect(() => {
    if (!notifOpen && !profileOpen) return
    function handleClickOutside(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [notifOpen, profileOpen])

  const displayName = user?.name
    ? `${user.name}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email

  return (
    <>
    <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    <header
      aria-label="Шапка сайта"
      className="sticky top-0 z-[9999] w-full px-4 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-6 transition-colors duration-200
                 bg-white/85 dark:bg-[#0A1428]/85 backdrop-blur-md
                 border-b border-slate-200/70 dark:border-white/[0.04]
                 shadow-sm dark:shadow-none"
    >
      {/* Mobile burger */}
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Открыть меню"
        className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center
                   bg-slate-100 hover:bg-slate-200
                   dark:bg-[#1A2540]/90 dark:hover:bg-[#22305A]
                   border border-slate-200 dark:border-[#2A3754]
                   text-slate-700 dark:text-slate-200 transition-colors"
      >
        <Menu className="w-4 h-4" strokeWidth={2.2} />
      </button>

      <NavLink to="/" className="flex items-center gap-2 lg:gap-3 shrink-0">
        <img
          src={logo}
          alt="HydroMetView"
          className="h-8 w-8 lg:h-10 lg:w-10 object-contain"
        />
        <span className="text-base lg:text-xl font-semibold tracking-tight text-slate-900 dark:text-white transition-colors duration-200">
          HydroMetView
        </span>
      </NavLink>

      {/* Desktop: full search input always visible */}
      <div className="hidden lg:block flex-1 max-w-2xl mx-auto">
        <CitySearch />
      </div>
      {/* Mobile: spacer pushes right cluster to edge */}
      <div className="flex-1 lg:hidden" />

      {/* Mobile: search button toggles a full-width search overlay below header */}
      <button
        onClick={() => setSearchOpen(o => !o)}
        aria-label="Поиск города"
        className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center
                   bg-slate-100 hover:bg-slate-200
                   dark:bg-[#1A2540]/90 dark:hover:bg-[#22305A]
                   border border-slate-200 dark:border-[#2A3754]
                   text-slate-700 dark:text-slate-200 transition-colors"
      >
        <SearchIcon className="w-4 h-4" strokeWidth={2.2} />
      </button>

      <nav className="hidden xl:flex items-center gap-1 text-sm">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-full transition-colors',
                isActive
                  ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="hidden lg:flex items-center gap-3 shrink-0">
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
          title={isDark ? 'Светлая тема' : 'Темная тема'}
          className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                     bg-slate-100 hover:bg-slate-200
                     dark:bg-[#1A2540]/90 dark:hover:bg-[#22305A]
                     border border-slate-200 dark:border-[#2A3754]
                     text-slate-700 dark:text-slate-200"
        >
          <Sun
            className={clsx(
              'w-4 h-4 absolute transition-all duration-300',
              isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
            )}
            strokeWidth={2.2}
          />
          <Moon
            className={clsx(
              'w-4 h-4 absolute transition-all duration-300',
              isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
            )}
            strokeWidth={2.2}
          />
        </button>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
            aria-label="Оповещения"
            aria-haspopup="true"
            aria-expanded={notifOpen}
            title="Оповещения"
            className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                       bg-slate-100 hover:bg-slate-200
                       dark:bg-[#1A2540]/90 dark:hover:bg-[#22305A]
                       border border-slate-200 dark:border-[#2A3754]
                       text-slate-700 dark:text-slate-200"
          >
            <Bell className="w-4 h-4" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-white dark:ring-[#0A1428]" />
            )}
          </button>

          <div
            className={clsx(
              'absolute right-0 mt-2 w-80 origin-top-right rounded-2xl overflow-hidden transition-all duration-200 z-50',
              'bg-white dark:bg-[#131E36]',
              'border border-slate-200/70 dark:border-white/[0.06]',
              'shadow-xl shadow-slate-900/[0.08] dark:shadow-black/40',
              notifOpen
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
            )}
            role="menu"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200/70 dark:border-white/[0.06]">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Оповещения</div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
                                   bg-red-50 text-red-600
                                   dark:bg-red-500/15 dark:text-red-300">
                    {unreadCount} новых
                  </span>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Отметить всё прочитанным"
                    className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    Прочитать всё
                  </button>
                )}
              </div>
            </div>

            <ul className="max-h-80 overflow-y-auto py-1">
              {recentAlerts.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Здесь появятся уведомления о&nbsp;паводках и&nbsp;штормах
                </li>
              ) : recentAlerts.map(n => {
                const color =
                  n.kind === 'flood'
                    ? 'text-red-500 bg-red-50 dark:bg-red-500/15 dark:text-red-300'
                    : n.kind === 'storm'
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'text-blue-500 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-300'
                const Icon = n.kind === 'info' ? Info : AlertTriangle
                const onClick = () => {
                  markRead(n.id)
                  setNotifOpen(false)
                  // Deep-link if we know the station; otherwise go to the Alerts list.
                  navigate(n.stationId ? `/post/${n.stationId}` : '/alerts')
                }
                return (
                  <li key={n.id}>
                    <button
                      onClick={onClick}
                      className={clsx(
                        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors',
                        'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                        !n.read && 'bg-blue-50/40 dark:bg-blue-500/[0.05]',
                      )}
                    >
                      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', color)}>
                        <Icon className="w-4 h-4" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2F80FF] shrink-0" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatDistanceToNow(n.timestamp, { addSuffix: true, locale: ru })}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex border-t border-slate-200/70 dark:border-white/[0.06]">
              <button
                onClick={() => { setNotifOpen(false); navigate('/alerts') }}
                className="flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors
                           text-[#2F80FF] hover:bg-blue-50
                           dark:text-blue-300 dark:hover:bg-white/[0.04]"
              >
                Все оповещения
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Очистить историю уведомлений?')) clear() }}
                  title="Очистить историю"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors
                             text-slate-500 hover:bg-slate-50 hover:text-slate-700
                             dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200
                             border-l border-slate-200/70 dark:border-white/[0.06]"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
              aria-haspopup="true"
              aria-expanded={profileOpen}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-colors duration-200
                         bg-slate-100 hover:bg-slate-200
                         dark:bg-[#1A2540]/90 dark:hover:bg-[#22305A]
                         border border-slate-200 dark:border-[#2A3754]"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] flex items-center justify-center text-white text-xs font-bold">
                  {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
                {displayName}
              </span>
              <ChevronDown
                className={clsx(
                  'w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200',
                  profileOpen && 'rotate-180'
                )}
                strokeWidth={2.2}
              />
            </button>

            <div
              className={clsx(
                'absolute right-0 mt-2 w-72 origin-top-right rounded-2xl overflow-hidden transition-all duration-200 z-50',
                'bg-white dark:bg-[#131E36]',
                'border border-slate-200/70 dark:border-white/[0.06]',
                'shadow-xl shadow-slate-900/[0.08] dark:shadow-black/40',
                profileOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
              )}
              role="menu"
            >
              <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] flex items-center justify-center text-white text-sm font-bold">
                    {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {displayName || 'Пользователь'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              <ul className="py-1">
                {dropdownItems.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <button
                      onClick={() => { setProfileOpen(false); navigate(to) }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                                 text-slate-700 dark:text-slate-200
                                 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      role="menuitem"
                    >
                      <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={2.2} />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-200/70 dark:border-white/[0.06]">
                <button
                  onClick={() => { setProfileOpen(false); logout(); navigate('/auth') }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                             text-red-600 dark:text-red-400
                             hover:bg-red-50 dark:hover:bg-red-500/10"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2.2} />
                  Выход из аккаунта
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => navigate('/auth')}
              className="text-sm font-medium px-3 py-2 transition-colors
                         text-slate-600 hover:text-slate-900
                         dark:text-slate-300 dark:hover:text-white"
            >
              Войти
            </button>
            <button
              onClick={() => navigate('/auth', { state: { mode: 'register' } })}
              className="bg-[#2F80FF] hover:bg-[#3a8bff] text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40"
            >
              Регистрация
            </button>
          </>
        )}
      </div>
    </header>

    {/* Mobile-only collapsible search input, slides below the header */}
    {searchOpen && (
      <div className="lg:hidden sticky top-[60px] z-[9998] px-4 py-3
                      bg-white/95 dark:bg-[#0A1428]/95 backdrop-blur-md
                      border-b border-slate-200/70 dark:border-white/[0.06]">
        <CitySearch />
      </div>
    )}
    </>
  )
}
