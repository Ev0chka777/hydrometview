import { useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  X, User, Star, Bell, Lightbulb, Radio, HelpCircle, Settings,
  Home, Map as MapIcon, CloudSun, LogOut, BarChart3, ArrowRightLeft,
  Sun, Moon,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'

// Slide-in drawer that opens from the burger button in the mobile header.
// Mirrors all routes the desktop header exposes via the dropdown menus.
const SECTIONS = [
  {
    label: 'Навигация',
    items: [
      { to: '/',                Icon: Home,       label: 'Главная' },
      { to: '/map',             Icon: MapIcon,    label: 'Карта' },
      { to: '/weather',         Icon: CloudSun,        label: 'Погода' },
      { to: '/compare',         Icon: ArrowRightLeft,  label: 'Сравнить города' },
      { to: '/charts',          Icon: BarChart3,       label: 'Графики' },
    ],
  },
  {
    label: 'Профиль',
    items: [
      { to: '/profile',         Icon: User,       label: 'Личный кабинет' },
      { to: '/favorites',       Icon: Star,       label: 'Избранное' },
      { to: '/alerts',          Icon: Bell,       label: 'Оповещения' },
      { to: '/recommendations', Icon: Lightbulb,  label: 'Рекомендации' },
      { to: '/stations',        Icon: Radio,      label: 'Станции' },
      { to: '/settings',        Icon: Settings,   label: 'Настройки' },
      { to: '/faq',             Icon: HelpCircle, label: 'О проекте' },
    ],
  },
]

export default function MobileMenu({ open, onClose }) {
  const { isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const location = useLocation()
  const drawerRef = useRef(null)
  useFocusTrap(open, drawerRef)

  // Close drawer on route change
  useEffect(() => { if (open) onClose() /* eslint-disable-next-line */ }, [location.pathname])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          'lg:hidden fixed inset-0 z-[9500] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Главное меню навигации"
        aria-hidden={!open}
        className={clsx(
          'lg:hidden fixed top-0 left-0 bottom-0 z-[9600] w-[82%] max-w-sm overflow-y-auto',
          'bg-white dark:bg-[#0A1428] border-r border-slate-200/70 dark:border-white/[0.06]',
          'shadow-2xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/[0.06]">
          <span className="text-base font-semibold text-slate-900 dark:text-white">Меню</span>
          <button
            onClick={onClose}
            aria-label="Закрыть меню"
            className="w-9 h-9 rounded-full flex items-center justify-center
                       bg-slate-100 hover:bg-slate-200 text-slate-700
                       dark:bg-[#1A2540] dark:hover:bg-[#22305A] dark:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-2">
          {SECTIONS.map(section => (
            <div key={section.label} className="py-2">
              <div className="px-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                {section.label}
              </div>
              <ul>
                {section.items.map(({ to, Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) => clsx(
                        'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 text-[#2F80FF] dark:bg-blue-500/15 dark:text-blue-300 font-medium'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Theme toggle — на десктопе он живёт в header'е, но в мобильной
              шапке нет места, поэтому выносим сюда. Анимированный переключатель
              в стиле iOS, чтобы юзер сразу видел текущее состояние. */}
          <div className="px-5 pt-3 pb-1 border-t border-slate-200/70 dark:border-white/[0.06] mt-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">
              Оформление
            </div>
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl transition-colors
                         bg-slate-50 hover:bg-slate-100
                         dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                {isDark
                  ? <Moon className="w-4 h-4 text-blue-400" strokeWidth={2.2} />
                  : <Sun  className="w-4 h-4 text-amber-500" strokeWidth={2.2} />}
                {isDark ? 'Тёмная тема' : 'Светлая тема'}
              </span>
              {/* iOS-style toggle */}
              <span className={clsx(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                isDark ? 'bg-[#2F80FF]' : 'bg-slate-300',
              )}>
                <span className={clsx(
                  'pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200',
                  isDark ? 'translate-x-5' : 'translate-x-0',
                )} />
              </span>
            </button>
          </div>

          {isAuthenticated && (
            <div className="px-5 pt-3 pb-6 border-t border-slate-200/70 dark:border-white/[0.06] mt-2">
              <button
                onClick={() => { logout(); navigate('/auth') }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold
                           bg-red-50 text-red-600 hover:bg-red-100
                           dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4" strokeWidth={2.2} />
                Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
