import { Link } from 'react-router-dom'
import {
  ChevronRight, Shirt, Umbrella, Waves, AlertTriangle, ArrowRightLeft,
} from 'lucide-react'
import { useSettings } from '../settings/SettingsContext'
import { useWeather } from '../context/WeatherContext'
import WeatherMap from '../components/WeatherMap'
import PersonaWidget from '../components/PersonaWidget'
import PersonaPicker from '../components/PersonaPicker'
import TodaySummaryCard from '../components/TodaySummaryCard'
import OfficialAlertsBanner from '../components/OfficialAlertsBanner'

export default function Dashboard() {
  const { settings, incrementHydropostsViewed } = useSettings()
  const { error } = useWeather()

  // Reusable surface classes
  const card =
    'bg-white dark:bg-[#131E36]/80 dark:backdrop-blur-sm border border-slate-200/70 dark:border-white/[0.04] shadow-md dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'
  const innerTile =
    'bg-slate-50 dark:bg-[#0F1830]/70 border border-slate-200/70 dark:border-white/[0.03] transition-colors duration-200'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 lg:gap-6 pt-2">
      {/* ============ LEFT COLUMN ============ */}
      <div className="space-y-6">
        {/* Official storm/flood alerts from the national met service */}
        <OfficialAlertsBanner />

        {/* Slim fetch-error banner — surfaced above the main card so it stays
            visible even while old cached data is still showing. */}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs
                          bg-red-50 dark:bg-red-500/10
                          border border-red-200/70 dark:border-red-500/20
                          text-red-700 dark:text-red-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
            <span>Ошибка загрузки: {error}</span>
          </div>
        )}

        {/* Single primary weather card — temp, metrics, hydro context, impact
            advisory / tip-of-day, favourite, share, «Подробнее». Replaces the
            old pair of partially-duplicating cards. */}
        <TodaySummaryCard />

        {/* Persona-specific widget (only when user picked a persona).
            For first-time users (persona === 'general'), surface the picker
            inline so they discover the feature without digging into Profile. */}
        {settings.persona === 'general'
          ? <PersonaPicker variant="full" />
          : <PersonaWidget />}

        {/* Recommendations */}
        <section className={`${card} rounded-3xl p-6`}>
          <Link
            to="/recommendations"
            className="group inline-flex items-center gap-1.5 mb-4 transition-colors duration-200
                       text-slate-900 dark:text-white hover:text-[#2F80FF] dark:hover:text-blue-300"
          >
            <h3 className="text-lg font-semibold">Рекомендации для вас</h3>
            <ChevronRight
              className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1
                         text-slate-400 dark:text-slate-500
                         group-hover:text-[#2F80FF] dark:group-hover:text-blue-300"
              strokeWidth={2.2}
            />
          </Link>
          <div className="space-y-3">
            <RecommendationRow
              category="ОДЕЖДА"
              title="Ветровка, джинсы, кроссовки"
              subtitle="Возможет прохладный ветер"
              icon={<Shirt className="w-5 h-5 text-orange-500 dark:text-orange-400" strokeWidth={2} />}
              tile={innerTile}
            />
            <RecommendationRow
              category="ОСАДКИ"
              title="Зонт не нужен"
              subtitle="Вероятность осадков низкая"
              icon={<Umbrella className="w-5 h-5 text-slate-500 dark:text-slate-300" strokeWidth={2} />}
              tile={innerTile}
            />
            <RecommendationRow
              category="ГИДРОЛОГИЯ"
              title="Уровень воды в норме"
              subtitle="Риск затопления низкий"
              icon={<Waves className="w-5 h-5 text-cyan-500 dark:text-cyan-400" strokeWidth={2} />}
              tile={innerTile}
            />
          </div>
        </section>

        {/* Quick CTA: city comparison — surfaces a feature most users would
            otherwise miss. Single line, low-key style on the side column. */}
        <Link
          to="/compare"
          className="group flex items-center gap-3 rounded-2xl p-4 transition-all duration-200
                     bg-gradient-to-r from-blue-50 to-indigo-50
                     dark:from-blue-500/10 dark:to-indigo-500/10
                     border border-blue-100 dark:border-blue-400/20
                     hover:from-blue-100 hover:to-indigo-100
                     dark:hover:from-blue-500/20 dark:hover:to-indigo-500/20"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          bg-white dark:bg-[#1A2A55] text-[#2F80FF] dark:text-blue-300">
            <ArrowRightLeft className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Сравнить с другим городом
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Куда поехать на выходные? Где теплее?
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" strokeWidth={2.2} />
        </Link>
      </div>

      {/* ============ RIGHT COLUMN — INTERACTIVE MAP ============ */}
      {/* Sticky on desktop so the map stays visible while the left
          column scrolls — fills empty space below shorter columns. */}
      <section className={`${card} rounded-3xl p-4 flex flex-col lg:sticky lg:top-[88px] lg:h-[calc(100vh-112px)] lg:self-start`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            Карта станций
          </h3>
          <Link
            to="/map"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2F80FF] dark:text-blue-300 hover:underline"
          >
            На полную карту <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Parent MUST have a definite height — otherwise Leaflet collapses to 0 px.
            On desktop, fill the remaining sticky section height (flex-1). */}
        <div className="w-full h-[380px] lg:h-auto lg:flex-1 rounded-2xl overflow-hidden shadow-lg">
          <WeatherMap
            layer="both"
            className="w-full h-full"
            onHydropostClick={incrementHydropostsViewed}
          />
        </div>
      </section>
    </div>
  )
}

function RecommendationRow({ category, title, subtitle, icon, tile }) {
  return (
    <div className={`${tile} rounded-2xl p-3.5 flex items-start gap-3`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200
                      bg-white dark:bg-white/[0.03]
                      border border-slate-200/70 dark:border-transparent">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-1 transition-colors duration-200">{category}</div>
        <div className="text-sm font-medium text-slate-900 dark:text-white leading-tight transition-colors duration-200">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-200">{subtitle}</div>
      </div>
    </div>
  )
}
