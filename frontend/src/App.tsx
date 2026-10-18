import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CircleHelp, LayoutDashboard, LogOut, Menu, Moon, PieChart, Plus, ReceiptText, Search, Settings, Sun, Target, Trophy, Wallet, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import AuthPage from './features/auth/AuthPage'
import Overview from './features/overview/Overview'
import TransactionsView from './features/transactions/TransactionsView'
import TransactionForm from './features/transactions/TransactionForm'
import BudgetsView from './features/budgets/BudgetsView'
import ReportsView from './features/reports/ReportsView'
import GoalsView from './features/goals/GoalsView'
import SettingsView from './features/settings/SettingsView'
import CommandPalette, { type Command } from './components/CommandPalette'
import { ToastProvider, useToast } from './components/Toasts'
import { api, setUnauthorizedHandler } from './api/client'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { CURRENCIES, type Goal, type Transaction, type TransactionCreate, type User, type View } from './types'
import { EXPENSE_CATEGORIES, initials, money, monthKey, parseDate, sumCents } from './lib/format'

const VIEWS: { id: View; label: string; icon: typeof Wallet; key: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, key: 'O' },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText, key: 'T' },
  { id: 'budgets', label: 'Budgets', icon: Target, key: 'B' },
  { id: 'reports', label: 'Reports', icon: PieChart, key: 'R' },
  { id: 'goals', label: 'Goals', icon: Trophy, key: 'G' },
]
const readHash = (): View => { const h = location.hash.replace('#/', '') as View; return [...VIEWS.map(v => v.id), 'settings'].includes(h) ? h : 'overview' }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const theme = useTheme()

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)) }, [])
  // If the session expires mid-use, drop back to the sign-in page.
  useEffect(() => { setUnauthorizedHandler(() => setUser(null)); return () => setUnauthorizedHandler(null) }, [])
  async function logout() { try { await api.logout() } finally { setUser(null); location.hash = '' } }

  return (
    <ToastProvider>
      {checking ? <div className="boot"><span className="brand-mark"><Wallet size={26} /></span></div>
        : !user ? <AuthPage onAuthenticated={setUser} />
        // key={user.id}: a different account always starts with fresh state, never the previous user's data.
        : <Workspace key={user.id} user={user} onLogout={logout} theme={theme} />}
    </ToastProvider>
  )
}

