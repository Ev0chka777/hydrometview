import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Mail, Lock, Eye, EyeOff, User, ArrowRight, Target, Bell, Star
} from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'
import { useAuth } from '../auth/AuthContext'
import logo from '../assets/logo.svg'

// Stylized scene used as the left-panel background. Renders pure SVG so it
// works offline and adapts to both themes via palette swap.
function NatureScene({ isDark }) {
  const palette = isDark
    ? { sky1: '#0B2447', sky2: '#143164', mid: '#0F2A55', far: '#1A3B6E', near: '#091A3A', water: '#0E2247', haze: 'rgba(255,255,255,0.06)' }
    : { sky1: '#7CB8E8', sky2: '#A9D2F0', mid: '#6FA8D6', far: '#86B9E0', near: '#3B6F9E', water: '#4E89BD', haze: 'rgba(255,255,255,0.18)' }
  return (
    <svg viewBox="0 0 800 1100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky1} />
          <stop offset="100%" stopColor={palette.sky2} />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.water} stopOpacity={0.9} />
          <stop offset="100%" stopColor={palette.water} stopOpacity={0.4} />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="800" height="1100" fill="url(#sky)" />
      {/* Distant mist */}
      <rect y="450" width="800" height="120" fill={palette.haze} />
      {/* Far mountains */}
      <path
        d="M 0 540 L 90 480 L 180 510 L 270 460 L 360 500 L 450 470 L 540 510 L 640 470 L 740 500 L 800 480 L 800 600 L 0 600 Z"
        fill={palette.far}
        opacity="0.9"
      />
      {/* Middle hill / forest */}
      <path
        d="M 0 600 L 80 560 L 160 590 L 260 540 L 350 580 L 460 545 L 560 585 L 660 555 L 760 590 L 800 575 L 800 700 L 0 700 Z"
        fill={palette.mid}
      />
      {/* Tree silhouettes (foreground forest band) */}
      <g fill={palette.near}>
        {Array.from({ length: 22 }).map((_, i) => {
          const x = (i * 800) / 22
          const h = 60 + (i * 13) % 40
          return (
            <path key={i}
              d={`M ${x - 16} 720 L ${x} ${720 - h} L ${x + 16} 720 Z`}
            />
          )
        })}
        <rect x="0" y="715" width="800" height="10" />
      </g>
      {/* Water (river) */}
      <rect y="725" width="800" height="375" fill="url(#water)" />
      {/* Reflections — wavy strokes */}
      <g stroke={palette.haze} strokeWidth="2" fill="none" opacity="0.6">
        <path d="M 50 850 Q 150 845 250 850 T 450 850 T 650 850 T 800 850" />
        <path d="M 80 920 Q 200 915 320 920 T 540 920 T 760 920" />
        <path d="M 30 990 Q 180 985 330 990 T 600 990 T 800 990" />
      </g>
      {/* River bank highlight */}
      <ellipse cx="400" cy="730" rx="500" ry="8" fill="white" opacity={isDark ? 0.05 : 0.2} />
    </svg>
  )
}

// Brand logos for social buttons
function YandexLogo() {
  return (
    <span className="text-2xl font-bold text-[#FC3F1D]" style={{ fontFamily: 'Inter, sans-serif' }}>Я</span>
  )
}
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6">
      <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3a12 12 0 0 1-11.3 8 12 12 0 0 1 0-24c3.06 0 5.85 1.15 7.96 3.04l5.66-5.66A19.94 19.94 0 0 0 24 4a20 20 0 1 0 0 40c11.05 0 20-8.95 20-20 0-1.34-.14-2.65-.39-3.92z" />
      <path fill="#FF3D00" d="M6.31 14.69l6.58 4.82A12 12 0 0 1 24 12c3.06 0 5.85 1.15 7.96 3.04l5.66-5.66A19.94 19.94 0 0 0 24 4a20 20 0 0 0-17.69 10.69z" />
      <path fill="#4CAF50" d="M24 44c5.16 0 9.86-1.98 13.41-5.2l-6.19-5.24A11.92 11.92 0 0 1 24 36a12 12 0 0 1-11.28-7.95L6.2 33.16A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.08 5.56l6.19 5.24c-.44.4 6.6-4.81 6.6-14.8 0-1.34-.14-2.65-.4-3.92z" />
    </svg>
  )
}
function VkLogo() {
  return (
    <span className="text-lg font-extrabold text-[#0077FF] tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>вк</span>
  )
}

