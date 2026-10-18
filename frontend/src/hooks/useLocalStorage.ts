import { useCallback, useEffect, useState } from 'react'

// Per-viewer convenience storage. Every access is guarded: storage can throw (private mode, blocked data).
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial }
    catch { return initial }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  }, [key, value])
  const set = useCallback((v: T | ((p: T) => T)) => setValue(v), [])
  return [value, set] as const
}
