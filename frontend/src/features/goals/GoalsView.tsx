import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import Confetti from '../../components/Confetti'
import { useToast } from '../../components/Toasts'
import { money } from '../../lib/format'
import type { Goal } from '../../types'

const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🛟']
type Props = { goals: Goal[]; setGoals: (g: Goal[]) => void; currency: string }

export default function GoalsView({ goals, setGoals, currency }: Props) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState(''); const [target, setTarget] = useState(''); const [emoji, setEmoji] = useState(EMOJIS[0])
  const [boom, setBoom] = useState(false)
  const [topUp, setTopUp] = useState<{ id: string; v: string } | null>(null)

  function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || Number(target) <= 0) return
    setGoals([...goals, { id: crypto.randomUUID?.() ?? String(Date.now()), name: name.trim(), target: Number(target), saved: 0, emoji }])
    setName(''); setTarget(''); setAdding(false); toast('Goal created')
  }
  function add(g: Goal, amount: number) {
    if (!(amount > 0)) return
    const saved = Math.round((g.saved + amount) * 100) / 100
    setGoals(goals.map(x => (x.id === g.id ? { ...x, saved } : x)))
    if (g.saved < g.target && saved >= g.target) { setBoom(true); toast(`🎉 Goal reached: ${g.name}!`) }
    setTopUp(null)
  }
  return (
    <div className="view">
      {boom && <Confetti onDone={() => setBoom(false)} />}
      <div className="page-heading"><div><span className="eyebrow">DREAMS</span><h1>Savings goals</h1><p>Track what you’re saving for and celebrate the finish line.</p></div>
        <div className="heading-actions"><button className="button primary" onClick={() => setAdding(true)}><Plus size={17} /> New goal</button></div></div>
      <div className="cards-grid">
        {goals.map((g, i) => {
          const pct = Math.min(1, g.saved / g.target), done = pct >= 1
          return (
            <section key={g.id} className="panel goal-card reveal" style={{ ['--i' as string]: i }}>
              <div className="goal-top"><div className="goal-emoji">{g.emoji}</div><div style={{ flex: 1 }}><h3>{g.name}</h3><small>{done ? 'Completed 🎉' : `${money(g.target - g.saved, currency)} to go`}</small></div>
                <button className="plain-icon" aria-label={`Delete ${g.name}`} onClick={() => { setGoals(goals.filter(x => x.id !== g.id)); toast('Goal removed') }}><Trash2 size={15} /></button></div>
              <div className="track"><i style={{ width: `${pct * 100}%`, ['--c' as string]: done ? 'var(--green)' : 'var(--accent)' }} /></div>
              <div className="goal-meta"><span><strong style={{ color: 'var(--text)' }}>{money(g.saved, currency)}</strong> saved</span><span>{Math.round(pct * 100)}% of {money(g.target, currency, true)}</span></div>
              {topUp?.id === g.id
                ? <form className="goal-actions" onSubmit={e => { e.preventDefault(); add(g, Number(topUp.v)) }}><input type="number" min="1" autoFocus placeholder="Amount" value={topUp.v} onChange={e => setTopUp({ id: g.id, v: e.target.value })} /><button className="button primary sm">Add</button></form>
                : <div className="goal-actions">{[500, 1000, 5000].map(a => <button key={a} className="button secondary sm" onClick={() => add(g, a)}>+{a >= 1000 ? `${a / 1000}k` : a}</button>)}<button className="button secondary sm" onClick={() => setTopUp({ id: g.id, v: '' })}>Custom</button></div>}
            </section>)
        })}
        <button className="panel add-card" onClick={() => setAdding(true)}><Plus size={22} />{goals.length ? 'Add another goal' : 'Create your first savings goal'}</button>
      </div>
      {adding && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAdding(false) }}>
        <form className="modal sm" onSubmit={create}>
          <div className="modal-heading"><div><span className="eyebrow">NEW GOAL</span><h2>What are you saving for?</h2></div><button type="button" className="plain-icon" onClick={() => setAdding(false)} aria-label="Close"><X size={18} /></button></div>
          <div className="cat-grid">{EMOJIS.map(e => <button type="button" key={e} className={`chip ${emoji === e ? 'on' : ''}`} style={{ fontSize: 20 }} onClick={() => setEmoji(e)}>{e}</button>)}</div>
          <label>Goal name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trip to Cox’s Bazar" autoFocus required maxLength={60} /></label>
          <label>Target amount ({currency})<input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="50000" required /></label>
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => setAdding(false)}>Cancel</button><button className="button primary">Create goal</button></div>
        </form></div>}
    </div>
  )
}