export default function AuthPage() {
  const { theme } = useTheme()
  const { login } = useAuth()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('user@hydromet.ru')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // Simulate successful authentication
    login({ email, name: name || email.split('@')[0] })
    navigate(from, { replace: true })
  }

  function handleSocial(provider) {
    login({ email: `${provider}@hydromet.ru`, name: provider })
    navigate(from, { replace: true })
  }

  return (
    <div>
      {/* ============ MOBILE HERO (only shown on small screens) ============
          Compact version of the desktop nature panel — matches the mobile
          mockup with logo, headline and 3 feature pills above the form. */}
      <aside className="relative lg:hidden overflow-hidden rounded-3xl mx-1 mt-2 mb-6 p-6 pb-7">
        <NatureScene isDark={isDark} />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="text-base font-semibold text-white">HydroMetView</span>
          </div>
          <h2 className="text-xl font-bold text-white leading-tight mb-1">Погода и уровень воды</h2>
          <div className="text-xs uppercase tracking-widest font-semibold text-white/70 mb-4">всегда под рукой</div>
          <ul className="space-y-2">
            {[
              { Icon: Target, t: 'Точные данные',           s: 'Мониторинг в реальном времени' },
              { Icon: Bell,   t: 'Уведомления о паводках', s: 'Предупреждения об опасностях' },
              { Icon: Star,   t: 'Бесплатный базовый доступ', s: 'Все основные функции сразу' },
            ].map(({ Icon, t, s }) => (
              <li key={t} className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-white/10 backdrop-blur-sm">
                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 shrink-0">
                  <Icon className="w-4 h-4 text-blue-200" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t}</div>
                  <div className="text-[11px] text-white/70 truncate">{s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-8rem)]">
        {/* ============ LEFT — nature panel (desktop only) ============ */}
        <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
          <NatureScene isDark={isDark} />

          {/* Top: logo */}
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={logo}
              alt="HydroMetView"
              className="h-14 w-14 object-contain"
            />
            <span className="text-2xl font-semibold text-white tracking-tight">HydroMetView</span>
          </div>

          {/* Middle: heading + benefits */}
          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-white tracking-tight mb-8">Всегда под рукой!</h2>
            <ul className="space-y-3 max-w-[320px]">
              <BenefitRow
                icon={<Target className="w-5 h-5 text-blue-300" strokeWidth={2.2} />}
                title="Точные данные"
                subtitle="Мониторинг в реальном времени"
              />
              <BenefitRow
                icon={<Bell className="w-5 h-5 text-blue-300" strokeWidth={2.2} />}
                title="Уведомления о паводках"
                subtitle="Предупреждения об опасностях"
              />
              <BenefitRow
                icon={<Star className="w-5 h-5 text-blue-300" strokeWidth={2.2} fill="#93C5FD" />}
                title="Бесплатный базовый доступ"
                subtitle="Все необходимые функции сразу"
              />
            </ul>
          </div>

          {/* Bottom: copyright */}
          <div className="relative z-10 text-xs text-white/60">
            © 2026 HydroMetView. Все права защищены.
          </div>
        </aside>

        {/* ============ RIGHT — form ============ */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Tabs */}
            <div className="relative grid grid-cols-2 mb-6 border-b border-slate-200 dark:border-white/[0.08] transition-colors duration-200">
              <TabButton active={mode === 'login'} onClick={() => setMode('login')}>Вход</TabButton>
              <TabButton active={mode === 'register'} onClick={() => setMode('register')}>Регистрация</TabButton>
              {/* Underline indicator */}
              <span
                className="absolute bottom-[-1px] h-0.5 bg-[#2F80FF] transition-all duration-300"
                style={{ left: mode === 'login' ? '0%' : '50%', width: '50%' }}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field — register only */}
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-out',
                  mode === 'register' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <FieldLabel>Имя пользователя</FieldLabel>
                <InputWithIcon
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Иван Петров"
                />
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email</FieldLabel>
                <InputWithIcon
                  icon={<Mail className="w-4 h-4" />}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@hydromet.ru"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-baseline justify-between">
                  <FieldLabel>Пароль</FieldLabel>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-xs font-medium text-[#2F80FF] hover:underline transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  )}
                </div>
                <InputWithIcon
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Confirm password — register only */}
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-out',
                  mode === 'register' ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <FieldLabel>Повторите пароль</FieldLabel>
                <InputWithIcon
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200
                           bg-[#2F80FF] hover:bg-[#3a8bff] active:scale-[0.98]
                           text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40"
              >
                {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6 text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.08]" />
              или войти через
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.08]" />
            </div>

            {/* Social */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <SocialButton onClick={() => handleSocial('yandex')}><YandexLogo /></SocialButton>
              <SocialButton onClick={() => handleSocial('google')}><GoogleLogo /></SocialButton>
              <SocialButton onClick={() => handleSocial('vk')}><VkLogo /></SocialButton>
            </div>

            {/* Bottom banner */}
            <div className="rounded-2xl p-4 text-center transition-colors duration-200
                            bg-blue-50/70 dark:bg-[#101E3E]/80
                            border border-blue-100 dark:border-white/[0.06]
                            backdrop-blur-sm">
              <p className="text-xs text-slate-600 dark:text-slate-400 transition-colors duration-200 mb-2">
                {mode === 'login'
                  ? 'Впервые у нас? Создайте аккаунт, чтобы сохранять свои локации.'
                  : 'Уже зарегистрированы? Войдите, чтобы получить доступ к своим данным.'}
              </p>
              <button
                type="button"
                onClick={() => setMode(m => (m === 'login' ? 'register' : 'login'))}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-[#2F80FF] hover:text-[#1E5BC6] transition-colors"
              >
                {mode === 'login' ? 'Перейти к регистрации' : 'Вернуться ко входу'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ subcomponents ============

function BenefitRow({ icon, title, subtitle }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-2xl
                   bg-white/10 backdrop-blur-md border border-white/10 transition-colors duration-200">
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white leading-tight">{title}</div>
        <div className="text-xs text-white/70 leading-tight mt-0.5">{subtitle}</div>
      </div>
    </li>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'pb-3 text-sm font-semibold transition-colors duration-200',
        active
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      )}
    >
      {children}
    </button>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-slate-400 transition-colors duration-200">
      {children}
    </label>
  )
}

function InputWithIcon({ icon, trailing, ...inputProps }) {
  return (
    <div className="relative group">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F80FF] transition-colors duration-200 pointer-events-none">
        {icon}
      </span>
      <input
        {...inputProps}
        className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200
                   bg-white dark:bg-[#101E3E]/80
                   border border-slate-200 dark:border-white/[0.08]
                   text-slate-900 dark:text-white
                   placeholder-slate-400 dark:placeholder-slate-500
                   shadow-sm dark:shadow-none
                   focus:border-[#2F80FF] focus:ring-2 focus:ring-[#2F80FF]/20"
      />
      {trailing && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </div>
  )
}

function SocialButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                 bg-white dark:bg-[#101E3E]/80
                 border border-slate-200 dark:border-white/[0.08]
                 shadow-sm dark:shadow-none
                 hover:shadow-md hover:border-slate-300 dark:hover:border-white/[0.15]"
    >
      {children}
    </button>
  )
}
