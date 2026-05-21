import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import {
  Zap, ShieldCheck, Cloud, Waves, RotateCcw,
  ChevronDown, Mail, Send, Code2
} from 'lucide-react'
import logo from '../assets/logo.svg'

const faqItems = [
  {
    id: 'updates',
    q: 'Как часто обновляются данные?',
    a: <p>Мы синхронизируем данные с нашими источниками каждые <b className="text-slate-900 dark:text-white">30 минут</b>. Это обеспечивает актуальность информации даже во время паводков или резких изменений погоды.</p>,
  },
  {
    id: 'markers',
    q: 'Что означают цвета маркеров на карте?',
    a: (
      <div>
        <p className="mb-3">Для удобства мы используем световую индикацию:</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
            <span><b className="text-slate-900 dark:text-white">Синий:</b> холодно или низкий уровень воды</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] mt-1.5 shrink-0" />
            <span><b className="text-slate-900 dark:text-white">Зелёный:</b> температурная норма или безопасный уровень</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
            <span><b className="text-slate-900 dark:text-white">Красный:</b> жара или критически высокий уровень (опасность затопления)</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'add',
    q: 'Как добавить свой город?',
    a: <p>Воспользуйтесь поисковой строкой вверху главного экрана. Введите название города, и система автоматически найдёт ближайшие к нему метеостанции и гидропосты.</p>,
  },
  {
    id: 'price',
    q: 'Это бесплатно?',
    a: <p>Базовый функционал — мониторинг текущего состояния и прогноз на 3 дня — абсолютно бесплатен для всех пользователей. Для тех, кому нужна аналитика за прошлые годы и оповещения в Telegram, предусмотрена Premium-подписка.</p>,
  },
]

// Stylized illustration for the "Остались вопросы?" banner
function SupportTeamArt() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      <defs>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6E4FB" />
          <stop offset="100%" stopColor="#A5C2EE" />
        </linearGradient>
      </defs>
      {/* Floor ellipse */}
      <ellipse cx="120" cy="200" rx="100" ry="14" fill="url(#floorGrad)" opacity="0.6" />

      {/* Person 1 — left */}
      <g transform="translate(60 90)">
        <circle cx="0" cy="0" r="16" fill="#F2C7A4" /> {/* head */}
        <path d="M -12 -8 Q 0 -22 12 -8 L 12 4 Q 0 -2 -12 4 Z" fill="#F59E0B" /> {/* hair */}
        <path d="M -22 56 L -22 26 Q -22 14 0 14 Q 22 14 22 26 L 22 56 Z" fill="#3B82F6" /> {/* body */}
        <path d="M -22 30 L -34 50 L -28 56 L -16 38 Z" fill="#3B82F6" /> {/* arm */}
      </g>

      {/* Person 2 — center (lead) */}
      <g transform="translate(120 80)">
        <circle cx="0" cy="0" r="18" fill="#F2C7A4" />
        <path d="M -14 -8 Q 0 -24 14 -8 L 14 6 Q 0 -2 -14 6 Z" fill="#1F2937" />
        <path d="M -26 70 L -26 28 Q -26 14 0 14 Q 26 14 26 28 L 26 70 Z" fill="#1E40AF" />
        <rect x="-6" y="14" width="12" height="20" fill="#FFFFFF" />
        <rect x="-3" y="18" width="6" height="14" fill="#1E40AF" />
      </g>

      {/* Person 3 — right */}
      <g transform="translate(180 95)">
        <circle cx="0" cy="0" r="15" fill="#F2C7A4" />
        <path d="M -12 -8 Q 0 -22 12 -10 L 14 8 Q 0 -2 -12 6 Z" fill="#7C3AED" />
        <path d="M -20 54 L -20 26 Q -20 14 0 14 Q 20 14 20 26 L 20 54 Z" fill="#22C55E" />
        <path d="M 20 28 L 32 46 L 26 52 L 14 36 Z" fill="#22C55E" />
      </g>
    </svg>
  )
}

