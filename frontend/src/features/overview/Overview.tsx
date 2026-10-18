import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, PieChart as PieIcon, Plus, ReceiptText, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '../../components/StatCard'
import Empty from '../../components/Empty'
import { StatsSkeleton, TableSkeleton } from '../../components/Skeleton'
import TransactionRow from '../transactions/TransactionRow'
import { catColor, cents, greeting, money, monthKey, parseDate, sumCents } from '../../lib/format'
import type { Transaction, User, View } from '../../types'

type Props = { user: User; transactions: Transaction[]; currency: string; loading: boolean; onAdd: () => void; go: (v: View) => void; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }

export function ChartTip({ active, payload, label, currency }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tip"><strong>{label}</strong>{payload.map(p => <div key={p.name}><i style={{ background: p.color }} />{p.name}: <b style={{ color: 'var(--text)' }}>{money(p.value, currency)}</b></div>)}</div>
}

export default function Overview({ user, transactions, currency, loading, onAdd, go, onEdit, onDelete }: Props) {
  const [range, setRange] = useState<6 | 12>(6)
  const now = new Date()
  const cur = monthKey(now), prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const m = useMemo(() => {
    const by = (key: string, type: string) => sumCents(transactions.filter(t => monthKey(parseDate(t.transaction_date)) === key && t.transaction_type === type))
    return { inc: by(cur, 'income'), exp: by(cur, 'expense'), pInc: by(prev, 'income'), pExp: by(prev, 'expense') }
  }, [transactions, cur, prev])
  const income = sumCents(transactions.filter(t => t.transaction_type === 'income'))
  const expenses = sumCents(transactions.filter(t => t.transaction_type === 'expense'))
  const balance = income - expenses
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null)

  const trend = useMemo(() => Array.from({ length: range }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (range - 1 - i), 1), k = monthKey(d)
    const rows = transactions.filter(t => monthKey(parseDate(t.transaction_date)) === k)
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), Income: sumCents(rows.filter(t => t.transaction_type === 'income')), Expenses: sumCents(rows.filter(t => t.transaction_type === 'expense')) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transactions, range])

  const cats = useMemo(() => Object.entries(transactions.filter(t => t.transaction_type === 'expense' && monthKey(parseDate(t.transaction_date)) === cur)
    .reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + cents(t) / 100; return a }, {})).sort((a, b) => b[1] - a[1]), [transactions, cur])
  const catTotal = cats.reduce((s, [, v]) => s + v, 0)
  const recent = transactions.slice().sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id - a.id).slice(0, 6)

  let insight = 'Add a few transactions and I’ll start spotting patterns for you.'
  if (cats[0]) insight = `${cats[0][0]} is your biggest expense this month — ${money(cats[0][1], currency)} (${Math.round((cats[0][1] / catTotal) * 100)}% of spending).`
  const d = pct(m.exp, m.pExp)
  if (d != null && cats[0]) insight += d <= 0 ? ` You’re spending ${Math.abs(d).toFixed(0)}% less than last month. Nice.` : ` That’s ${d.toFixed(0)}% more than last month.`

  return (
    <div className="view">
      <div className="page-heading">
        <div><span className="eyebrow"><span className="status-dot" /> YOUR FINANCES AT A GLANCE</span>
          <h1>{greeting()}, {user.full_name.split(' ')[0]} 👋</h1><p>Here’s what’s happening with your money today.</p></div>
        <div className="heading-actions"><button className="button primary" onClick={onAdd}><Plus size={17} /> Add transaction</button></div>
      </div>

      {loading && !transactions.length ? <StatsSkeleton /> : (
        <div className="stats-grid">
          <StatCard index={0} label="Total balance" value={balance} format={n => money(n, currency)} note="Income minus expenses" icon={<Wallet size={20} />} tone="#6d5dfc" />
          <StatCard index={1} label="Income · this month" value={m.inc} format={n => money(n, currency)} note="Money received" icon={<ArrowDownLeft size={20} />} tone="#16a34a" delta={pct(m.inc, m.pInc)} />
          <StatCard index={2} label="Spent · this month" value={m.exp} format={n => money(n, currency)} note="Money spent" icon={<ArrowUpRight size={20} />} tone="#f97316" delta={pct(m.exp, m.pExp)} goodWhenUp={false} />
          <StatCard index={3} label="Savings rate" value={income > 0 ? (balance / income) * 100 : 0} format={n => (income > 0 ? `${Math.round(n)}%` : '—')} note="Of all income retained" icon={<TrendingUp size={20} />} tone="#0ea5e9" />
        </div>)}

      <div className="insight reveal" style={{ ['--i' as string]: 4 }}>
        <div className="ic"><Sparkles size={20} /></div><div><strong>Smart insight</strong><p>{insight}</p></div>
      </div>

      <div className="content-grid">
        <section className="panel reveal" style={{ ['--i' as string]: 5 }}>
          <div className="panel-heading"><div><h2>Cash flow</h2><p>Income vs expenses over time</p></div>
            <div className="seg"><button className={range === 6 ? 'on' : ''} onClick={() => setRange(6)}>6M</button><button className={range === 12 ? 'on' : ''} onClick={() => setRange(12)}>12M</button></div></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d5dfc" stopOpacity={.35} /><stop offset="100%" stopColor="#6d5dfc" stopOpacity={0} /></linearGradient>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={.3} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--faint)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--faint)', fontSize: 12 }} tickFormatter={v => (v >= 1000 ? `${v / 1000}k` : String(v))} />
              <Tooltip content={<ChartTip currency={currency} />} />
              <Area type="monotone" dataKey="Income" stroke="#6d5dfc" strokeWidth={2.5} fill="url(#gi)" animationDuration={1200} />
              <Area type="monotone" dataKey="Expenses" stroke="#f97316" strokeWidth={2.5} fill="url(#ge)" animationDuration={1400} />
            </AreaChart></ResponsiveContainer></div>
        </section>

        <section className="panel reveal" style={{ ['--i' as string]: 6 }}>
          <div className="panel-heading"><div><h2>Spending by category</h2><p>This month</p></div></div>
          {cats.length ? <>
            <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={cats.map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={1100}>
                {cats.map(([n]) => <Cell key={n} fill={catColor(n)} />)}</Pie>
              <Tooltip content={<ChartTip currency={currency} />} /></PieChart></ResponsiveContainer>
              <div className="donut-center"><small>Total spent</small><strong>{money(catTotal, currency, true)}</strong></div></div>
            <div className="legend-row">{cats.slice(0, 5).map(([n, v]) => <span key={n}><i style={{ background: catColor(n) }} />{n} {Math.round((v / catTotal) * 100)}%</span>)}</div>
          </> : <Empty icon={<PieIcon size={24} />} title="No spending yet" text="Add an expense to see where your money goes." />}
        </section>
      </div>

      <section className="panel reveal" style={{ ['--i' as string]: 7 }}>
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest transactions</p></div><button className="button secondary sm" onClick={() => go('transactions')}>View all</button></div>
        {loading && !transactions.length ? <TableSkeleton /> : recent.length
          ? recent.map((t, i) => <TransactionRow key={t.id} t={t} index={i} onEdit={onEdit} onDelete={onDelete} />)
          : <Empty icon={<ReceiptText size={24} />} title="Your money story starts here" text="Add your first transaction to bring your dashboard to life." action={<button className="button primary" onClick={onAdd}><Plus size={16} /> Add first transaction</button>} />}
      </section>
    </div>
  )
}
