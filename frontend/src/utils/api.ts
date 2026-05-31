import axios from 'axios'

const getServerURL = () => {
  return localStorage.getItem('server_url') || 'http://localhost:8080'
}

export const api = axios.create({
  baseURL: getServerURL(),
  timeout: 10000,
})

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Always use current server URL
  config.baseURL = getServerURL()
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const ping = (url: string) =>
  axios.get(`${url}/ping`, { timeout: 5000 })
