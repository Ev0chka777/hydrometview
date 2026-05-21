import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CloudSun, Waves, Bell, Map,
  Activity, Settings, ChevronLeft, ChevronRight, Droplets
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/weather', icon: CloudSun, label: 'Погода' },
  { to: '/hydro', icon: Waves, label: 'Гидрология' },
  { to: '/map', icon: Map, label: 'Карта' },
  { to: '/alerts', icon: Bell, label: 'Оповещения', badge: 3 },
  { to: '/stations', icon: Activity, label: 'Станции' },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-dark-700',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-hydro-600 flex items-center justify-center shrink-0">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-tight">ГидроМетео</div>
            <div className="text-[10px] text-dark-500 font-medium uppercase tracking-wider">Мониторинг</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx('nav-item relative', isActive && 'active', collapsed && 'justify-center px-0')
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="flex-1 text-sm">{label}</span>}
            {!collapsed && badge && (
              <span className="w-5 h-5 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
            {collapsed && badge && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-dark-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx('nav-item', isActive && 'active', collapsed && 'justify-center px-0')
          }
          title={collapsed ? 'Настройки' : undefined}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Настройки</span>}
        </NavLink>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center hover:bg-dark-600 transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-dark-400" />
          : <ChevronLeft className="w-3 h-3 text-dark-400" />}
      </button>
    </aside>
  )
}
