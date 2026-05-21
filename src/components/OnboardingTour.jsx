import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Star, BellRing, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useFocusTrap } from '../hooks/useFocusTrap'

const SEEN_KEY = 'onboarding_seen_v1'

const SLIDES = [
  {
    Icon: MapPin,
    title: 'Погода и уровень рек на одной карте',
    text:  'Меняйте город через поиск в шапке или нажимайте «Моя локация» — карта плавно перенесёт вас и покажет точки с реальной температурой.',
  },
  {
    Icon: Star,
    title: 'Сохраняйте важные места в Избранное',
    text:  'Звезда на карточке города или в попапе гидропоста добавляет его в Избранное — там удобно следить за обстановкой в своём районе или на даче.',
  },
  {
    Icon: BellRing,
    title: 'Получайте предупреждения о паводках',
    text:  'Если уровень воды в избранном гидропосте пересечёт отметку «внимание» или «опасный» — приложение покажет баннер и (по разрешению) браузерное уведомление.',
  },
]

export default function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const dialogRef = useRef(null)

  // Show on first visit only
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true)
    } catch {}
  }, [])

  // Close on Esc — standard dialog UX
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Trap focus inside the dialog
  useFocusTrap(open, dialogRef)

  const close = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    setOpen(false)
  }

  if (!open) return null

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1
  const Icon = slide.Icon

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-3xl
                      bg-white dark:bg-[#131E36]
                      border border-slate-200/70 dark:border-white/[0.06]
                      shadow-2xl p-6">
        <button
          onClick={close}
          aria-label="Закрыть"
          className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center
                     text-slate-400 hover:text-slate-700 hover:bg-slate-100
                     dark:hover:text-slate-100 dark:hover:bg-white/[0.06]"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                        bg-blue-50 dark:bg-blue-500/15 text-[#2F80FF] dark:text-blue-300">
          <Icon className="w-7 h-7" strokeWidth={2} />
        </div>

        <h2 id="onboarding-title" className="text-xl font-bold text-slate-900 dark:text-white mb-2">{slide.title}</h2>
        <p id="onboarding-desc" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{slide.text}</p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-200',
                i === step ? 'w-6 bg-[#2F80FF]' : 'w-1.5 bg-slate-300 dark:bg-slate-600',
              )}
            />
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl text-sm font-medium
                       text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>

          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl text-sm font-semibold
                         bg-[#2F80FF] hover:bg-[#3a8bff] text-white shadow-md shadow-blue-500/30"
            >
              Далее
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => { close(); navigate('/map') }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-semibold
                         bg-[#2F80FF] hover:bg-[#3a8bff] text-white shadow-md shadow-blue-500/30"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} />
              Открыть карту
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
