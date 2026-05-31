import { create } from 'zustand'

interface UserInfo {
  id: number
  login: string
  full_name: string
  role: string
  role_id: number
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
  isAdmin: () => boolean
}

const stored = localStorage.getItem('user')
const storedUser: UserInfo | null = stored ? JSON.parse(stored) : null

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: storedUser,

  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  isAdmin: () => get().user?.role === 'Администратор',
}))
