import { useEffect, useRef, useState } from 'react'
import {
  User, Mail, Phone, Lock, Camera, MapPin, Check, Save, KeyRound
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../auth/AuthContext'
import { cities } from '../data/cities'
import { fetchManyCurrent } from '../services/weatherService'
import PersonaPicker from '../components/PersonaPicker'

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

function Field({ icon, label, children }) {
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
    </label>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  })
  const [profileSaved, setProfileSaved] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [selectedCity, setSelectedCity] = useState(user?.defaultCity ?? 'spb')
  const [locationSaved, setLocationSaved] = useState(false)

  // Live weather for each city in the picker. id → normalized current data.
  const [cityLive, setCityLive] = useState({})
  useEffect(() => {
    let cancelled = false
    const list = Object.values(cities)
    fetchManyCurrent(list.map(c => c.name)).then(results => {
      if (cancelled) return
      const next = {}
      results.forEach((r, i) => { if (r.current) next[list[i].id] = r.current })
      setCityLive(next)
    })
    return () => { cancelled = true }
  }, [])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateUser({ avatar: reader.result })
    reader.readAsDataURL(file)
  }

  function handleProfileSave(e) {
    e.preventDefault()
    updateUser(profile)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2200)
  }

  function handlePasswordSave(e) {
    e.preventDefault()
    setPasswordError('')
    if (user?.password && passwords.current !== user.password) {
      setPasswordError('Текущий пароль введён неверно')
      return
    }
    if (!passwords.next || passwords.next.length < 6) {
      setPasswordError('Новый пароль должен содержать не менее 6 символов')
      return
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('Пароли не совпадают')
      return
    }
    updateUser({ password: passwords.next })
    setPasswords({ current: '', next: '', confirm: '' })
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2200)
  }

  function handleLocationSave() {
    updateUser({ defaultCity: selectedCity })
    setLocationSaved(true)
    setTimeout(() => setLocationSaved(false), 2200)
  }

  const initial = (profile.name?.[0] || profile.email?.[0] || 'U').toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">
          Личный кабинет
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">
          Управление аккаунтом и локацией по умолчанию
        </p>
      </header>

      {/* ============ PERSONA MODE ============ */}
      <PersonaPicker variant="full" />

      {/* ============ ACCOUNT MANAGEMENT ============ */}
      <section className={`${card} rounded-3xl p-6`}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-200">
          Управление аккаунтом
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 transition-colors duration-200">
          Личные данные и контакты
        </p>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2F80FF] to-[#1E5BC6] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-blue-100 dark:ring-blue-900/30">
                {initial}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Сменить аватар"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors
                         bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                         shadow-md shadow-blue-500/30"
            >
              <Camera className="w-4 h-4" strokeWidth={2.2} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200 truncate">
              {profile.name || 'Без имени'} {profile.lastName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200 truncate">
              {profile.email || '—'}
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field icon={<User className="w-4 h-4" />} label="Имя">
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Иван"
              className={inputClass}
            />
          </Field>
          <Field icon={<User className="w-4 h-4" />} label="Фамилия">
            <input
              type="text"
              value={profile.lastName}
              onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
              placeholder="Петров"
              className={inputClass}
            />
          </Field>
          <Field icon={<Mail className="w-4 h-4" />} label="Email">
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              placeholder="user@example.com"
              className={inputClass}
            />
          </Field>
          <Field icon={<Phone className="w-4 h-4" />} label="Телефон">
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+7 (___) ___-__-__"
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2 flex items-center justify-end gap-3">
            {profileSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Сохранено
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors
                         bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                         shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
            >
              <Save className="w-4 h-4" strokeWidth={2.2} />
              Сохранить изменения
            </button>
          </div>
        </form>
      </section>

      {/* ============ PASSWORD ============ */}
      <section className={`${card} rounded-3xl p-6`}>
        <div className="flex items-center gap-3 mb-1">
          <KeyRound className="w-5 h-5 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.2} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            Смена пароля
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
          Новый пароль должен содержать не менее 6 символов
        </p>

        <form onSubmit={handlePasswordSave} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field icon={<Lock className="w-4 h-4" />} label="Текущий пароль">
            <input
              type="password"
              value={passwords.current}
              onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
              className={inputClass}
              autoComplete="current-password"
            />
          </Field>
          <Field icon={<Lock className="w-4 h-4" />} label="Новый пароль">
            <input
              type="password"
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
          <Field icon={<Lock className="w-4 h-4" />} label="Повторите новый">
            <input
              type="password"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>

          <div className="sm:col-span-3 flex items-center justify-end gap-3">
            {passwordError && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {passwordError}
              </span>
            )}
            {passwordSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Пароль обновлён
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors
                         bg-slate-900 hover:bg-slate-800 text-white
                         dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
            >
              Обновить пароль
            </button>
          </div>
        </form>
      </section>

      {/* ============ LOCATION ============ */}
      <section className={`${card} rounded-3xl p-6`}>
        <div className="flex items-center gap-3 mb-1">
          <MapPin className="w-5 h-5 text-[#2F80FF] dark:text-blue-300" strokeWidth={2.2} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
            Локация по умолчанию
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 transition-colors duration-200">
          Выбранный город будет первым загружаться на главном экране
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {Object.values(cities).map(city => {
            const active = city.id === selectedCity
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => setSelectedCity(city.id)}
                className={clsx(
                  'text-left rounded-2xl px-4 py-3 transition-all duration-200 border',
                  active
                    ? 'bg-blue-50 dark:bg-blue-500/15 border-[#2F80FF]/50 dark:border-blue-400/40 shadow-sm'
                    : 'bg-white dark:bg-[#0F1A33] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                    {city.name}
                  </span>
                  {active && (
                    <span className="w-5 h-5 rounded-full bg-[#2F80FF] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
                  {cityLive[city.id]
                    ? `${cityLive[city.id].tempC >= 0 ? '+' : ''}${Math.round(cityLive[city.id].tempC)}° · ${cityLive[city.id].conditionText}`
                    : '—'}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-3">
          {locationSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Локация сохранена
            </span>
          )}
          <button
            type="button"
            onClick={handleLocationSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors
                       bg-[#2F80FF] hover:bg-[#3a8bff] text-white
                       shadow-md shadow-blue-500/30 dark:shadow-blue-900/40"
          >
            <Save className="w-4 h-4" strokeWidth={2.2} />
            Сохранить локацию
          </button>
        </div>
      </section>
    </div>
  )
}
