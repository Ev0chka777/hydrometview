import { createContext, useContext, useState } from 'react'

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
})

function readStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(user) {
  try {
    if (user) window.localStorage.setItem('auth_user', JSON.stringify(user))
    else window.localStorage.removeItem('auth_user')
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const login = (data) => {
    const next = {
      email: data?.email ?? null,
      name: data?.name ?? null,
      lastName: data?.lastName ?? '',
      phone: data?.phone ?? '',
      avatar: data?.avatar ?? null,
      password: data?.password ?? '',
      defaultCity: data?.defaultCity ?? 'spb',
    }
    setUser(next)
    persist(next)
  }

  const logout = () => {
    setUser(null)
    persist(null)
  }

  const updateUser = (patch) => {
    setUser(prev => {
      const next = { ...(prev ?? {}), ...patch }
      persist(next)
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
