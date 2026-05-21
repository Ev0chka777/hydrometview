import { NavLink } from 'react-router-dom'
import { Home, Map, CloudSun, Lightbulb, User } from 'lucide-react'
import clsx from 'clsx'

// Mobile-only bottom navigation. Hidden on `lg+` viewports.
// 5 main entries cover the highest-traffic routes; everything else lives
// inside the burger drawer (MobileMenu).
const ITEMS = [
  { to: '/',                label: 'Главная',     Icon: Home,      end: true },
  { to: '/map',             label: 'Карта',       Icon: Map },
  { to: '/weather',         label: 'Погода',      Icon: CloudSun },
  { to: '/recommendations', label: 'Советы',      Icon: Lightbulb },
  { to: '/profile',         label: 'Профиль',     Icon: User },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Основная мобильная навигация"
      className="lg:hidden fixed bottom-0 inset-x-0 z-[9000] pb-[max(env(safe-area-inset-bottom),0px)]
                 bg-white/95 dark:bg-[#0A1428]/95 backdrop-blur-md
                 border-t border-slate-200/70 dark:border-white/[0.06]
                 shadow-[0_-4px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >
      <ul className="flex">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => clsx(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors duration-150',
                isActive
                  ? 'text-[#2F80FF] dark:text-blue-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-5 h-5', isActive && 'fill-blue-100 dark:fill-blue-500/20')} strokeWidth={2.2} />
                  <span className={clsx('text-[10px] font-medium', isActive && 'font-semibold')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
