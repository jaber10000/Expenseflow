import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'

export type Command = { id: string; label: string; icon: ReactNode; run: () => void }

export default function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const list = useMemo(() => commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase())), [commands, q])
  useEffect(() => setSel(0), [q])
  function key(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(list.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
    else if (e.key === 'Enter' && list[sel]) { list[sel].run(); onClose() }
    else if (e.key === 'Escape') onClose()
  }
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="palette-grid">
        <div className="palette" role="dialog" aria-label="Command palette" onKeyDown={key}>
          <div style={{ position: 'relative' }}>
            <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Type a command or search…" />
            <Search size={16} style={{ position: 'absolute', right: 18, top: 22, color: 'var(--faint)' }} />
          </div>
          <ul>
            {list.map((c, i) => <li key={c.id}><button className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => { c.run(); onClose() }}>{c.icon}{c.label}</button></li>)}
            {!list.length && <li style={{ padding: 18, color: 'var(--muted)', fontSize: 14 }}>No matching commands</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
