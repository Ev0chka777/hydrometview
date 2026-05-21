import { createContext, useContext, useEffect, useState } from 'react'

const FavoritesContext = createContext({
  favorites: { posts: [], cities: [] },
  isFavoritePost: () => false,
  togglePost: () => {},
  removePost: () => {},
  isFavoriteCity: () => false,
  toggleCity: () => {},
  removeCity: () => {},
})

const STORAGE_KEY = 'favorites_v2'
const LEGACY_KEY = 'favorite_posts'

function readStored() {
  if (typeof window === 'undefined') return { posts: [], cities: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        posts: Array.isArray(parsed?.posts) ? parsed.posts : [],
        cities: Array.isArray(parsed?.cities) ? parsed.cities : [],
      }
    }
    // Migrate from old flat-array shape (just hydropost IDs)
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed)) return { posts: parsed, cities: [] }
    }
  } catch {}
  return { posts: [], cities: [] }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readStored)

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)) } catch {}
  }, [favorites])

  const isFavoritePost = (id) => favorites.posts.includes(id)
  const togglePost = (id) => setFavorites(f => ({
    ...f,
    posts: f.posts.includes(id) ? f.posts.filter(x => x !== id) : [...f.posts, id],
  }))
  const removePost = (id) => setFavorites(f => ({ ...f, posts: f.posts.filter(x => x !== id) }))

  const isFavoriteCity = (id) => favorites.cities.includes(id)
  const toggleCity = (id) => setFavorites(f => ({
    ...f,
    cities: f.cities.includes(id) ? f.cities.filter(x => x !== id) : [...f.cities, id],
  }))
  const removeCity = (id) => setFavorites(f => ({ ...f, cities: f.cities.filter(x => x !== id) }))

  return (
    <FavoritesContext.Provider value={{
      favorites,
      isFavoritePost, togglePost, removePost,
      isFavoriteCity, toggleCity, removeCity,
    }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
