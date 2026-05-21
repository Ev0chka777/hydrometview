import { Fish, Sprout, Mountain, Waves, X } from 'lucide-react'
import clsx from 'clsx'
import { useSettings } from '../settings/SettingsContext'

// Persona selector — used both in Profile and as an inline prompt on the
// Dashboard when no persona is picked yet. Click chooses persona; "X"
// returns to 'general' (no widget).
const OPTIONS = [
  { id: 'fisher',  Icon: Fish,     label: 'Рыбак',          hint: 'Клёв, луна, давление, ветер на воде' },
  { id: 'dacha',   Icon: Sprout,   label: 'Дачник',         hint: 'Заморозки, осадки на неделю, рассада' },
  { id: 'tourist', Icon: Mountain, label: 'Турист',         hint: 'Лучший день выезда, УФ, сухие дни' },
  { id: 'flood',   Icon: Waves,    label: 'Житель паводка', hint: 'Уровень рядом, прогноз на 48 ч' },
]

export default function PersonaPicker({ variant = 'inline', className = '' }) {
  const { settings, updateSettings } = useSettings()
  const active = settings.persona ?? 'general'

  if (variant === 'inline' && active !== 'general') {
    // Compact "currently active" pill with X-to-reset
    const option = OPTIONS.find(o => o.id === active)
    if (!option) return null
    return (
      <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs',
        'bg-blue-50 dark:bg-blue-500/15 text-[#2F80FF] dark:text-blue-300',
        className)}>
        <option.Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
        <span className="font-semibold">Режим: {option.label}</span>
        <button onClick={() => updateSettings({ persona: 'general' })}
                title="Сбросить режим"
                className="-mr-1 p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20">
          <X className="w-3 h-3" strokeWidth={2.4} />
        </button>
      </div>
    )
  }

  // Full picker (used on Dashboard when persona='general' and in Profile page)
  return (
    <div className={clsx('rounded-3xl p-5 transition-colors duration-200',
      'bg-white dark:bg-[#131E36]/80',
      'border border-slate-200/70 dark:border-white/[0.04]',
      'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20',
      className)}>
      <div className="mb-3">
        <div className="text-base font-semibold text-slate-900 dark:text-white">Кому вы хотите видеть данные?</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Выберите режим — на главной появится виджет с самой нужной информацией.
        </div>
      </div>
      <div role="radiogroup" aria-label="Выбор персонального режима" className="grid grid-cols-2 gap-2.5">
        {OPTIONS.map(o => {
          const isActive = active === o.id
          return (
            <button
              key={o.id}
              onClick={() => updateSettings({ persona: o.id })}
              role="radio"
              aria-checked={isActive}
              aria-label={`Режим «${o.label}» — ${o.hint}`}
              className={clsx(
                'text-left rounded-2xl p-3 transition-all border',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/15 border-[#2F80FF]/40 dark:border-blue-400/40 shadow-sm'
                  : 'bg-slate-50/60 dark:bg-white/[0.03] border-slate-200/70 dark:border-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.12]'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <o.Icon className={clsx('w-4 h-4', isActive ? 'text-[#2F80FF] dark:text-blue-300' : 'text-slate-500 dark:text-slate-400')} strokeWidth={2.2} />
                <span className={clsx('text-sm font-semibold',
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200')}>
                  {o.label}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{o.hint}</div>
            </button>
          )
        })}
      </div>
      {active !== 'general' && (
        <button
          onClick={() => updateSettings({ persona: 'general' })}
          className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Сбросить режим
        </button>
      )}
    </div>
  )
}
