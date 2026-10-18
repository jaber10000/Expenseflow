import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, PieChart, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react'
import { api } from '../../api/client'
import { CURRENCIES, type User } from '../../types'

type Props = { onAuthenticated: (user: User) => void }

function strength(pw: string) {
  let s = 0
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 16) s++
  return s
}

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [baseCurrency, setBaseCurrency] = useState('BDT')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'
  const sc = strength(password)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const user = isRegister
        ? await api.register({ email: email.trim(), password, full_name: fullName.trim(), base_currency: baseCurrency })
        : await api.login(email.trim(), password)
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <i className="blob b1" /><i className="blob b2" />
        <a className="brand" href="#"><span className="brand-mark"><Wallet size={20} /></span><span>expense<span style={{ opacity: .7 }}>flow</span></span></a>
        <div className="hero-copy">
          <span className="eyebrow" style={{ color: '#fff', opacity: .85 }}><Sparkles size={14} /> SMART MONEY MANAGEMENT</span>
          <h2>Know where every taka goes.</h2>
          <p>Track spending, set budgets, chase savings goals and see your habits in beautiful, live charts — in any currency.</p>
        </div>
        <div className="hero-cards" aria-hidden>
          <div className="glass g1"><small>This month saved</small><strong>৳ 18,450</strong></div>
          <div className="glass g2"><small>Food budget</small><strong>72% used</strong></div>
          <div className="glass g3"><small>Goal · New laptop</small><strong>🎯 64%</strong></div>
        </div>
        <div className="hero-points"><span><ShieldCheck size={14} /> Private by design</span><span><PieChart size={14} /> Live insights</span><span><Zap size={14} /> Fast &amp; multi-currency</span></div>
      </aside>

      <main className="auth-side">
        <form className="auth-card" key={mode} onSubmit={submit}>
          <a className="brand" href="#" style={{ display: 'none' }} />
          <div><span className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</span>
            <h1 style={{ marginTop: 8 }}>{isRegister ? 'Create your account' : 'Sign in to ExpenseFlow'}</h1></div>
          <p className="auth-sub">{isRegister ? 'Your transactions stay private to your account.' : 'Pick up right where you left off.'}</p>

          {isRegister && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required maxLength={100} placeholder="Your name" /></label>}
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Password
            <span className="pw-wrap">
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 10 : 1} maxLength={128} placeholder="••••••••••" />
              <button type="button" className="plain-icon" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
            {isRegister && <><span className="strength" aria-hidden>{[0, 1, 2, 3].map(i => <i key={i} style={{ background: i < sc ? ['#ef4444', '#f59e0b', '#84cc16', '#22c55e'][sc - 1] : undefined }} />)}</span>
              <small>At least 10 characters. {password && ['Weak', 'Okay', 'Good', 'Strong'][Math.max(0, sc - 1)]}</small></>}
          </label>
          {isRegister && <label>Base currency
            <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select>
            <small>Totals will be reported in this currency.</small></label>}

          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button primary auth-submit" disabled={busy}>
            {busy ? <><span className="spinner" /> Please wait…</> : <>{isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}
          </button>
          <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to ExpenseFlow?'}{' '}
            <button type="button" className="link-button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError('') }}>{isRegister ? 'Sign in' : 'Create an account'}</button></p>
        </form>
      </main>
    </div>
  )
}
