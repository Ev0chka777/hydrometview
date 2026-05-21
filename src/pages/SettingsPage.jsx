import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  User, Mail, Phone, Lock, Camera, MapPin, Check, Save, RotateCcw,
  Activity, Bell, Map as MapIcon, Ruler, Languages, Star,
  ShieldAlert, Wind, Thermometer, Gauge, Upload, KeyRound, Image as ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useFavorites } from '../favorites/FavoritesContext'
import { useSettings } from '../settings/SettingsContext'
import { t } from '../settings/i18n'
import { TEMP_UNITS, WIND_UNITS, PRESSURE_UNITS } from '../settings/units'
import { requestNotificationPermission } from '../hooks/useFloodAlerts'

// ============================================================
// Preset SVG avatars (5 brand-themed)
// ============================================================
function makePresetAvatar(g1, g2, glyph) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${g1}'/><stop offset='100%' stop-color='${g2}'/>
    </linearGradient></defs>
    <rect width='64' height='64' rx='16' fill='url(#g)'/>
    <g fill='white'>${glyph}</g>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const PRESET_AVATARS = [
  // Sun
  makePresetAvatar('#2F80FF', '#1E5BC6',
    "<circle cx='32' cy='32' r='10'/><g stroke='white' stroke-width='3' stroke-linecap='round'>" +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r = a * Math.PI / 180
      return `<line x1='${32 + Math.cos(r) * 16}' y1='${32 + Math.sin(r) * 16}' x2='${32 + Math.cos(r) * 22}' y2='${32 + Math.sin(r) * 22}'/>`
    }).join('') + '</g>'
  ),
  // Cloud
  makePresetAvatar('#0EA5E9', '#0369A1',
    "<path d='M16 38 Q16 28 26 28 Q28 20 36 20 Q48 20 48 30 Q54 30 54 36 Q54 44 46 44 H22 Q14 44 14 38 Q14 38 16 38Z'/>"
  ),
  // Drop
  makePresetAvatar('#22C55E', '#15803D',
    "<path d='M32 14 C24 26 20 32 20 40 A12 12 0 0 0 44 40 C44 32 40 26 32 14 Z'/>"
  ),
  // Wave
  makePresetAvatar('#F59E0B', '#B45309',
    "<path d='M10 36 Q18 28 26 36 T42 36 T58 36 L58 44 Q50 52 42 44 T26 44 T10 44 Z'/>"
  ),
  // Bolt
  makePresetAvatar('#A855F7', '#6D28D9',
    "<path d='M34 12 L18 36 H30 L26 52 L46 28 H34 L38 12 Z'/>"
  ),
]

// ============================================================
// Animated toggle
// ============================================================
function Toggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[#2F80FF]/40 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0A1428]',
        checked
          ? 'bg-[#2F80FF]'
          : 'bg-slate-300 dark:bg-[#22305A]'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ============================================================
// Shared styling tokens
// ============================================================
const card =
  'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
  'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

const inputClass =
  'w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors duration-200 ' +
  'bg-slate-50 dark:bg-[#0F1A33] ' +
  'border border-slate-200 dark:border-white/[0.06] ' +
  'text-slate-900 dark:text-white ' +
  'placeholder-slate-400 dark:placeholder-slate-500 ' +
  'focus:border-[#2F80FF] focus:ring-2 focus:ring-[#2F80FF]/20'

function Field({ icon, label, error, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-slate-400 transition-colors duration-200">
        {label}
      </span>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3 h-3" strokeWidth={2.4} />
          {error}
        </span>
      )}
    </label>
  )
}

