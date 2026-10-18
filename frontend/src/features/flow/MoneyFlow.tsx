import { useMemo, useState } from 'react'
import type { Transaction } from '../../types'
import { flowData, flowRange, todayYMD, type FlowNode, type FlowPeriod } from '../../lib/insights'
import { moneyCompact, moneyMinor, pct } from '../../lib/format'

type Props = { transactions: Transaction[]; currency: string }

const PERIODS: { id: FlowPeriod; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-90', label: 'Last 90 days' },
  { id: 'this-year', label: 'This year' },
]
const EXPENSE_COLORS = ['#7165e8', '#70c8df', '#a89ef5', '#efb16f', '#56b99c', '#e98fa0', '#8fa0e8', '#c9c2fb']
const INCOME_COLORS = ['#1eaa7a', '#56b99c', '#8fd3bd', '#b6e3d3']

interface Laid extends FlowNode { y: number; h: number; color: string; cursor: number }

const W = 820, NODE_W = 14, X_L = 190, X_R = W - 190 - NODE_W, PAD = 16, GAP = 12

function layout(nodes: FlowNode[], k: number, colHeight: number, palette: string[], kindColors: Partial<Record<FlowNode['kind'], string>>): Laid[] {
  const used = nodes.reduce((s, n) => s + n.value * k, 0) + GAP * (nodes.length - 1)
  let y = PAD + (colHeight - used) / 2
  return nodes.map((n, i) => {
    const h = n.value * k
    const node = { ...n, y, h, color: kindColors[n.kind] ?? palette[i % palette.length], cursor: y }
    y += h + GAP
    return node
  })
}

export default function MoneyFlow({ transactions, currency }: Props) {
  const [period, setPeriod] = useState<FlowPeriod>('this-month')
  const [hover, setHover] = useState<string | null>(null)
  const now = todayYMD()
  const data = useMemo(() => flowData(transactions, flowRange(period, now)), [transactions, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const model = useMemo(() => {
    if (data.total <= 0) return null
    const nMax = Math.max(data.income.length, data.expense.length)
    const colHeight = Math.max(300, nMax * 48)
    const k = (colHeight - GAP * (nMax - 1)) / data.total
    const left = layout(data.income, k, colHeight, INCOME_COLORS, { deficit: '#e37a79', other: '#b8bdd0' })
    const right = layout(data.expense, k, colHeight, EXPENSE_COLORS, { saved: '#1eaa7a', other: '#b8bdd0' })
    const links: { id: string; from: Laid; to: Laid; value: number; path: string; color: string }[] = []
    left.forEach((a, i) => right.forEach((b, j) => {
      const value = (a.value * b.value) / data.total
      if (value <= 0) return
      const t = value * k
      const x0 = X_L + NODE_W, x1 = X_R, xm = (x0 + x1) / 2
      const y0 = a.cursor, y1 = b.cursor
      a.cursor += t; b.cursor += t
      const path = `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1} L${x1},${y1 + t} C${xm},${y1 + t} ${xm},${y0 + t} ${x0},${y0 + t} Z`
      links.push({ id: `${i}-${j}`, from: a, to: b, value, path, color: b.color })
    }))
    return { left, right, links, height: colHeight + PAD * 2 }
  }, [data])

  const topExpense = data.expense.filter(n => n.kind === 'expense' || n.kind === 'other')[0]
  const keptRate = data.totalIncome > 0 ? data.saved / data.totalIncome : null
  const activeLink = hover ? model?.links.find(l => l.id === hover) : null

  return (
    <div className="ix-flow">
      <div className="ix-flow-controls" role="tablist" aria-label="Period">
        {PERIODS.map(p => <button key={p.id} role="tab" aria-selected={period === p.id} className={`ix-pill ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
      </div>

      <div className="ix-kpis">
        <div className="panel ix-kpi"><span>Money in</span><strong className="amount-positive">{moneyMinor(data.totalIncome, currency)}</strong></div>
        <div className="panel ix-kpi"><span>Money out</span><strong className="amount-negative">{moneyMinor(data.totalExpense, currency)}</strong></div>
        <div className="panel ix-kpi"><span>{data.deficit > 0 ? 'Spent beyond income' : 'Kept'}</span><strong>{moneyMinor(data.deficit > 0 ? data.deficit : data.saved, currency)}{keptRate !== null && data.deficit === 0 && <small> · {pct(keptRate)}</small>}</strong></div>
      </div>

      <section className="panel ix-flow-panel">
        {!model ? (
          <div className="empty-small"><strong>No money movement in this period</strong><span>Add income and expenses, or try another period.</span></div>
        ) : (
          <>
            <p className="ix-flow-caption" aria-live="polite">
              {activeLink
                ? <><b>{activeLink.from.name}</b> → <b>{activeLink.to.name}</b>: {moneyMinor(Math.round(activeLink.value), currency)}</>
                : topExpense && data.totalIncome > 0
                  ? <><b>{topExpense.name}</b> took {pct(topExpense.value / data.totalIncome)} of everything you earned.</>
                  : 'Hover a ribbon to see exactly where that money went.'}
            </p>
            <div className="ix-flow-scroll">
              <svg viewBox={`0 0 ${W} ${model.height}`} width="100%" style={{ minWidth: 640 }} role="img" aria-label="Sankey diagram: where your income went">
                {model.links.map(l => (
                  <path key={l.id} d={l.path} fill={l.color} opacity={hover === null ? 0.3 : hover === l.id ? 0.62 : 0.1} style={{ transition: 'opacity .15s' }}
                    onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)}>
                    <title>{`${l.from.name} → ${l.to.name}: ${moneyMinor(Math.round(l.value), currency)}`}</title>
                  </path>
                ))}
                {model.left.map(n => (
                  <g key={`l-${n.name}`}>
                    <rect x={X_L} y={n.y} width={NODE_W} height={Math.max(2, n.h)} rx="3" fill={n.color} />
                    <text x={X_L - 10} y={n.y + n.h / 2 - 2} textAnchor="end" fontSize="12" fontWeight="700" fill="#343850">{n.name}</text>
                    <text x={X_L - 10} y={n.y + n.h / 2 + 12} textAnchor="end" fontSize="11" fill="#8a90a3">{moneyCompact(n.value, currency)}</text>
                  </g>
                ))}
                {model.right.map(n => (
                  <g key={`r-${n.name}`}>
                    <rect x={X_R} y={n.y} width={NODE_W} height={Math.max(2, n.h)} rx="3" fill={n.color} />
                    <text x={X_R + NODE_W + 10} y={n.y + n.h / 2 - 2} fontSize="12" fontWeight="700" fill="#343850">{n.name}</text>
                    <text x={X_R + NODE_W + 10} y={n.y + n.h / 2 + 12} fontSize="11" fill="#8a90a3">{moneyCompact(n.value, currency)} · {pct(n.value / data.total)}</text>
                  </g>
                ))}
              </svg>
            </div>
            {data.deficit > 0 && <p className="ix-flow-note">You spent more than you earned in this period. The red node is the shortfall, covered by savings or earlier income.</p>}
          </>
        )}
      </section>
    </div>
  )
}
