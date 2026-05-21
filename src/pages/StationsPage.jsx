import { useMemo, useState } from 'react'
import { CloudSun, Waves, Wifi, Search, MapPin, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import allHydroStations from '../data/all_stations.json'
import { russiaCities } from '../data/russiaCities'

// ─── Shared classes ──────────────────────────────────────────────────────────
const card =
  'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
  'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

const PAGE_SIZE = 50   // how many rows to render at a time (the long lists are 100/1500+)

function StatusDot({ color = 'bg-emerald-500', ping = 'bg-emerald-400' }) {
  return (
    <span className="relative inline-flex shrink-0 h-2.5 w-2.5">
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', ping)} />
      <span className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
export default function StationsPage() {
  const [tab, setTab]       = useState('weather')
  const [search, setSearch] = useState('')

  // ─── Data sources ──────────────────────────────────────────────────────────
  //  • Meteo: top-100 Russian cities (real coords; same source the map uses
  //    for the colored temperature markers).
  //  • Hydro: 1200+ real Roshydromet gauges from all_stations.json — names,
  //    rivers and city locations come from allrivers.info / Nominatim.
  const meteoRows = useMemo(() => russiaCities.map(c => ({
    id:    c.id,
    name:  c.nameRu,
    city:  c.nameRu,
    river: '—',
    lat:   c.lat,
    lng:   c.lng,
  })), [])

  // ─── Search filter ─────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase()

  const meteoFiltered = useMemo(() => {
    if (!q) return meteoRows
    return meteoRows.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q),
    )
  }, [q, meteoRows])

  const hydroFiltered = useMemo(() => {
    if (!q) return allHydroStations
    return allHydroStations.filter(s =>
      (s.name  || '').toLowerCase().includes(q) ||
      (s.river || '').toLowerCase().includes(q) ||
      (s.id    || '').toLowerCase().includes(q),
    )
  }, [q])

  // Cap rendered rows for perf — show "Показано N из M" + "Показать ещё".
  const [meteoLimit, setMeteoLimit] = useState(PAGE_SIZE)
  const [hydroLimit, setHydroLimit] = useState(PAGE_SIZE)
  const visibleMeteo = meteoFiltered.slice(0, meteoLimit)
  const visibleHydro = hydroFiltered.slice(0, hydroLimit)

  // ─── Summary cards ─────────────────────────────────────────────────────────
  const summary = [
    { label: 'Метеостанций', value: meteoRows.length,         tone: 'text-slate-900 dark:text-white' },
    { label: 'Гидропостов',  value: allHydroStations.length,  tone: 'text-slate-900 dark:text-white' },
    { label: 'Найдено',      value: tab === 'weather' ? meteoFiltered.length : hydroFiltered.length, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Реки в базе',  value: new Set(allHydroStations.map(s => s.river)).size, tone: 'text-blue-600 dark:text-blue-400' },
  ]

  return (
    <div className="space-y-6">
      {/* ===== Summary ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summary.map(({ label, value, tone }) => (
          <div key={label} className={`${card} rounded-2xl p-4`}>
            <div className={clsx('text-2xl font-bold transition-colors duration-200', tone)}>{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">{label}</div>
          </div>
        ))}
      </div>

      {/* ===== Tabs + search ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: 'weather', label: 'Метеостанции', icon: CloudSun },
            { key: 'hydro',   label: 'Гидропосты',   icon: Waves    },
          ].map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setMeteoLimit(PAGE_SIZE); setHydroLimit(PAGE_SIZE) }}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors duration-200',
                  active
                    ? 'bg-blue-50 text-[#2F80FF] border-[#2F80FF]/40 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 ' +
                      'dark:bg-[#1A2540]/80 dark:text-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.16] dark:hover:text-white',
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={2.2} />
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2 w-full sm:w-80 transition-colors duration-200
                        bg-white border border-slate-200
                        dark:bg-[#1A2540]/80 dark:border-white/[0.06]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={2.2} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setMeteoLimit(PAGE_SIZE); setHydroLimit(PAGE_SIZE) }}
            placeholder={tab === 'weather' ? 'Поиск по городу/станции…' : 'Поиск по реке / посту…'}
            className="bg-transparent text-sm outline-none w-full transition-colors duration-200
                       text-slate-700 placeholder-slate-400
                       dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className={`${card} rounded-3xl p-5`}>
        {tab === 'weather'
          ? <Table
              rows={visibleMeteo}
              total={meteoFiltered.length}
              limit={meteoLimit}
              onMore={() => setMeteoLimit(l => l + PAGE_SIZE)}
              type="weather"
            />
          : <Table
              rows={visibleHydro}
              total={hydroFiltered.length}
              limit={hydroLimit}
              onMore={() => setHydroLimit(l => l + PAGE_SIZE)}
              type="hydro"
            />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function Table({ rows, total, limit, onMore, type }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400 py-10">
        Ничего не найдено
      </p>
    )
  }
  return (
    <div>
      {/* Mobile: stacked cards (sm:hidden). Hydroposts become deep-links to
          their detail page; weather stations stay informational for now. */}
      <ul className="sm:hidden divide-y divide-slate-100 dark:divide-white/[0.04]">
        {rows.map(st => {
          const Body = (
            <div className="flex items-start gap-3 py-3">
              <StatusDot />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {st.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {type === 'weather' ? st.city : (st.river || '—')}
                </div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                  {st.lat.toFixed(3)}°, {st.lng.toFixed(3)}° · {st.id}
                </div>
              </div>
              {type === 'hydro'
                ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-2" strokeWidth={2.2} />
                : <Wifi className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" strokeWidth={2.2} />}
            </div>
          )
          return (
            <li key={st.id} className="first:pt-0">
              {type === 'hydro'
                ? <Link to={`/post/${st.id}`} className="block hover:bg-slate-50 dark:hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition-colors">{Body}</Link>
                : Body}
            </li>
          )
        })}
      </ul>

      {/* Desktop: full table (hidden on mobile) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.06] transition-colors duration-200">
              <Th align="left">ID</Th>
              <Th align="left">Название</Th>
              <Th align="left">{type === 'weather' ? 'Город' : 'Река'}</Th>
              <Th align="right">Широта</Th>
              <Th align="right">Долгота</Th>
              <Th align="center">Статус</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {rows.map(st => (
              <tr key={st.id} className="transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <Td className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{st.id}</Td>
                <Td className="font-medium text-slate-900 dark:text-white">
                  <span className="inline-flex items-center gap-2">
                    <StatusDot />
                    {type === 'hydro'
                      ? <Link to={`/post/${st.id}`} className="hover:underline">{st.name}</Link>
                      : st.name}
                  </span>
                </Td>
                <Td className="text-slate-600 dark:text-slate-300">
                  {type === 'weather' ? st.city : (st.river || '—')}
                </Td>
                <Td className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">{st.lat.toFixed(4)}°</Td>
                <Td className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">{st.lng.toFixed(4)}°</Td>
                <Td className="text-center">
                  {type === 'hydro'
                    ? <Link to={`/post/${st.id}`} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" aria-label={`Открыть карточку ${st.name}`}>
                        <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
                      </Link>
                    : <Wifi className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" strokeWidth={2.2} />}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04] text-xs text-slate-500 dark:text-slate-400">
        <div className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Показано {rows.length} из {total}
        </div>
        {limit < total && (
          <button
            onClick={onMore}
            className="text-[#2F80FF] dark:text-blue-300 hover:underline font-medium"
          >
            Показать ещё {Math.min(PAGE_SIZE, total - limit)}
          </button>
        )}
      </div>
    </div>
  )
}

function Th({ align = 'left', children }) {
  return (
    <th
      className={clsx(
        'pb-3 text-[10px] uppercase tracking-widest font-semibold transition-colors duration-200',
        'text-slate-500 dark:text-slate-400',
        align === 'right'  && 'text-right',
        align === 'center' && 'text-center',
        align === 'left'   && 'text-left',
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className = '' }) {
  return <td className={clsx('py-3 text-sm transition-colors duration-200', className)}>{children}</td>
}
