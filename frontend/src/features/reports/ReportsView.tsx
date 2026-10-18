import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Download } from 'lucide-react'
import Empty from '../../components/Empty'
import { ChartTip } from '../overview/Overview'
import { catColor, cents, downloadCsv, money, monthKey, parseDate, sumCents } from '../../lib/format'
import type { Transaction } from '../../types'

export default function ReportsView({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const [months, setMonths] = useState(3)
  const now = new Date()
  const rows = useMemo(() => { const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1); return transactions.filter(t => parseDate(t.transaction_date) >= start) }, [transactions, months]) // eslint-disable-line react-hooks/exhaustive-deps
  const exp = rows.filter(t => t.transaction_type === 'expense'), inc = rows.filter(t => t.transaction_type === 'income')
  const expTotal = sumCents(exp), incTotal = sumCents(inc)
  const cats = useMemo(() => Object.entries(exp.reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + cents(t) / 100; return a }, {})).sort((a, b) => b[1] - a[1]), [exp])
  const monthly = useMemo(() => Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1), k = monthKey(d)
    const r = rows.filter(t => monthKey(parseDate(t.transaction_date)) === k)
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), Income: sumCents(r.filter(t => t.transaction_type === 'income')), Expenses: sumCents(r.filter(t => t.transaction_type === 'expense')) }
  }), [rows, months]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = exp.slice().sort((a, b) => cents(b) - cents(a)).slice(0, 5)
  const days = Math.max(1, Math.round((now.getTime() - new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime()) / 864e5))
  const stats = [['Total income', money(incTotal, currency)], ['Total spent', money(expTotal, currency)], ['Net saved', money(incTotal - expTotal, currency)], ['Avg. daily spend', money(expTotal / days, currency)]]

  return (
    <div className="view">
      <div className="page-heading"><div><span className="eyebrow">INSIGHTS</span><h1>Reports</h1><p>Understand your habits over time.</p></div>
        <div className="heading-actions"><div className="seg">{[1, 3, 6, 12].map(m => <button key={m} className={months === m ? 'on' : ''} onClick={() => setMonths(m)}>{m}M</button>)}</div>
          <button className="button secondary" onClick={() => downloadCsv(rows)} disabled={!rows.length}><Download size={16} /> Export</button></div></div>
      {!rows.length ? <section className="panel"><Empty icon={<BarChart3 size={24} />} title="Nothing to report yet" text="No transactions in this period. Try a longer range or add some entries." /></section> : <>
        <div className="stats-grid">{stats.map(([l, v], i) => <div key={l} className="stat-card reveal" style={{ ['--i' as string]: i, ['--tone' as string]: 'var(--accent)' }}><div className="stat-copy"><p>{l}</p><strong>{v}</strong></div></div>)}</div>
        <div className="grid-2">
          <section className="panel reveal" style={{ ['--i' as string]: 4 }}><div className="panel-heading"><div><h2>Income vs expenses</h2><p>By month</p></div></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ left: -12, top: 8 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--faint)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--faint)', fontSize: 12 }} tickFormatter={v => (v >= 1000 ? `${v / 1000}k` : String(v))} />
              <Tooltip content={<ChartTip currency={currency} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="Income" fill="#6d5dfc" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={1000} />
              <Bar dataKey="Expenses" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={1200} /></BarChart></ResponsiveContainer></div></section>
          <section className="panel reveal" style={{ ['--i' as string]: 5 }}><div className="panel-heading"><div><h2>Where it went</h2><p>Expense share by category</p></div></div>
            {cats.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={cats.map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius={68} outerRadius={98} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={1100}>{cats.map(([n]) => <Cell key={n} fill={catColor(n)} />)}</Pie>
              <Tooltip content={<ChartTip currency={currency} />} /></PieChart></ResponsiveContainer></div>
              <div className="legend-row">{cats.map(([n, v]) => <span key={n}><i style={{ background: catColor(n) }} />{n} {Math.round((v / expTotal) * 100)}%</span>)}</div></> : <Empty icon={<BarChart3 size={22} />} title="No expenses" text="Nothing spent in this period." />}</section>
        </div>
        <section className="panel reveal" style={{ ['--i' as string]: 6 }}><div className="panel-heading"><div><h2>Top category breakdown</h2><p>Ranked by total spend</p></div></div>
          <div className="category-list">{cats.map(([n, v]) => <div className="category-item" key={n}><div className="category-dot" style={{ background: catColor(n) }} /><span>{n}</span><strong>{money(v, currency)}</strong><div className="track"><i style={{ width: `${(v / expTotal) * 100}%`, ['--c' as string]: catColor(n) }} /></div></div>)}</div></section>
        {top.length > 0 && <section className="panel reveal" style={{ ['--i' as string]: 7 }}><div className="panel-heading"><div><h2>Biggest expenses</h2><p>Your 5 largest purchases</p></div></div>
          {top.map((t, i) => <div key={t.id} className="tx-row" style={{ ['--i' as string]: i, ['--c' as string]: catColor(t.category), gridTemplateColumns: '44px 1fr auto' }}><div className="tx-icon">{i + 1}</div><div className="tx-main"><strong>{t.title}</strong><small>{t.category}</small></div><div className="tx-amt out">{money(Number(t.amount), t.currency)}</div></div>)}</section>}
      </>}
    </div>
  )
}
