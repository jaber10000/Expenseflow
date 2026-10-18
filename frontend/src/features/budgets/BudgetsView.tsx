import { useMemo, useState } from 'react'
import { Pencil, Target } from 'lucide-react'
import Ring from '../../components/Ring'
import { EXPENSE_CATEGORIES, catColor, money, monthKey, parseDate, sumCents } from '../../lib/format'
import type { Transaction } from '../../types'

type Props = { transactions: Transaction[]; currency: string; budgets: Record<string, number>; setBudgets: (b: Record<string, number>) => void }

export default function BudgetsView({ transactions, currency, budgets, setBudgets }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const cur = monthKey(new Date())
  const spent = useMemo(() => Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, sumCents(transactions.filter(t => t.transaction_type === 'expense' && t.category === c && monthKey(parseDate(t.transaction_date)) === cur))])), [transactions, cur])
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0)
  const totalSpent = EXPENSE_CATEGORIES.reduce((s, c) => s + (budgets[c] ? spent[c] : 0), 0)

  function save(c: string) {
    const v = Number(draft)
    const next = { ...budgets }
    if (v > 0) next[c] = v; else delete next[c]
    setBudgets(next); setEditing(null)
  }
  return (
    <div className="view">
      <div className="page-heading"><div><span className="eyebrow">PLANNING</span><h1>Monthly budgets</h1><p>Set a limit per category and watch it fill up through the month.</p></div>
        {totalBudget > 0 && <div className="panel" style={{ padding: '12px 18px' }}><small>Budgeted total</small><div><strong style={{ fontFamily: 'var(--font-d)', fontSize: 20 }}>{money(totalSpent, currency)}</strong> <small>of {money(totalBudget, currency)}</small></div></div>}
      </div>
      <div className="cards-grid">
        {EXPENSE_CATEGORIES.map((c, i) => {
          const b = budgets[c], s = spent[c], pct = b ? s / b : 0
          const color = !b ? catColor(c) : pct >= 1 ? '#e5484d' : pct >= .8 ? '#f59e0b' : catColor(c)
          return (
            <section key={c} className="panel budget-card reveal" style={{ ['--i' as string]: i }}>
              <h3>{c}</h3>
              <Ring pct={b ? pct : 0} color={color}>{b ? `${Math.round(pct * 100)}%` : '—'}<small>{b ? 'used' : 'no limit'}</small></Ring>
              <div><strong>{money(s, currency)}</strong> <small>{b ? `of ${money(b, currency)}` : 'spent this month'}</small>
                {b > 0 && <div className={pct >= 1 ? 'warn' : 'ok'} style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{pct >= 1 ? `Over by ${money(s - b, currency)}` : `${money(b - s, currency)} left`}</div>}</div>
              {editing === c
                ? <form className="budget-edit" onSubmit={e => { e.preventDefault(); save(c) }}>
                    <input type="number" min="0" step="1" autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="Monthly limit (0 = remove)" aria-label={`${c} budget`} />
                    <button className="button primary sm">Save</button></form>
                : <button className="button secondary sm" onClick={() => { setEditing(c); setDraft(b ? String(b) : '') }}>{b ? <><Pencil size={13} /> Edit limit</> : <><Target size={13} /> Set budget</>}</button>}
            </section>)
        })}
      </div>
    </div>
  )
}