function Row({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4 border-b border-slate-200/60 dark:border-white/[0.05] last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-white transition-colors duration-200">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-200">{subtitle}</div>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function RadioCard({ active, onClick, title, subtitle, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-left rounded-2xl px-4 py-3 transition-all duration-200 border flex items-center gap-3',
        active
          ? 'bg-blue-50 dark:bg-blue-500/15 border-[#2F80FF]/50 dark:border-blue-400/40 shadow-sm'
          : 'bg-white dark:bg-[#0F1A33] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
      )}
    >
      {icon && (
        <span className={clsx(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          active
            ? 'bg-[#2F80FF] text-white'
            : 'bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400'
        )}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-200">{subtitle}</div>
        )}
      </div>
      {active && (
        <span className="w-5 h-5 rounded-full bg-[#2F80FF] flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

// ============================================================
// Main page
// ============================================================
const TABS = [
  { id: 'profile', icon: User, key: 'tab.profile' },
  { id: 'activity', icon: Activity, key: 'tab.activity' },
  { id: 'geolocation', icon: MapPin, key: 'tab.geolocation' },
  { id: 'notifications', icon: Bell, key: 'tab.notifications' },
  { id: 'map', icon: MapIcon, key: 'tab.map' },
  { id: 'units', icon: Ruler, key: 'tab.units' },
  { id: 'language', icon: Languages, key: 'tab.language' },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { favorites } = useFavorites()
  const {
    settings, updateSettings, updateSection, resetSettings,
    requestGeolocation, disableGeolocation,
  } = useSettings()
  const lang = settings.language
  const tr = (k) => t(lang, k)

  const [activeTab, setActiveTab] = useState('profile')
  const [savedFlash, setSavedFlash] = useState(false)

  // Profile draft (committed via Save)
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  })
  const [profileErrors, setProfileErrors] = useState({})

  // Password draft
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)

  // Avatar drag-and-drop
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  // Live browser Notification permission state (granted/denied/default/unsupported).
  // We re-read on visibility change in case the user toggles it in browser settings.
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })
  useEffect(() => {
    const refresh = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      setNotifPermission(Notification.permission)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // Toggle handler that also requests permission if the user enables a switch
  // for the first time. Keeps the in-app preference and the browser permission
  // honestly in sync — no silent failure where the toggle is "on" but the
  // browser would never let us fire a notification.
  const handleNotificationToggle = async (key, value) => {
    updateSection('notifications', { [key]: value })
    if (value && notifPermission === 'default') {
      const result = await requestNotificationPermission()
      setNotifPermission(result)
    }
  }

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
  }

  // Sync profile draft if user changes externally (e.g. reset/logout/login)
  useEffect(() => {
    setProfileDraft({
      name: user?.name ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    })
  }, [user?.name, user?.lastName, user?.email, user?.phone])

  function validateProfile() {
    const errs = {}
    if (profileDraft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileDraft.email)) {
      errs.email = tr('profile.errors.email')
    }
    if (profileDraft.phone && !/^[+]?[\d\s()-]{7,20}$/.test(profileDraft.phone)) {
      errs.phone = tr('profile.errors.phone')
    }
    setProfileErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSaveAll() {
    if (!validateProfile()) return
    updateUser(profileDraft)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2200)
  }

  function handleReset() {
    if (!window.confirm(tr('settings.reset.confirm'))) return
    resetSettings()
  }

  function handleAvatarFile(file) {
    if (!file || !file.type?.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => updateUser({ avatar: reader.result })
    reader.readAsDataURL(file)
  }

  function handleAvatarDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleAvatarFile(file)
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    setPwdError('')
    if (user?.password && pwd.current !== user.password) {
      setPwdError(tr('profile.errors.passwordCurrent')); return
    }
    if (!pwd.next || pwd.next.length < 6) {
      setPwdError(tr('profile.errors.passwordLength')); return
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError(tr('profile.errors.passwordMatch')); return
    }
    updateUser({ password: pwd.next })
    setPwd({ current: '', next: '', confirm: '' })
    setPwdSaved(true)
    setTimeout(() => setPwdSaved(false), 2200)
  }

  const registeredDate = settings.activity.registeredAt
    ? new Date(settings.activity.registeredAt).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'ru-RU',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    : '—'

  const favoritesCount = (favorites.posts?.length ?? 0) + (favorites.cities?.length ?? 0)

  return (
    <div className="max-w-6xl mx-auto">
      {/* ===== Top bar ===== */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
            {tr('settings.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">
            {tr('settings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              {tr('settings.saved')}
            </span>
          )}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                       bg-white hover:bg-slate-50 text-slate-700 border border-slate-200
                       dark:bg-[#1A2746]/80 dark:hover:bg-[#22305A] dark:text-slate-200 dark:border-white/[0.06]"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={2.2} />
            {tr('settings.reset')}
          </button>
          <button
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors
                       bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                       shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
          >
            <Save className="w-4 h-4" strokeWidth={2.2} />
            {tr('settings.save')}
          </button>
        </div>
      </header>

      {/* ===== Layout: sidebar + content ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <aside className={`${card} rounded-3xl p-3 h-fit lg:sticky lg:top-24`}>
          <ul className="space-y-1">
            {TABS.map(({ id, icon: Icon, key }) => {
              const active = activeTab === id
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveTab(id)}
                    className={clsx(
                      'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-200',
                      active
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-[#2F80FF] dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.2} />
                    {tr(key)}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Content */}
        <div className="space-y-6 min-w-0">
          {activeTab === 'profile' && (
            <>
              {/* Avatar */}
              <section className={`${card} rounded-3xl p-6`}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                  {tr('profile.avatar')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                  {tr('profile.avatarHint')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-start">
                  {/* Current avatar preview */}
                  <div className="flex flex-col items-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-28 h-28 rounded-3xl object-cover ring-4 ring-blue-100 dark:ring-blue-900/30" />
                    ) : (
                      <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] flex items-center justify-center text-white text-4xl font-bold ring-4 ring-blue-100 dark:ring-blue-900/30">
                        {(profileDraft.name?.[0] || profileDraft.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Drop zone + presets */}
                  <div className="space-y-4">
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleAvatarDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                      className={clsx(
                        'rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors duration-200 cursor-pointer',
                        dragOver
                          ? 'border-[#2F80FF] bg-blue-50/70 dark:bg-blue-500/10'
                          : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16]'
                      )}
                    >
                      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" strokeWidth={2.2} />
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors duration-200">
                        {tr('profile.avatarDrop')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">
                        {tr('profile.avatarOr')}{' '}
                        <span className="text-[#2F80FF] dark:text-blue-300 font-semibold">
                          {tr('profile.avatarPick')}
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleAvatarFile(e.target.files?.[0])}
                      />
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-2 transition-colors duration-200">
                        {tr('profile.avatarPresets')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_AVATARS.map((src, i) => {
                          const active = user?.avatar === src
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => updateUser({ avatar: src })}
                              className={clsx(
                                'w-14 h-14 rounded-2xl overflow-hidden transition-all duration-200',
                                active
                                  ? 'ring-2 ring-[#2F80FF] ring-offset-2 ring-offset-white dark:ring-offset-[#131E36] scale-105'
                                  : 'hover:scale-105 ring-1 ring-slate-200 dark:ring-white/[0.06]'
                              )}
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </button>
                          )
                        })}
                        {user?.avatar && (
                          <button
                            type="button"
                            onClick={() => updateUser({ avatar: null })}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-medium transition-colors
                                       bg-slate-100 hover:bg-slate-200 text-slate-600
                                       dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-400"
                            title="Очистить аватар"
                          >
                            <ImageIcon className="w-4 h-4" strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Account fields */}
              <section className={`${card} rounded-3xl p-6`}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                  {tr('profile.account')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                  {tr('profile.accountSub')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={<User className="w-4 h-4" />} label={tr('profile.firstName')}>
                    <input
                      type="text"
                      value={profileDraft.name}
                      onChange={e => setProfileDraft(p => ({ ...p, name: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field icon={<User className="w-4 h-4" />} label={tr('profile.lastName')}>
                    <input
                      type="text"
                      value={profileDraft.lastName}
                      onChange={e => setProfileDraft(p => ({ ...p, lastName: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field icon={<Mail className="w-4 h-4" />} label={tr('profile.email')} error={profileErrors.email}>
                    <input
                      type="email"
                      value={profileDraft.email}
                      onChange={e => setProfileDraft(p => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field icon={<Phone className="w-4 h-4" />} label={tr('profile.phone')} error={profileErrors.phone}>
                    <input
                      type="tel"
                      value={profileDraft.phone}
                      onChange={e => setProfileDraft(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+7 (___) ___-__-__"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* Password */}
              <section className={`${card} rounded-3xl p-6`}>
                <div className="flex items-center gap-3 mb-1">
                  <KeyRound className="w-5 h-5 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.2} />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                    {tr('profile.password')}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                  {tr('profile.passwordSub')}
                </p>

                <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field icon={<Lock className="w-4 h-4" />} label={tr('profile.passwordCurrent')}>
                    <input
                      type="password"
                      value={pwd.current}
                      onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                      className={inputClass}
                      autoComplete="current-password"
                    />
                  </Field>
                  <Field icon={<Lock className="w-4 h-4" />} label={tr('profile.passwordNew')}>
                    <input
                      type="password"
                      value={pwd.next}
                      onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field icon={<Lock className="w-4 h-4" />} label={tr('profile.passwordConfirm')}>
                    <input
                      type="password"
                      value={pwd.confirm}
                      onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </Field>

                  <div className="sm:col-span-3 flex items-center justify-end gap-3">
                    {pwdError && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.4} />
                        {pwdError}
                      </span>
                    )}
                    {pwdSaved && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {tr('settings.saved')}
                      </span>
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors
                                 bg-slate-900 hover:bg-slate-800 text-white
                                 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                    >
                      {tr('profile.passwordUpdate')}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}

          {activeTab === 'activity' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('activity.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                {tr('activity.sub')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatTile
                  icon={<User className="w-5 h-5 text-blue-500 dark:text-blue-300" strokeWidth={2.2} />}
                  iconBg="bg-blue-50 dark:bg-blue-500/15"
                  label={tr('activity.registeredAt')}
                  value={registeredDate}
                />
                <StatTile
                  icon={<Star className="w-5 h-5 text-amber-500 dark:text-amber-300" strokeWidth={2.2} fill="currentColor" />}
                  iconBg="bg-amber-50 dark:bg-amber-500/15"
                  label={tr('activity.favorites')}
                  value={favoritesCount}
                />
                <StatTile
                  icon={<MapPin className="w-5 h-5 text-emerald-500 dark:text-emerald-300" strokeWidth={2.2} />}
                  iconBg="bg-emerald-50 dark:bg-emerald-500/15"
                  label={tr('activity.hydropostsViewed')}
                  value={settings.activity.hydropostsViewed}
                  hint={tr('activity.session')}
                />
              </div>
            </section>
          )}

          {activeTab === 'geolocation' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('geo.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
                {tr('geo.sub')}
              </p>

              <Row
                title={tr('geo.toggle')}
                subtitle={tr('geo.toggleSub')}
                action={
                  <Toggle
                    checked={settings.geolocation.enabled}
                    onChange={(v) => v ? requestGeolocation() : disableGeolocation()}
                    ariaLabel={tr('geo.toggle')}
                  />
                }
              />

              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#0F1A33] border border-slate-200 dark:border-white/[0.06] px-4 py-3 transition-colors duration-200">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-1 transition-colors duration-200">
                  {tr('geo.coords')}
                </div>
                {settings.geolocation.coords ? (
                  <div className="text-sm font-mono text-slate-900 dark:text-white transition-colors duration-200">
                    {settings.geolocation.coords.lat.toFixed(4)}°, {settings.geolocation.coords.lon.toFixed(4)}°
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-200">
                    {tr('geo.notSet')}
                  </div>
                )}
                {settings.geolocation.error && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.4} />
                    {settings.geolocation.error}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('notif.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 transition-colors duration-200">
                {tr('notif.sub')}
              </p>

              {/* Live browser permission status — without this, the toggles below
                  could appear "on" while the browser blocks all notifications. */}
              <NotificationPermissionPanel
                state={notifPermission}
                onRequest={handleRequestPermission}
                tr={tr}
              />

              <Row
                title={
                  <span className="inline-flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" strokeWidth={2.2} />
                    {tr('notif.critical')}
                  </span>
                }
                subtitle={tr('notif.criticalSub')}
                action={
                  <Toggle
                    checked={settings.notifications.criticalWater}
                    onChange={v => handleNotificationToggle('criticalWater', v)}
                    ariaLabel={tr('notif.critical')}
                  />
                }
              />
              <Row
                title={
                  <span className="inline-flex items-center gap-2">
                    <Wind className="w-4 h-4 text-amber-500 dark:text-amber-400" strokeWidth={2.2} />
                    {tr('notif.storm')}
                  </span>
                }
                subtitle={tr('notif.stormSub')}
                action={
                  <Toggle
                    checked={settings.notifications.storm}
                    onChange={v => handleNotificationToggle('storm', v)}
                    ariaLabel={tr('notif.storm')}
                  />
                }
              />
            </section>
          )}

          {activeTab === 'map' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('map.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-200">
                {tr('map.sub')}
              </p>

              <Row
                title={tr('map.riverNames')}
                subtitle={tr('map.riverNamesSub')}
                action={
                  <Toggle
                    checked={settings.map.showRiverNames}
                    onChange={v => updateSection('map', { showRiverNames: v })}
                    ariaLabel={tr('map.riverNames')}
                  />
                }
              />

              <div className="mt-5">
                <div className="text-sm font-medium text-slate-900 dark:text-white mb-3 transition-colors duration-200">
                  {tr('map.markerStyle')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RadioCard
                    active={settings.map.markerStyle === 'simple'}
                    onClick={() => updateSection('map', { markerStyle: 'simple' })}
                    title={tr('map.markerSimple')}
                    subtitle={tr('map.markerSimpleSub')}
                    icon={<span className="block w-3 h-3 rounded-full bg-current" />}
                  />
                  <RadioCard
                    active={settings.map.markerStyle === 'detailed'}
                    onClick={() => updateSection('map', { markerStyle: 'detailed' })}
                    title={tr('map.markerDetailed')}
                    subtitle={tr('map.markerDetailedSub')}
                    icon={<MapPin className="w-4 h-4" strokeWidth={2.4} />}
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'units' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('units.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                {tr('units.sub')}
              </p>

              <UnitGroup
                title={tr('units.temp')}
                icon={<Thermometer className="w-5 h-5 text-red-500 dark:text-red-400" strokeWidth={2.2} />}
                value={settings.units.temp}
                onChange={v => updateSection('units', { temp: v })}
                options={Object.entries(TEMP_UNITS).map(([k, u]) => ({
                  value: k, label: u.label, sub: lang === 'en' ? u.longEn : u.long,
                }))}
              />

              <UnitGroup
                title={tr('units.wind')}
                icon={<Wind className="w-5 h-5 text-emerald-500 dark:text-emerald-400" strokeWidth={2.2} />}
                value={settings.units.wind}
                onChange={v => updateSection('units', { wind: v })}
                options={Object.entries(WIND_UNITS).map(([k, u]) => ({
                  value: k, label: lang === 'en' ? u.labelEn : u.label,
                  sub: lang === 'en' ? u.longEn : u.long,
                }))}
              />

              <UnitGroup
                title={tr('units.pressure')}
                icon={<Gauge className="w-5 h-5 text-pink-500 dark:text-pink-300" strokeWidth={2.2} />}
                value={settings.units.pressure}
                onChange={v => updateSection('units', { pressure: v })}
                options={Object.entries(PRESSURE_UNITS).map(([k, u]) => ({
                  value: k, label: lang === 'en' ? u.labelEn : u.label,
                  sub: lang === 'en' ? u.longEn : u.long,
                }))}
              />
            </section>
          )}

          {activeTab === 'language' && (
            <section className={`${card} rounded-3xl p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
                {tr('lang.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
                {tr('lang.sub')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <RadioCard
                  active={lang === 'ru'}
                  onClick={() => updateSettings({ language: 'ru' })}
                  title={tr('lang.ru')}
                  subtitle="RU · Русский"
                  icon={<span className="text-sm font-bold">RU</span>}
                />
                <RadioCard
                  active={lang === 'en'}
                  onClick={() => updateSettings({ language: 'en' })}
                  title={tr('lang.en')}
                  subtitle="EN · English"
                  icon={<span className="text-sm font-bold">EN</span>}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================
function StatTile({ icon, iconBg, label, value, hint }) {
  return (
    <div className="rounded-2xl px-4 py-4 bg-slate-50 dark:bg-[#0F1A33] border border-slate-200 dark:border-white/[0.06] transition-colors duration-200">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200', iconBg)}>
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 transition-colors duration-200">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 transition-colors duration-200">
          {hint}
        </div>
      )}
    </div>
  )
}

/**
 * Browser-permission status panel for the Notifications tab. Shows the real
 * `Notification.permission` value (not just the in-app toggle) so the user
 * knows whether anything could ever actually fire.
 */
function NotificationPermissionPanel({ state, onRequest, tr }) {
  const meta = {
    granted: {
      key: 'notif.permission.granted',
      tone: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot:  'bg-emerald-500',
    },
    denied: {
      key: 'notif.permission.denied',
      tone: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-300',
      dot:  'bg-red-500',
    },
    default: {
      key: 'notif.permission.default',
      tone: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot:  'bg-amber-500',
    },
    unsupported: {
      key: 'notif.permission.unsupported',
      tone: 'bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06]',
      text: 'text-slate-600 dark:text-slate-400',
      dot:  'bg-slate-400',
    },
  }[state] || {}

  return (
    <div className={clsx('rounded-2xl border px-4 py-3 mb-5 transition-colors duration-200', meta.tone)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={clsx('w-2 h-2 rounded-full shrink-0 animate-pulse', meta.dot)} />
          <span className={clsx('text-sm font-semibold', meta.text)}>
            {tr(meta.key)}
          </span>
        </div>
        {state === 'default' && (
          <button
            type="button"
            onClick={onRequest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                       bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            {tr('notif.permission.request')}
          </button>
        )}
      </div>
      <div className={clsx('mt-1.5 text-xs leading-snug', meta.text, 'opacity-90')}>
        {state === 'denied' ? tr('notif.permission.howto') : tr('notif.permission.hint')}
      </div>
    </div>
  )
}

function UnitGroup({ title, icon, value, onChange, options }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">{title}</h3>
      </div>
      <div className={clsx(
        'grid gap-3',
        options.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
      )}>
        {options.map(opt => (
          <RadioCard
            key={opt.value}
            active={value === opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            subtitle={opt.sub}
          />
        ))}
      </div>
    </div>
  )
}
