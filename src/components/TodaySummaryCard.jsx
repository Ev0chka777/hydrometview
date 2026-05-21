import { useRef, useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Share2, Check, Droplets, Wind, CloudRain, Waves, AlertTriangle, Sparkles, ImageDown,
  Gauge, Star, ChevronRight, ShieldCheck, AlertCircle,
} from 'lucide-react'
import Skeleton from './Skeleton'
import clsx from 'clsx'
import { useWeather } from '../context/WeatherContext'
import { useFavorites } from '../favorites/FavoritesContext'
import { useSettings } from '../settings/SettingsContext'
import { russiaCities } from '../data/russiaCities'
import { cities } from '../data/cities'
import { findNearestHydropost } from '../utils/nearestHydropost'
import { pickTipOfDay } from '../utils/tipOfDay'
import { calculateWeatherImpact, IMPACT_LEVEL_LABEL } from '../utils/weatherImpact'
import { formatPressure } from '../settings/units'
import { fetchHydroDataFromPage } from '../services/hydroService'

const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const RU_WEEKDAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

function formatDate(d) {
  return `${RU_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]}`
}

/**
 * Single primary weather card on the Dashboard. Combines:
 *   • header — city, date, favourite, share
 *   • temperature + condition + icon
 *   • compact metric row (humidity / wind / precip / pressure / AQI)
 *   • nearest hydropost summary
 *   • weather-impact advisory (when level ≠ low) OR tip-of-day (when low)
 *   • "Подробнее" deep-link to /weather
 *
 * The share button renders this same DOM to PNG via html2canvas — interactive
 * controls (★, share, «Подробнее») are excluded from the screenshot so the
 * shared image stays clean.
 */