type ThemeApi = ReturnType<typeof useTheme>
function Workspace({ user, onLogout, theme }: { user: User; onLogout: () => void; theme: ThemeApi }) {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currency, setCurrency] = useState(user.base_currency)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>(readHash)
  const [form, setForm] = useState<{ edit: Transaction | null } | null>(null)
  const [palette, setPalette] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notes, setNotes] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [budgets, setBudgets] = useLocalStorage<Record<string, number>>(`ef.budgets.${user.id}.${currency}`, {})
  const [goals, setGoals] = useLocalStorage<Goal[]>(`ef.goals.${user.id}`, [])
  const pendingDeletes = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const go = useCallback((v: View) => { setView(v); location.hash = `/${v}`; setMenu(false); setNotes(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])
  useEffect(() => { const h = () => setView(readHash()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h) }, [])
  useEffect(() => { const h = () => setScrolled(scrollY > 8); addEventListener('scroll', h, { passive: true }); return () => removeEventListener('scroll', h) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try { setTransactions(await api.getTransactions(currency)); setError('') }
    catch { setError('Could not load transactions.') }
    finally { setLoading(false) }
  }, [currency])
  useEffect(() => { void load() }, [load])

  async function save(data: TransactionCreate) {
    const edit = form?.edit
    try {
      if (edit) { const u = await api.updateTransaction(edit.id, data); setTransactions(p => p.map(t => (t.id === u.id ? u : t))); toast('Transaction updated') }
      else { const c = await api.createTransaction(data); setTransactions(p => [c, ...p]); toast('Transaction added') }
      setError(''); setForm(null)
    } catch (e) {
      toast(e instanceof Error ? `Could not save: ${e.message}` : 'Could not save transaction.', { kind: 'error' })
      throw e
    }
  }
  // Optimistic delete with a 5s undo window; the API call fires only once the window closes.
  function remove(t: Transaction) {
    setTransactions(p => p.filter(x => x.id !== t.id))
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(t.id)
      try { await api.deleteTransaction(t.id) }
      catch { setTransactions(p => [t, ...p]); toast('Could not delete — restored.', { kind: 'error' }) }
    }, 5000)
    pendingDeletes.current.set(t.id, timer)
    toast(`Deleted “${t.title}”`, { undo: () => { clearTimeout(timer); pendingDeletes.current.delete(t.id); setTransactions(p => [t, ...p]) } })
  }

  const openAdd = useCallback(() => setForm({ edit: null }), [])
  // Keyboard: Ctrl/Cmd+K palette, N new, G then O/T/B/R/G navigate.
  useEffect(() => {
    let g = 0
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); return }
      const el = e.target as HTMLElement
      if (el.matches('input,textarea,select,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (g && Date.now() - g < 1200) { const v = VIEWS.find(x => x.key.toLowerCase() === k); g = 0; if (v) { go(v.id); return } }
      if (k === 'g') g = Date.now()
      else if (k === 'n') { e.preventDefault(); openAdd() }
    }
    addEventListener('keydown', h); return () => removeEventListener('keydown', h)
  }, [go, openAdd])

  // Alerts derived from budgets (80%+ used this month).
  const alerts = useMemo(() => {
    const cur = monthKey(new Date()), out: { id: string; bad: boolean; title: string; text: string }[] = []
    for (const c of EXPENSE_CATEGORIES) {
      const b = budgets[c]; if (!b) continue
      const s = sumCents(transactions.filter(t => t.transaction_type === 'expense' && t.category === c && monthKey(parseDate(t.transaction_date)) === cur))
      if (s >= b) out.push({ id: c, bad: true, title: `${c} budget exceeded`, text: `${money(s, currency)} spent of ${money(b, currency)}` })
      else if (s >= b * 0.8) out.push({ id: c, bad: false, title: `${c} budget almost used`, text: `${Math.round((s / b) * 100)}% of ${money(b, currency)}` })
    }
    return out
  }, [budgets, transactions, currency])

  const commands: Command[] = [
    { id: 'add', label: 'Add transaction', icon: <Plus size={16} />, run: openAdd },
    ...VIEWS.map(v => ({ id: v.id, label: `Go to ${v.label}`, icon: <v.icon size={16} />, run: () => go(v.id) })),
    { id: 'settings', label: 'Open settings', icon: <Settings size={16} />, run: () => go('settings') },
    { id: 'theme', label: 'Toggle dark mode', icon: <Moon size={16} />, run: theme.toggle },
    { id: 'logout', label: 'Log out', icon: <LogOut size={16} />, run: () => void onLogout() },
  ]
  const dark = document.documentElement.dataset.theme === 'dark'
  const common = { transactions, currency, loading, onAdd: openAdd, onEdit: (t: Transaction) => setForm({ edit: t }), onDelete: remove }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#/overview"><span className="brand-mark"><Wallet size={20} /></span><span>expense<span className="brand-accent">flow</span></span></a>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main">{VIEWS.map(v => (
          <button key={v.id} className={`nav-link ${view === v.id ? 'active' : ''}`} onClick={() => go(v.id)} aria-current={view === v.id ? 'page' : undefined}>
            <v.icon size={18} />{v.label}{v.id === 'transactions' && <span className="nav-count">{transactions.length}</span>}
          </button>))}</nav>
        <div className="sidebar-bottom">
          <button className={`nav-link ${view === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}><Settings size={18} /> Settings</button>
          <button className="nav-link" onClick={() => setPalette(true)}><CircleHelp size={18} /> Shortcuts <span className="kbd">Ctrl K</span></button>
          <div className="profile-row"><div className="avatar">{initials(user.full_name)}</div><div><strong>{user.full_name}</strong><small>{user.email}</small></div>
            <button className="plain-icon" aria-label="Log out" title="Log out" onClick={() => void onLogout()}><LogOut size={16} /></button></div>
        </div>
      </aside>
      {menu && <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close menu" />}

      <main className="main-area">
        <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
          <button className="mobile-menu-button icon-button" onClick={() => setMenu(m => !m)} aria-label="Toggle menu">{menu ? <X size={19} /> : <Menu size={19} />}</button>
          <button className="searchbar" onClick={() => setPalette(true)}><Search size={16} /><span className="t">Search or jump to…</span><span className="kbd t">Ctrl K</span></button>
          <div className="top-actions">
            <label className="currency-picker"><span>Currency</span>
              <select value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Currency">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <button className="icon-button" onClick={theme.toggle} aria-label="Toggle theme" title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div style={{ position: 'relative' }}>
              <button className="icon-button" onClick={() => setNotes(n => !n)} aria-label="Notifications" aria-expanded={notes}><Bell size={18} />{alerts.length > 0 && <i className="badge-dot" />}</button>
              {notes && <div className="popover"><h4>Notifications</h4>
                {alerts.length ? alerts.map(a => <div className="note-item" key={a.id}>{a.bad ? <AlertTriangle size={18} color="var(--red)" /> : <AlertTriangle size={18} color="var(--amber)" />}<div><strong>{a.title}</strong><small>{a.text}</small></div></div>)
                  : <div className="note-item"><CheckCircle2 size={18} color="var(--green)" /><div><strong>You’re all caught up</strong><small>Budget alerts will appear here.</small></div></div>}</div>}
            </div>
            <button className="button primary" onClick={openAdd}><Plus size={17} /><span className="t">Add</span></button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="error-banner" role="alert">{error} Make sure the FastAPI backend is running. <button className="link-button" onClick={() => void load()}>Retry</button></div>}
          {view === 'overview' && <Overview key="o" user={user} go={go} {...common} />}
          {view === 'transactions' && <TransactionsView key="t" {...common} />}
          {view === 'budgets' && <BudgetsView key="b" transactions={transactions} currency={currency} budgets={budgets} setBudgets={setBudgets} />}
          {view === 'reports' && <ReportsView key="r" transactions={transactions} currency={currency} />}
          {view === 'goals' && <GoalsView key="g" goals={goals} setGoals={setGoals} currency={user.base_currency} />}
          {view === 'settings' && <SettingsView key="s" user={user} transactions={transactions} mode={theme.mode} setMode={theme.setMode} accent={theme.accent} setAccent={theme.setAccent} />}
          <footer className="app-footer"><span>© 2026 ExpenseFlow</span><span>Press <span className="kbd" style={{ margin: 0 }}>N</span> to add · <span className="kbd" style={{ margin: 0 }}>Ctrl K</span> for commands</span></footer>
        </div>
      </main>
      {form && <TransactionForm currency={currency} initial={form.edit} onSave={save} onCancel={() => setForm(null)} />}
      {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
    </div>
  )
}
