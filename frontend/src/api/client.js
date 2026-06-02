import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL || '') + '/api'

export const api = axios.create({ baseURL })

const ACCESS_KEY = 'sf_access'
const REFRESH_KEY = 'sf_refresh'

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On a 401, try a single refresh and replay the request; otherwise log out.
let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    if (status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios.post(`${baseURL}/auth/refresh/`, { refresh: tokenStore.refresh })
        const { data } = await refreshing
        refreshing = null
        tokenStore.set({ access: data.access })
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (e) {
        refreshing = null
        tokenStore.clear()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(e)
      }
    }
    return Promise.reject(error)
  },
)

// Normalize DRF error payloads into a single readable string.
export function apiError(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const parts = []
  for (const [key, value] of Object.entries(data)) {
    const text = Array.isArray(value) ? value.join(' ') : String(value)
    parts.push(key === 'non_field_errors' ? text : `${key}: ${text}`)
  }
  return parts.join(' ') || fallback
}
