import {
  Droplets, Gauge, Wind, Star, X, AlertTriangle, Check, LineChart, Share2
} from 'lucide-react'
import { useFavorites } from '../favorites/FavoritesContext'

function SunCloudIcon({ className = 'w-12 h-12' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="22" cy="22" r="9" fill="#FCD34D" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1={22 + Math.cos((deg * Math.PI) / 180) * 13}
          y1={22 + Math.sin((deg * Math.PI) / 180) * 13}
          x2={22 + Math.cos((deg * Math.PI) / 180) * 17}
          y2={22 + Math.sin((deg * Math.PI) / 180) * 17}
          stroke="#FCD34D"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M14 44 Q14 36 22 36 Q24 30 32 31 Q40 31 40 39 Q48 39 48 45 Q48 51 42 51 H20 Q12 51 12 45 Q12 44 14 44Z"
        fill="#CBD5E1"
        stroke="#94A3B8"
        strokeWidth="0.5"
      />
    </svg>
  )
}

function SmallSun({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="5" fill="#FCD34D" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <line key={d}
          x1={12 + Math.cos(d * Math.PI / 180) * 7}
          y1={12 + Math.sin(d * Math.PI / 180) * 7}
          x2={12 + Math.cos(d * Math.PI / 180) * 9.5}
          y2={12 + Math.sin(d * Math.PI / 180) * 9.5}
          stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      ))}
    </svg>
  )
}

export default function HydropostPopup({ post, onClose, onOpenCharts }) {
  const { isFavoritePost, togglePost } = useFavorites()
  const fav = isFavoritePost(post.id)

  // marker position on water-level bar, clamped to 0-100
  const range = post.waterCritical
  const waterPct = Math.min(100, Math.max(0, (post.waterLevel / range) * 100))

  // Reusable inner tile classes
  const tile =
    'rounded-2xl p-3 border transition-colors duration-200 ' +
    'bg-white border-slate-200 ' +
    'dark:bg-[#0F1A33]/60 dark:border-white/[0.06]'

  const aboveNorm = post.waterLevel - post.waterNorm
  const isAttention = aboveNorm > 0

  return (
    <div
      className="w-[360px] max-w-[92vw] rounded-3xl p-5 transition-colors duration-200
                 bg-white dark:bg-[#0E1A35]
                 border border-slate-200/80 dark:border-white/[0.06]
                 shadow-2xl shadow-slate-900/10 dark:shadow-black/50"
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2">
          <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-white transition-colors duration-200">
            {post.city},<br />{post.river}
          </h2>
          <button
            onClick={() => togglePost(post.id)}
            aria-label={fav ? 'Удалить из избранного' : 'Добавить в избранное'}
            title={fav ? 'Удалить из избранного' : 'Добавить в избранное'}
            className="mt-1 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            <Star
              className={
                'w-4 h-4 transition-colors duration-200 ' +
                (fav
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-400 dark:text-slate-500 fill-transparent')
              }
              strokeWidth={2.2}
            />
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200
                     bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700
                     dark:bg-white/[0.06] dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* ===== CURRENT WEATHER ===== */}
      <div className="flex items-center gap-3 mb-5">
        <SunCloudIcon className="w-14 h-14 shrink-0" />
        <div>
          <div className="text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-white transition-colors duration-200">
            +{post.airTemp}°C
          </div>
          <div className="text-xs mt-1.5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Ощущается как +{post.feelsLike}°C
          </div>
        </div>
      </div>

      {/* ===== METRIC ROW ===== */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricTile
          label="ВЛАЖНОСТЬ"
          value={`${post.humidity}%`}
          icon={<Droplets className="w-3.5 h-3.5 text-blue-500 dark:text-blue-300" fill="currentColor" />}
          tileClass={tile}
        />
        <MetricTile
          label="ДАВЛЕНИЕ"
          value={String(post.pressure)}
          icon={<Gauge className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" strokeWidth={2.5} />}
          tileClass={tile}
        />
        <MetricTile
          label="ВЕТЕР"
          value={`${post.windSpeed} м/с`}
          icon={<Wind className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />}
          tileClass={tile}
        />
      </div>

      {/* ===== WATER LEVEL ===== */}
      <div className={`${tile} mb-4 p-4`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
              Уровень воды
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">{post.waterLevel}</span>
              <span className="text-xs ml-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">см</span>
            </div>
          </div>
          <div className="text-right">
            {isAttention && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200
                              bg-orange-50 text-orange-600 border border-orange-200
                              dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                Attention
              </div>
            )}
            <div className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
              Норма: {post.waterNorm} см{' '}
              {aboveNorm !== 0 && (
                <span className={aboveNorm > 0 ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-emerald-500 dark:text-emerald-400 font-semibold'}>
                  ({aboveNorm > 0 ? '+' : ''}{aboveNorm})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            className="h-1.5 rounded-full"
            style={{ background: 'linear-gradient(to right, #22C55E 0%, #22C55E 55%, #F59E0B 55%, #F59E0B 80%, #EF4444 80%, #EF4444 100%)' }}
          />
          <div className="absolute -top-5 -translate-x-1/2 flex flex-col items-center" style={{ left: `${waterPct}%` }}>
            <span className="text-[9px] font-semibold mb-0.5 text-slate-700 dark:text-slate-200 transition-colors duration-200">Current</span>
            <div className="w-0.5 h-4 bg-slate-900 dark:bg-white transition-colors duration-200" />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 transition-colors duration-200">
            <span>0 см</span>
            <span>{Math.round(post.waterCritical / 2)}</span>
            <span>{post.waterCritical} см</span>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ROW ===== */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className={`${tile} p-3`}>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Завтра
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <SmallSun className="w-5 h-5" />
            <span className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">+{post.tomorrowTemp}°C</span>
          </div>
          <div className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            {post.tomorrowDesc}
          </div>
        </div>

        <div className={`${tile} p-3`}>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Рекомендации
          </div>
          <ul className="mt-1.5 space-y-1">
            <li className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-200 transition-colors duration-200">
              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" strokeWidth={3} />
              Ветровка уместна
            </li>
            <li className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-200 transition-colors duration-200">
              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" strokeWidth={3} />
              Зонт не нужен
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenCharts?.(post.id)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors duration-200
                     bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                     shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
        >
          <LineChart className="w-4 h-4" strokeWidth={2.2} />
          Посмотреть графики
        </button>
        <button
          aria-label="Поделиться"
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-200
                     bg-slate-100 hover:bg-slate-200 text-slate-700
                     dark:bg-[#162345] dark:hover:bg-[#1d2d54] dark:text-slate-200
                     border border-slate-200 dark:border-white/[0.06]"
        >
          <Share2 className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

function MetricTile({ label, value, icon, tileClass }) {
  return (
    <div className={tileClass}>
      <div className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
        {label}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span>{icon}</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
          {value}
        </span>
      </div>
    </div>
  )
}