export default function TodaySummaryCard({ className = '' }) {
  const { activeCity, currentWeather, forecastDays, hourlyForecast } = useWeather()
  const { settings } = useSettings()
  const { isFavoriteCity, toggleCity } = useFavorites()
  const [hydro, setHydro] = useState(null)
  const [copied, setCopied] = useState(false)

  // Favorites store short city IDs from cities.js when available; fall back
  // to the human name for cities outside that directory. Keeps the star in
  // sync with Dashboard's older toggle.
  const favKey = useMemo(
    () => Object.values(cities).find(c => c.name === activeCity)?.id ?? activeCity,
    [activeCity],
  )
  const cityFav = isFavoriteCity(favKey)

  // Best-effort: closest hydropost level
  useEffect(() => {
    if (!activeCity) return
    const match = russiaCities.find(c => c.nameRu === activeCity)
    if (!match) return
    const nearest = findNearestHydropost(match.lat, match.lng)
    if (!nearest?.station) return
    fetchHydroDataFromPage(nearest.station.urlPath)
      .then(d => setHydro({ station: nearest.station, dist: nearest.distanceKm, data: d }))
      .catch(() => setHydro(null))
  }, [activeCity])

  if (!currentWeather) {
    // Skeleton mirrors the real layout so the page doesn't jump when data
    // arrives. aria-busy lets assistive tech announce the loading state.
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className={clsx(
          'rounded-3xl p-5 space-y-4',
          'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04]',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2.5 w-28" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" className="w-16 h-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-10 rounded-2xl" />
      </section>
    )
  }

  const w = currentWeather
  const today = forecastDays?.[0]
  const tip = pickTipOfDay({
    tempC:         w.tempC,
    feelsLikeC:    w.feelsLikeC,
    windMs:        w.windMs,
    precipChance:  today?.precipChance,
    precipMm:      today?.totalPrecipMm,
    humidity:      w.humidity,
    uv:            w.uv,
    pressureMmHg:  w.pressureMmHg,
    conditionText: w.conditionText ?? '',
    isDay:         w.isDay ?? true,
    aqi:           w.aqi,
  })
  const impact = calculateWeatherImpact(w, hourlyForecast ?? [])

  const tempStr = `${w.tempC >= 0 ? '+' : ''}${Math.round(w.tempC)}°C`
  const feelsStr = `${w.feelsLikeC >= 0 ? '+' : ''}${Math.round(w.feelsLikeC)}°`

  // Plain-text summary for sharing
  const shareText = [
    `🌤 ${activeCity}, ${formatDate(new Date())}`,
    `${tempStr} (ощущается ${feelsStr}), ${w.conditionText}`,
    today?.precipChance != null && `Осадки: ${today.precipChance}%`,
    w.windMs != null && `Ветер: ${w.windMs.toFixed(1)} м/с ${w.windDir ?? ''}`.trim(),
    w.pressureMmHg != null && `Давление: ${Math.round(w.pressureMmHg)} мм рт. ст.`,
    hydro?.data?.level != null
      && `💧 ${hydro.station.river} (${hydro.station.name}): ${Math.round(hydro.data.level)} см`
      + (hydro.data.status === 'critical' ? ' — ОПАСНЫЙ уровень'
         : hydro.data.status === 'warning' ? ' — повышен'
         : ' — норма'),
    `💡 ${tip.title}`,
    '— HydroMetView',
  ].filter(Boolean).join('\n')

  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)

  /**
   * Try in order:
   *   1) Render card → PNG → Web Share API with file (mobile native share-sheet)
   *   2) Render card → PNG → download as file (desktop)
   *   3) Plain-text share / clipboard (fallback if html2canvas fails)
   *
   * Interactive controls marked with [data-share-exclude] are stripped from
   * the screenshot via html2canvas' ignoreElements — keeps the shared image
   * focused on the actual content, no buttons or chevrons.
   */
  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale:           Math.min(2, window.devicePixelRatio || 1),
        useCORS:         true,
        logging:         false,
        ignoreElements:  (el) => el.hasAttribute?.('data-share-exclude'),
      })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95))
      if (!blob) throw new Error('Не удалось создать изображение')

      const fileName = `hydrometview-${activeCity}-${new Date().toISOString().slice(0,10)}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // Mobile: native share sheet with the image attached
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `Погода в ${activeCity}`,
            text:  shareText,
          })
          return
        } catch (e) {
          if (e.name === 'AbortError') return
        }
      }

      // Desktop / fallback: download the PNG
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Last-resort fallback: plain text
      try {
        if (navigator.share) {
          await navigator.share({ title: `Погода в ${activeCity}`, text: shareText })
        } else {
          await navigator.clipboard.writeText(shareText)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      } catch { /* user cancelled or quota */ }
    } finally {
      setSharing(false)
    }
  }

  // Impact pill — only render when it's actually meaningful (medium/high).
  // For "low" days we show the tip-of-day instead, otherwise it's noise.
  const ImpactIcon = impact.level === 'high'   ? AlertTriangle
                   : impact.level === 'medium' ? AlertCircle
                   : ShieldCheck
  const impactPillColor = impact.level === 'high'
    ? 'bg-red-400/25 text-red-50 ring-1 ring-red-200/40'
    : impact.level === 'medium'
    ? 'bg-yellow-400/25 text-yellow-50 ring-1 ring-yellow-200/40'
    : 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/30'

  return (
    <section
      ref={cardRef}
      className={clsx(
        'relative rounded-3xl p-5 overflow-hidden',
        'bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] text-white',
        'shadow-lg shadow-blue-500/20 dark:shadow-blue-900/40',
        className,
      )}
    >
      {/* Decorative blob */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-white/70">
            Сводка дня
          </div>
          <div className="text-base font-bold mt-0.5 truncate">{activeCity}</div>
          <div className="text-[11px] text-white/70">{formatDate(new Date())}</div>
        </div>
        {/* Action buttons — excluded from the share screenshot via the
            data-share-exclude attribute. */}
        <div className="flex items-center gap-1.5 shrink-0" data-share-exclude>
          <button
            onClick={() => toggleCity(favKey)}
            aria-label={cityFav ? 'Убрать город из избранного' : 'Добавить город в избранное'}
            title={cityFav ? 'В избранном' : 'В избранное'}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full
                       bg-white/15 hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            <Star
              className={clsx('w-4 h-4 transition-colors', cityFav ? 'text-yellow-300' : 'text-white')}
              fill={cityFav ? '#fde047' : 'transparent'}
              strokeWidth={2.2}
            />
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            aria-label="Поделиться или скачать как изображение"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm
                       disabled:opacity-60 disabled:cursor-wait"
          >
            {sharing
              ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" strokeWidth={2.4} />Готовим…</>
              : copied
                ? <><Check className="w-3.5 h-3.5" strokeWidth={2.4} />Сохранено</>
                : navigator.canShare?.({ files: [new File([], 'x.png', { type: 'image/png' })] })
                  ? <><Share2 className="w-3.5 h-3.5" strokeWidth={2.4} />Поделиться</>
                  : <><ImageDown className="w-3.5 h-3.5" strokeWidth={2.4} />Скачать</>}
          </button>
        </div>
      </div>

      {/* Temp + condition */}
      <div className="relative flex items-center gap-4 mb-4">
        {w.conditionIcon && (
          <img src={w.conditionIcon} alt="" className="w-16 h-16 drop-shadow-md" />
        )}
        <div>
          <div className="text-4xl font-bold leading-none">{tempStr}</div>
          <div className="text-xs text-white/75 mt-1">ощущается {feelsStr}</div>
          <div className="text-sm font-medium mt-1">{w.conditionText}</div>
        </div>
      </div>

      {/* Meta line — now includes pressure (was on the deleted basic card) */}
      <div className="relative flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/85 mb-4">
        {w.humidity != null && (
          <span className="inline-flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />{w.humidity}%</span>
        )}
        {w.windMs != null && (
          <span className="inline-flex items-center gap-1">
            <Wind className="w-3.5 h-3.5" />
            {w.windMs.toFixed(1)} м/с{w.windDir ? `, ${w.windDir}` : ''}
          </span>
        )}
        {today?.precipChance != null && (
          <span className="inline-flex items-center gap-1"><CloudRain className="w-3.5 h-3.5" />{today.precipChance}%</span>
        )}
        {w.pressureMmHg != null && (
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" />{formatPressure(w.pressureMmHg, settings.units.pressure, settings.language)}
          </span>
        )}
        {w.aqi && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            title={`Качество воздуха: ${w.aqi.label}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: w.aqi.color }} />
            AQI {w.aqi.epa}
          </span>
        )}
      </div>

      {/* Hydro context */}
      {hydro?.data?.level != null && (
        <div className="relative rounded-2xl p-3 mb-3 bg-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-white/90" strokeWidth={2.2} />
            <div className="text-xs font-semibold flex-1 min-w-0 truncate">
              {hydro.station.river} · {hydro.station.name}
            </div>
            {hydro.data.status === 'critical' && (
              <AlertTriangle className="w-4 h-4 text-red-300" strokeWidth={2.4} />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold">{Math.round(hydro.data.level)} см</span>
            <span className={clsx('text-[11px] font-semibold',
              hydro.data.status === 'critical' ? 'text-red-200'
              : hydro.data.status === 'warning' ? 'text-amber-200' : 'text-emerald-200')}>
              {hydro.data.status === 'critical' ? 'ОПАСНЫЙ'
               : hydro.data.status === 'warning' ? 'повышен' : 'норма'}
            </span>
          </div>
        </div>
      )}

      {/* Insight slot: weather-impact advisory when level ≠ low, tip-of-day otherwise.
          Either way it's ONE block instead of two — no duplication. */}
      {impact.level !== 'low' ? (
        <div className="relative rounded-2xl p-3 bg-white/20 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <ImpactIcon
              className={clsx('w-4 h-4 mt-0.5 shrink-0',
                impact.level === 'high' ? 'text-red-200' : 'text-yellow-200')}
              strokeWidth={2.4}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-semibold">{impact.headline}</div>
                <span className={clsx(
                  'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full',
                  impactPillColor,
                )}>
                  {IMPACT_LEVEL_LABEL[impact.level]}
                </span>
              </div>
              {impact.advisories.length > 0 && (
                <div className="text-[11px] text-white/80 mt-1 leading-snug line-clamp-2">
                  {impact.advisories[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl p-3 bg-white/20 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-yellow-200" strokeWidth={2.4} />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{tip.title}</div>
              {tip.text && <div className="text-[11px] text-white/80 mt-0.5 leading-snug">{tip.text}</div>}
            </div>
          </div>
        </div>
      )}

      {/* "Подробнее" — also excluded from share image. */}
      <Link
        to="/weather"
        data-share-exclude
        className="relative mt-3 w-full rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium
                   bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors"
      >
        Подробнее <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
      </Link>
    </section>
  )
}
