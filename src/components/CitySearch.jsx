import { Search, MapPin, X, Loader2, AlertTriangle } from 'lucide-react'
import { useCitySearch } from '../hooks/useCitySearch'

/**
 * Autocomplete search input in the global Header. Behavior comes from the
 * shared `useCitySearch` hook (also used by the in-map search overlay);
 * this component only owns the header-pill visual treatment.
 */
export default function CitySearch() {
  const {
    query, setQuery,
    results,
    open, setOpen,
    loading, error,
    pick, clear,
    wrapperRef, inputRef,
  } = useCitySearch()

  const showDropdown = open && query.trim().length >= 3

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Введите город России…"
          aria-label="Поиск города России"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="city-search-results"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-full pl-12 pr-10 py-3 text-sm outline-none transition-colors duration-200
                     bg-slate-100 dark:bg-[#1A2540]/90
                     border border-slate-200 dark:border-[#2A3754]
                     text-slate-700 dark:text-slate-200
                     placeholder-slate-400 dark:placeholder-slate-500
                     focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Очистить"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                       text-slate-400 hover:text-slate-700 hover:bg-slate-200/60
                       dark:hover:text-slate-100 dark:hover:bg-white/[0.06]
                       transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      {/* ─── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div
          id="city-search-results"
          role="listbox"
          aria-label="Результаты поиска города"
          className="absolute left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden
                     bg-white/95 dark:bg-[#131E36]/95 backdrop-blur
                     border border-slate-200/70 dark:border-white/[0.06]
                     shadow-lg shadow-slate-900/[0.08] dark:shadow-black/40"
        >
          {/* Header strip — context for the state */}
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold
                          text-slate-500 dark:text-slate-400
                          border-b border-slate-200/70 dark:border-white/[0.06]">
            {loading
              ? 'Ищем…'
              : error
                ? 'Ошибка'
                : results.length > 0
                  ? `Найдено: ${results.length}`
                  : 'Города России'}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
              <span>{error}</span>
            </div>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Ничего не найдено в России
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map(loc => (
                <li key={loc.id ?? `${loc.lat},${loc.lon}`} role="option" aria-selected="false">
                  <button
                    type="button"
                    // onMouseDown — отрабатываем раньше, чем onBlur инпута
                    onMouseDown={(e) => { e.preventDefault(); pick(loc) }}
                    aria-label={`${loc.name}${loc.region ? ', ' + loc.region : ''}`}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors
                               text-slate-700 dark:text-slate-200
                               hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2.2} />
                    <span className="text-sm font-medium truncate">{loc.name}</span>
                    {loc.region && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        , {loc.region}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                      {loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
