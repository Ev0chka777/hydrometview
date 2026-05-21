import { useEffect, useState } from 'react'
import { Plus, X, Search, ArrowRightLeft, Droplets, Wind, Gauge, Thermometer, CloudRain } from 'lucide-react'
import clsx from 'clsx'
import { searchCities, fetchCityWeather } from '../services/weatherService'

/**
 * Side-by-side comparison of two cities — handy when planning a trip
 * ("куда ехать на выходные?") or checking how the dacha compares to home.
 */
export default function ComparePage() {
  const [left,  setLeft]  = useState(null)   // { name, data: { current, days } }
  const [right, setRight] = useState(null)

  const setSlot = async (slot, picked) => {
    const setter = slot === 'left' ? setLeft : setRight
    setter({ name: picked.name, loading: true })
    try {
      const data = await fetchCityWeather(`${picked.lat},${picked.lon}`)
      setter({ name: picked.name, data })
    } catch (e) {
      setter({ name: picked.name, error: e.message || 'Ошибка' })
    }
  }

  const swap = () => {
    setLeft(right); setRight(left)
  }

  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Сравнение городов</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Выберите два города, чтобы увидеть их погоду рядом.
        </p>
      </header>

      <div className="flex items-center justify-end">
        {(left || right) && (
          <button
            onClick={swap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                       bg-slate-100 hover:bg-slate-200 text-slate-700
                       dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={2.4} />
            Поменять местами
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CitySlot slot="left"  data={left}  card={card} onPick={p => setSlot('left', p)} onClear={() => setLeft(null)} />
        <CitySlot slot="right" data={right} card={card} onPick={p => setSlot('right', p)} onClear={() => setRight(null)} />
      </div>

      {left?.data && right?.data && (
        <DiffSummary card={card} a={left.data.current} b={right.data.current}
                     aName={left.name} bName={right.name} />
      )}
    </div>
  )
}

// ─── One city slot — has its own search & weather panel ──────────────────
function CitySlot({ slot, data, card, onPick, onClear }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  // Debounced search inside the slot
  useEffect(() => {
    const v = q.trim()
    if (v.length < 3) { setResults([]); return }
    let cancelled = false
    const id = setTimeout(async () => {
      try { const list = await searchCities(v); if (!cancelled) setResults(list.slice(0, 6)) }
      catch { /* ignore */ }
    }, 300)
    return () => { cancelled = true; clearTimeout(id) }
  }, [q])

  if (!data) {
    return (
      <div className={`${card} rounded-3xl p-5`}>
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">
          {slot === 'left' ? 'Город A' : 'Город B'}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Введите город…"
            className="w-full rounded-xl pl-9 pr-3 py-2 text-sm outline-none
                       bg-slate-50 dark:bg-[#0F1A33]
                       border border-slate-200 dark:border-white/[0.06]
                       text-slate-800 dark:text-slate-100
                       focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1.5 rounded-2xl max-h-60 overflow-y-auto py-1
                           bg-white dark:bg-[#131E36] border border-slate-200 dark:border-white/[0.06]
                           shadow-xl">
              {results.map(loc => (
                <li key={loc.id ?? `${loc.lat},${loc.lon}`}>
                  <button
                    onMouseDown={e => { e.preventDefault(); onPick(loc); setQ(''); setOpen(false) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm
                               hover:bg-slate-50 dark:hover:bg-white/[0.04]
                               text-slate-700 dark:text-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium truncate">{loc.name}</span>
                    {loc.region && <span className="text-xs text-slate-500">, {loc.region}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center py-8">
          Выберите город из списка
        </div>
      </div>
    )
  }

  if (data.loading) {
    return (
      <div className={`${card} rounded-3xl p-5`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{data.name}</span>
          <button onClick={onClear} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Загрузка погоды…</div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className={`${card} rounded-3xl p-5`}>
        <div className="text-sm text-red-600 dark:text-red-300">Ошибка: {data.error}</div>
      </div>
    )
  }

  const c = data.data.current
  const today = data.data.days?.[0]
  const round = n => Math.round(n)
  const sign = n => n >= 0 ? '+' : ''

  return (
    <div className={`${card} rounded-3xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900 dark:text-white truncate">{data.name}</div>
          {c?.region && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.region}</div>}
        </div>
        <button onClick={onClear} title="Убрать"
                className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {c.conditionIcon && <img src={c.conditionIcon} alt="" className="w-16 h-16" />}
        <div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white leading-none">
            {sign(c.tempC)}{round(c.tempC)}°
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ощущается {sign(c.feelsLikeC)}{round(c.feelsLikeC)}°
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200 mt-1">{c.conditionText}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat icon={<Droplets className="w-3.5 h-3.5" />} label="Влажность" value={`${c.humidity}%`} />
        <Stat icon={<Wind     className="w-3.5 h-3.5" />} label="Ветер"     value={`${c.windMs.toFixed(1)} м/с`} />
        <Stat icon={<Gauge    className="w-3.5 h-3.5" />} label="Давление"  value={`${Math.round(c.pressureMmHg)} мм`} />
        <Stat icon={<CloudRain className="w-3.5 h-3.5" />} label="Осадки" value={today?.precipChance != null ? `${today.precipChance}%` : '—'} />
      </div>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl p-2 bg-slate-50/60 dark:bg-white/[0.03]
                    border border-slate-200/70 dark:border-white/[0.04]">
      <span className="text-blue-500 dark:text-blue-300 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{value}</div>
      </div>
    </div>
  )
}

// ─── Verdict / diff line ────────────────────────────────────────────────
function DiffSummary({ card, a, b, aName, bName }) {
  if (!a || !b) return null
  const dT  = a.tempC - b.tempC
  const dW  = (a.windMs ?? 0) - (b.windMs ?? 0)
  const dH  = (a.humidity ?? 0) - (b.humidity ?? 0)
  const dP  = (a.pressureMmHg ?? 0) - (b.pressureMmHg ?? 0)

  // Pick a winner — warmer + drier + lighter wind = better-feeling
  const aScore = (a.tempC ?? 0) - (a.humidity ?? 0) * 0.05 - (a.windMs ?? 0) * 0.5
  const bScore = (b.tempC ?? 0) - (b.humidity ?? 0) * 0.05 - (b.windMs ?? 0) * 0.5
  const winner = aScore > bScore + 0.5 ? aName : bScore > aScore + 0.5 ? bName : null

  return (
    <section className={`${card} rounded-3xl p-5`}>
      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3">
        Разница
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Diff icon={<Thermometer className="w-3.5 h-3.5 text-orange-500" />} label="Температура"
              a={`${a.tempC >= 0 ? '+' : ''}${Math.round(a.tempC)}°`}
              b={`${b.tempC >= 0 ? '+' : ''}${Math.round(b.tempC)}°`}
              delta={`${dT > 0 ? '+' : ''}${Math.round(dT)}°`} />
        <Diff icon={<Wind className="w-3.5 h-3.5 text-blue-500" />} label="Ветер"
              a={`${a.windMs.toFixed(1)} м/с`} b={`${b.windMs.toFixed(1)} м/с`}
              delta={`${dW > 0 ? '+' : ''}${dW.toFixed(1)} м/с`} />
        <Diff icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />} label="Влажность"
              a={`${a.humidity}%`} b={`${b.humidity}%`}
              delta={`${dH > 0 ? '+' : ''}${Math.round(dH)}%`} />
        <Diff icon={<Gauge className="w-3.5 h-3.5 text-purple-500" />} label="Давление"
              a={`${Math.round(a.pressureMmHg)} мм`} b={`${Math.round(b.pressureMmHg)} мм`}
              delta={`${dP > 0 ? '+' : ''}${Math.round(dP)}`} />
      </div>
      {winner ? (
        <div className="text-sm text-slate-700 dark:text-slate-200">
          🌤 Сейчас приятнее в <b className="text-[#2F80FF] dark:text-blue-300">{winner}</b>
        </div>
      ) : (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Условия сопоставимы — выбирайте по вкусу.
        </div>
      )}
    </section>
  )
}

function Diff({ icon, label, a, b, delta }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
        {icon}{label}
      </div>
      <div className="text-xs text-slate-700 dark:text-slate-200">
        <span className="font-semibold">{a}</span>
        <span className="opacity-60 mx-1">vs</span>
        <span className="font-semibold">{b}</span>
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Δ {delta}</div>
    </div>
  )
}
