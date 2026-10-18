import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Leaf } from 'lucide-react'
import type { Transaction } from '../../types'
import { WEEK_START, heatCutoffs, heatLevel, monthDays, monthKeyOf, parseKey, shiftMonth, todayYMD, toIso, weekdayOf } from '../../lib/insights'
import { dayLabel, monthLabel, moneyCompact, moneyMinor, weekdayName } from '../../lib/format'

type Props = { transactions: Transaction[]; currency: string }

export default function SpendingCalendar({ transactions, currency }: Props) {
  const now = todayYMD()
  const todayIso = toIso(now)
  const thisMonth = monthKeyOf(now)
  const [key, setKey] = useState(thisMonth)
  const [selected, setSelected] = useState<string | null>(null)

  const cutoffs = useMemo(() => heatCutoffs(transactions), [transactions])
  const days = useMemo(() => monthDays(transactions, key), [transactions, key])
  const { y, m } = parseKey(key)

  const elapsed = days.filter(c => c.iso <= todayIso)
  const total = elapsed.reduce((s, c) => s + c.expense, 0)
  const spendDays = elapsed.filter(c => c.expense > 0)
  const noSpend = elapsed.length - spendDays.length
  const top = spendDays.reduce<typeof days[number] | null>((b, c) => (!b || c.expense > b.expense ? c : b), null)

  const lead = (new Date(y, m - 1, 1).getDay() - WEEK_START + 7) % 7
  const headers = Array.from({ length: 7 }, (_, i) => weekdayName((WEEK_START + i) % 7, 'short'))
  const sel = days.find(c => c.iso === selected) ?? null

  return (
    <div className="ix-cal-layout">
      <section className="panel ix-cal">
        <div className="panel-heading">
          <div><h2>{monthLabel(key)}</h2><p>Darker days = more spent. Colours are relative to all your spending days.</p></div>
          <div className="ix-cal-nav">
            <button className="icon-button" aria-label="Previous month" onClick={() => { setKey(shiftMonth(key, -1)); setSelected(null) }}><ChevronLeft size={16} /></button>
            <button className="button secondary" onClick={() => { setKey(thisMonth); setSelected(null) }} disabled={key === thisMonth}>Today</button>
            <button className="icon-button" aria-label="Next month" onClick={() => { setKey(shiftMonth(key, 1)); setSelected(null) }} disabled={key >= thisMonth}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="ix-cal-grid" role="grid" aria-label={`Spending calendar for ${monthLabel(key)}`}>
          {headers.map(h => <div key={h} className="ix-cal-head" role="columnheader">{h}</div>)}
          {Array.from({ length: lead }, (_, i) => <div key={`pad${i}`} />)}
          {days.map(c => {
            const future = c.iso > todayIso
            const level = future ? 0 : heatLevel(c.expense, cutoffs)
            const label = `${dayLabel(c.iso)}: ${c.expense ? `spent ${moneyMinor(c.expense, currency)}` : 'no spending'}${c.income ? `, received ${moneyMinor(c.income, currency)}` : ''}`
            return (
              <button key={c.iso} role="gridcell" disabled={future} aria-label={label} title={label}
                className={`ix-day lv${level} ${c.iso === todayIso ? 'is-today' : ''} ${c.iso === selected ? 'is-selected' : ''} ${weekdayOf(c.iso) === 5 ? 'is-fri' : ''}`}
                onClick={() => setSelected(c.iso === selected ? null : c.iso)}>
                <span className="ix-day-num">{c.d}</span>
                {c.expense > 0 && <span className="ix-day-amt">{moneyCompact(c.expense, currency)}</span>}
                {c.income > 0 && <i className="ix-day-income" aria-hidden />}
              </button>
            )
          })}
        </div>

        <div className="ix-legend">
          <span>Less</span>{[0, 1, 2, 3, 4].map(l => <i key={l} className={`ix-swatch lv${l}`} />)}<span>More</span>
          <span className="ix-legend-sep" /><i className="ix-day-income static" /> <span>Income received</span>
        </div>
      </section>

      <aside className="ix-cal-side">
        <section className="panel ix-side-card">
          <span className="ix-eyebrow">{monthLabel(key, 'short').toUpperCase()} AT A GLANCE</span>
          <div className="ix-side-stat"><span>Total spent</span><strong>{moneyMinor(total, currency)}</strong></div>
          <div className="ix-side-stat"><span>Average per day</span><strong>{moneyMinor(elapsed.length ? Math.round(total / elapsed.length) : 0, currency)}</strong></div>
          <div className="ix-side-stat"><span>Priciest day</span><strong>{top ? `${top.d} · ${moneyMinor(top.expense, currency)}` : '—'}</strong></div>
          <div className="ix-side-stat"><span><Leaf size={12} /> No-spend days</span><strong>{noSpend} of {elapsed.length}</strong></div>
        </section>

        <section className="panel ix-side-card">
          <span className="ix-eyebrow">{sel ? dayLabel(sel.iso).toUpperCase() : 'PICK A DAY'}</span>
          {!sel && <p className="ix-muted">Tap any day to see what happened.</p>}
          {sel && sel.rows.length === 0 && <p className="ix-muted">Nothing recorded. A no-spend day.</p>}
          {sel && sel.rows.length > 0 && (
            <ul className="ix-day-list">
              {sel.rows.map(t => (
                <li key={t.id}>
                  <div><strong>{t.title}</strong><small>{t.category} · {t.payment_method}</small></div>
                  <span className={t.transaction_type === 'income' ? 'amount-positive' : 'amount-negative'}>{t.transaction_type === 'income' ? '+' : '−'}{moneyMinor(Math.round(Number(t.amount) * 100), t.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
