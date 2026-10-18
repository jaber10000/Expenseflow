import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type ThemeMode = 'light' | 'dark' | 'system'
export const ACCENTS: Record<string, [string, string]> = {
  Violet: ['#6d5dfc', '#a78bfa'],
  Ocean: ['#0ea5e9', '#6366f1'],
  Emerald: ['#10b981', '#06b6d4'],
  Sunset: ['#f97316', '#ec4899'],
}

export function useTheme() {
  const [mode, setMode] = useLocalStorage<ThemeMode>('ef.theme', 'system')
  const [accent, setAccent] = useLocalStorage<string>('ef.accent', 'Violet')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode])
  useEffect(() => {
    const [a, b] = ACCENTS[accent] ?? ACCENTS.Violet
    document.documentElement.style.setProperty('--accent', a)
    document.documentElement.style.setProperty('--accent-2', b)
  }, [accent])
  const toggle = () => setMode(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  return { mode, setMode, accent, setAccent, toggle }
}
