import { Download, Monitor, Moon, Sun } from 'lucide-react'
import { ACCENTS, type ThemeMode } from '../../hooks/useTheme'
import { downloadCsv } from '../../lib/format'
import type { Transaction, User } from '../../types'

type Props = { user: User; transactions: Transaction[]; mode: ThemeMode; setMode: (m: ThemeMode) => void; accent: string; setAccent: (a: string) => void }

export default function SettingsView({ user, transactions, mode, setMode, accent, setAccent }: Props) {
  const modes: [ThemeMode, string, React.ReactNode][] = [['light', 'Light', <Sun size={14} />], ['dark', 'Dark', <Moon size={14} />], ['system', 'System', <Monitor size={14} />]]
  return (
    <div className="view">
      <div className="page-heading"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p>Make ExpenseFlow feel like yours.</p></div></div>
      <section className="panel" style={{ maxWidth: 720 }}>
        <div className="set-row"><div><strong>Account</strong><br /><small>{user.full_name} · {user.email}</small></div><span className="pill">Base {user.base_currency}</span></div>
        <div className="set-row"><div><strong>Appearance</strong><br /><small>Choose light, dark or follow your device.</small></div>
          <div className="seg">{modes.map(([v, l, ic]) => <button key={v} className={mode === v ? 'on' : ''} onClick={() => setMode(v)}><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{ic}{l}</span></button>)}</div></div>
        <div className="set-row"><div><strong>Accent colour</strong><br /><small>Applies across the whole app instantly.</small></div>
          <div className="swatches">{Object.entries(ACCENTS).map(([n, [a, b]]) => <button key={n} title={n} aria-label={n} className={`swatch ${accent === n ? 'on' : ''}`} style={{ background: `linear-gradient(135deg,${a},${b})` }} onClick={() => setAccent(n)} />)}</div></div>
        <div className="set-row"><div><strong>Your data</strong><br /><small>Download all {transactions.length} transactions as CSV.</small></div>
          <button className="button secondary" onClick={() => downloadCsv(transactions)} disabled={!transactions.length}><Download size={16} /> Export all</button></div>
        <div className="set-row"><div><strong>Keyboard shortcuts</strong><br /><small><span className="kbd" style={{ margin: 0 }}>Ctrl K</span> command palette · <span className="kbd" style={{ margin: 0 }}>N</span> new transaction · <span className="kbd" style={{ margin: 0 }}>G</span> then <span className="kbd" style={{ margin: 0 }}>O/T/B/R</span> jump to a page</small></div></div>
      </section>
    </div>
  )
}
