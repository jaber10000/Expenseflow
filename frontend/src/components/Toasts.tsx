import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Toast = { id: number; msg: string; kind: 'success' | 'error'; undo?: () => void; ms: number }
type Push = (msg: string, opts?: { kind?: 'success' | 'error'; undo?: () => void; ms?: number }) => void
const Ctx = createContext<Push>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const n = useRef(0)
  const dismiss = useCallback((id: number) => setItems(p => p.filter(t => t.id !== id)), [])
  const push = useCallback<Push>((msg, o = {}) => {
    const id = ++n.current
    const ms = o.ms ?? (o.undo ? 5000 : 3200)
    setItems(p => [...p.slice(-3), { id, msg, kind: o.kind ?? 'success', undo: o.undo, ms }])
    setTimeout(() => dismiss(id), ms)
  }, [dismiss])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast ${t.kind}`} style={{ ['--d' as string]: `${t.ms}ms` }}>
            {t.kind === 'success' ? <CheckCircle2 className="t" size={18} /> : <AlertCircle className="t" size={18} />}
            <span>{t.msg}</span>
            {t.undo && <button className="undo" onClick={() => { t.undo?.(); dismiss(t.id) }}>Undo</button>}
            {t.undo && <i className="bar" />}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