export default function FaqPage() {
  const [openId, setOpenId] = useState('updates')

  const card =
    'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
    'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="pt-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="animate-[fadeUp_500ms_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors duration-200
                            bg-blue-100/70 text-[#2F80FF]
                            dark:bg-blue-500/15 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F80FF]" />
              О проекте HydroMetView
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mt-5 leading-[1.1] text-slate-900 dark:text-white transition-colors duration-200">
              Вся гидрология и погода<br />
              в <span className="text-[#2F80FF]">одном окне</span>
            </h1>

            <p className="text-sm sm:text-base mt-4 max-w-md text-slate-600 dark:text-slate-300 transition-colors duration-200">
              Мы создали технологичный инструмент для бесплатного мониторинга водных ресурсов и погодных условий по всей России.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <div className={`${card} rounded-2xl px-4 py-3 flex items-center gap-3`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200
                                bg-blue-50 dark:bg-blue-500/15">
                  <Zap className="w-4 h-4 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">Скорость</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">10 сек на проверку</div>
                </div>
              </div>
              <div className={`${card} rounded-2xl px-4 py-3 flex items-center gap-3`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200
                                bg-emerald-50 dark:bg-emerald-500/15">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">Надежность</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">Официальные данные</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: logo showcase */}
          <div className="aspect-square w-full max-w-[460px] justify-self-center lg:justify-self-end flex items-center justify-center">
            <img
              src={logo}
              alt="HydroMetView"
              className="w-64 h-64 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ============ TWO COLUMNS — about + sources ============ */}
      <section className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Что это за сервис? */}
          <div>
            <div className="w-10 h-0.5 bg-[#2F80FF] rounded-full mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200 mb-4">
              Что это за сервис?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200 mb-4 leading-relaxed">
              <span className="font-semibold text-[#2F80FF]">HydroMetView</span> — это бесплатный сервис, который объединяет данные о погоде и уровне воды в реках России.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200 mb-6 leading-relaxed">
              Мы создали его, чтобы вы могли за <span className="font-semibold text-[#2F80FF]">10 секунд</span> узнать: какая будет погода, что надеть и не затопит ли вашу дачу. Наша миссия — сделать сложные гидрометеорологические данные доступными и понятными для каждого жителя страны.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <StatTile value="500+" label="Гидропостов" card={card} />
              <StatTile value="1000+" label="Городов" card={card} />
              <StatTile value="24/7" label="Мониторинг" card={card} />
            </div>
          </div>

          {/* Откуда данные? */}
          <div>
            <div className="w-10 h-0.5 bg-[#2F80FF] rounded-full mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200 mb-4">
              Откуда данные?
            </h2>

            <div className="space-y-3">
              <SourceCard
                card={card}
                icon={<Cloud className="w-5 h-5 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.2} />}
                iconBg="bg-blue-50 dark:bg-blue-500/15"
                title="Метеоданные:"
                source="OpenWeatherMap"
                description="Глобальный поставщик точных погодных условий и прогнозов с высоким разрешением."
              />
              <SourceCard
                card={card}
                icon={<Waves className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />}
                iconBg="bg-emerald-50 dark:bg-emerald-500/15"
                title="Гидроданные:"
                source="ЦГМС"
                description="Центры по гидрометеорологии и мониторингу окружающей среды (ЦГМС) предоставляют официальные уровни рек."
              />
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
              <RotateCcw className="w-3.5 h-3.5" />
              Данные обновляются автоматически <b className="text-slate-700 dark:text-slate-200 font-semibold">каждые 30 минут</b>.
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ACCORDIONS ============ */}
      <section className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
            Часто задаваемые вопросы
          </h2>
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Ответы на самые популярные вопросы о работе сервиса HydroMetView
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqItems.map(item => {
            const isOpen = openId === item.id
            return (
              <div
                key={item.id}
                className={clsx(
                  card,
                  'rounded-2xl overflow-hidden transition-all duration-200',
                  isOpen && 'shadow-md dark:shadow-2xl'
                )}
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'w-4 h-4 shrink-0 transition-transform duration-300',
                      isOpen ? 'rotate-180 text-[#2F80FF]' : 'text-slate-400 dark:text-slate-500'
                    )}
                    strokeWidth={2.4}
                  />
                </button>

                {/* Smooth grid-row collapse */}
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 transition-colors duration-200 leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============ CONTACT BANNER ============ */}
      <section className="py-12">
        <div className="rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-center transition-colors duration-200
                        bg-[#1A3578] dark:bg-[#13224A]
                        shadow-xl shadow-blue-900/20 dark:shadow-black/40">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Остались вопросы?</h3>
            <p className="text-sm text-white/70 mb-5">
              Наша команда поддержки всегда готова помочь вам.<br />
              Свяжитесь с нами удобным для вас способом.
            </p>

            <a
              href="mailto:support@hydrometview.ru"
              className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-blue-200 transition-colors mb-5"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              support@hydrometview.ru
            </a>

            <div className="flex gap-2">
              <SocialIconButton aria-label="Telegram">
                <Send className="w-4 h-4 text-white" strokeWidth={2.2} fill="white" />
              </SocialIconButton>
              <SocialIconButton aria-label="VK">
                <span className="text-xs font-extrabold text-white">вк</span>
              </SocialIconButton>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 aspect-square w-full max-w-[240px] justify-self-end">
            <SupportTeamArt />
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="pt-12 pb-8 mt-6 border-t transition-colors duration-200
                         border-slate-200/70 dark:border-white/[0.04]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <NavLink to="/" className="flex items-center gap-3 mb-4">
              <img
                src={logo}
                alt="HydroMetView"
                className="h-9 w-9 object-contain"
              />
              <span className="text-base font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                HydroMet<span className="text-[#2F80FF]">View</span>
              </span>
            </NavLink>
            <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200 leading-relaxed">
              Инновационная платформа мониторинга гидрометеорологических данных в режиме реального времени.
            </p>
          </div>

          <FooterColumn
            title="Продукт"
            items={[
              { label: 'Карта станций', to: '/map' },
              { label: 'Графики уровней', to: '/charts' },
              { label: 'Прогноз погоды', to: '/weather' },
              { label: 'API для разработчиков' },
            ]}
          />
          <FooterColumn
            title="Помощь"
            items={[
              { label: 'Документация' },
              { label: 'База знаний' },
              { label: 'Техподдержка' },
              { label: 'Статус сервиса' },
            ]}
          />

          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
              Разработка
            </h4>
            <a
              href="#"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-colors duration-200
                         bg-white hover:bg-slate-50 border border-slate-200
                         dark:bg-[#131E36]/80 dark:hover:bg-[#1A2746] dark:border-white/[0.06]
                         shadow-sm dark:shadow-none"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">Создано командой</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">HydroDev Labs</div>
              </div>
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-slate-200/70 dark:border-white/[0.04] transition-colors duration-200">
          <div className="text-xs text-slate-500 dark:text-slate-500 transition-colors duration-200">
            © 2026 HydroMetView. Все права защищены.
          </div>
          <div className="flex gap-5 text-xs">
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline-offset-2 hover:underline">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline-offset-2 hover:underline">
              Условия использования
            </a>
          </div>
        </div>
      </footer>

      {/* Local keyframes for fade-in */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}

// ============ subcomponents ============

function StatTile({ value, label, card }) {
  return (
    <div className={`${card} rounded-2xl px-3 py-4 text-center`}>
      <div className="text-2xl font-bold text-[#2F80FF] dark:text-blue-300 transition-colors duration-200">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-semibold mt-1 text-slate-500 dark:text-slate-400 transition-colors duration-200">{label}</div>
    </div>
  )
}

function SourceCard({ card, icon, iconBg, title, source, description }) {
  return (
    <div className={`${card} rounded-2xl p-4 flex items-start gap-3`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-200 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors duration-200">
          <span className="font-semibold">{title}</span>{' '}
          <span className="font-bold text-[#2F80FF] dark:text-blue-300">{source}</span>
        </div>
        <p className="text-xs mt-1 leading-relaxed text-slate-500 dark:text-slate-400 transition-colors duration-200">
          {description}
        </p>
      </div>
    </div>
  )
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
        {title}
      </h4>
      <ul className="space-y-2 text-sm">
        {items.map(({ label, to }) => (
          <li key={label}>
            {to ? (
              <NavLink
                to={to}
                className="text-slate-600 hover:text-[#2F80FF] dark:text-slate-300 dark:hover:text-blue-300 transition-colors"
              >
                {label}
              </NavLink>
            ) : (
              <a
                href="#"
                className="text-slate-600 hover:text-[#2F80FF] dark:text-slate-300 dark:hover:text-blue-300 transition-colors"
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialIconButton({ children, ...rest }) {
  return (
    <button
      {...rest}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  )
}
