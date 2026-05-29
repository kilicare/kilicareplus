import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('kili_access')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (err) => Promise.reject(err)
)

let isRefreshing = false
let queue: Array<{
  resolve: (v: string) => void
  reject: (e: unknown) => void
}> = []

function flush(err: unknown, token: string | null = null) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const orig = err.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          queue.push({ resolve, reject })
        ).then((token) => {
          orig.headers.Authorization = `Bearer ${token}`
          return api(orig)
        })
      }
      orig._retry = true
      isRefreshing = true
      try {
        const refresh = localStorage.getItem('kili_refresh')
        if (!refresh) throw new Error('No refresh')
        const { data } = await axios.post(
          `${API_URL}/auth/refresh/`,
          { refresh }
        )
        localStorage.setItem('kili_access', data.access)
        api.defaults.headers.common.Authorization =
          `Bearer ${data.access}`
        flush(null, data.access)
        orig.headers.Authorization = `Bearer ${data.access}`
        return api(orig)
      } catch (e) {
        flush(e, null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kili_access')
          localStorage.removeItem('kili_refresh')
          window.location.href = '/login'
        }
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api