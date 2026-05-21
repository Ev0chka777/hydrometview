import { useState } from 'react'
import { MapPin, Waves, CloudSun, AlertTriangle } from 'lucide-react'
import { weatherStations, hydroStations, hydroLevels } from '../data/mockData'
import clsx from 'clsx'
import WeatherMap from '../components/WeatherMap'

// ─── Shared surfaces ──────────────────────────────────────────────────────────
const card =
  'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
  'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

const STATUS_LABEL = { online: 'Онлайн', warning: 'Предупреждение', offline: 'Офлайн', critical: 'Критический' }
const stationStatusColor = { online: '#22c55e', warning: '#f97316', offline: '#94a3b8', critical: '#ef4444' }

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [layer, setLayer] = useState('both')

  const hydroWithStatus = hydroStations.map(hs => {
    const level = hydroLevels.find(h => h.id === hs.id)
    return { ...hs, levelStatus: level?.status || 'normal' }
  })

  return (
    <div className="space-y-6">
      {/* ── Layer switcher ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'both',    label: 'Все станции', icon: MapPin   },
          { key: 'weather', label: 'Метео',        icon: CloudSun },
          { key: 'hydro',   label: 'Гидро',        icon: Waves    },
        ].map(({ key, label, icon: Icon }) => {
          const active = layer === key
          return (
            <button
              key={key}
              onClick={() => setLayer(key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors duration-200',
                active
                  ? 'bg-blue-50 text-[#2F80FF] border-[#2F80FF]/40 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 ' +
                    'dark:bg-[#1A2540]/80 dark:text-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.16] dark:hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2.2} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Map ── */}
      <div className={`${card} rounded-3xl p-4`}>
        <div className="rounded-2xl overflow-hidden" style={{ height: 520 }}>
          <WeatherMap layer={layer} className="w-full h-full" showSearch />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 px-2">
          <LegendDot color="#3b82f6" label="< 0°C" />
          <LegendDot color="#22c55e" label="0–10°C" />
          <LegendDot color="#eab308" label="10–20°C" />
          <LegendDot color="#f97316" label="20–25°C" />
          <LegendDot color="#ef4444" label="> 25°C" />
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0EA5E9] opacity-80" /> Гидро
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2F80FF] opacity-80 ring-2 ring-white" /> Метео
            </span>
          </div>
        </div>
      </div>

      {/* ── Station lists ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(layer === 'both' || layer === 'weather') && (
          <section className={`${card} rounded-3xl p-5`}>
            <h3 className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
              <CloudSun className="w-4 h-4 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.2} />
              Метеостанции
            </h3>
            <div className="space-y-2">
              {weatherStations.map(ws => (
                <div
                  key={ws.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-colors duration-200
                             hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm rotate-45 shrink-0"
                    style={{ background: stationStatusColor[ws.status] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate transition-colors duration-200">
                      {ws.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
                      {ws.city}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-medium transition-colors duration-200',
                      ws.status === 'online' && 'text-emerald-600 dark:text-emerald-400',
                      ws.status === 'warning' && 'text-amber-600 dark:text-amber-400',
                      ws.status === 'offline' && 'text-slate-400 dark:text-slate-500',
                    )}
                  >
                    {STATUS_LABEL[ws.status] ?? ws.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(layer === 'both' || layer === 'hydro') && (
          <section className={`${card} rounded-3xl p-5`}>
            <h3 className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
              <Waves className="w-4 h-4 text-[#0EA5E9] dark:text-sky-300" strokeWidth={2.2} />
              Гидропосты
            </h3>
            <div className="space-y-2">
              {hydroWithStatus.map(hs => (
                <div
                  key={hs.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-colors duration-200
                             hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: hs.levelStatus === 'critical' ? '#ef4444' : hs.levelStatus === 'warning' ? '#f97316' : stationStatusColor[hs.status] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate transition-colors duration-200">
                      {hs.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
                      {hs.river}
                    </div>
                  </div>
                  {hs.levelStatus === 'critical' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" strokeWidth={2.2} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 transition-colors duration-200">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </div>
  )
}
