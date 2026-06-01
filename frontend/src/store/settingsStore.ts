import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

interface SettingsState {
  companyName: string
  themeMode: ThemeMode
  setCompanyName: (name: string) => void
  setThemeMode: (mode: ThemeMode) => void
}

const defaultCompanyName = 'Авто-Контур'
const storedTheme = localStorage.getItem('theme_mode') === 'dark' ? 'dark' : 'light'

export const useSettingsStore = create<SettingsState>((set) => ({
  companyName: localStorage.getItem('company_name') || defaultCompanyName,
  themeMode: storedTheme,
  setCompanyName: (name) => {
    const value = name.trim() || defaultCompanyName
    localStorage.setItem('company_name', value)
    set({ companyName: value })
  },
  setThemeMode: (mode) => {
    localStorage.setItem('theme_mode', mode)
    document.documentElement.dataset.theme = mode
    set({ themeMode: mode })
  },
}))
