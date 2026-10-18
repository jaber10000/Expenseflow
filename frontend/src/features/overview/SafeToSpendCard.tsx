import { CalendarClock, Plus, ShieldCheck, TriangleAlert, Wallet } from 'lucide-react'
import type { SafeToSpend } from '../../lib/insights'
import { moneyMinor, moneyWhole } from '../../lib/format'

type Props = { data: SafeToSpend; currency: string; onAddTransaction: () => void }

const HEADLINE = {
  good: { icon: ShieldCheck, text: 'You’re on track' },
  tight: { icon: TriangleAlert, text: 'Almost at today’s limit' },
  over: { icon: TriangleAlert, text: 'Over for today' },
  'no-income': { icon: Wallet, text: 'Add your income to begin' },
} as const

export default function SafeToSpendCard({ data, currency, onAddTransaction }: Props) {
  const { status, perDay, leftToday, spentToday, daysLeft, leftThisMonth, upcoming, upcomingTotal, incomeIsEstimate } = data
  const Head = HEADLINE[status]
  const used = perDay > 0 ? Math.min(1, spentToday / perDay) : spentToday > 0 ? 1 : 0
  const monthOver = leftThisMonth < 0

  if (status === 'no-income') {
    return (
      <section className="panel ix-hero ix-no-income">
        <span className="ix-eyebrow">SAFE TO SPEND TODAY</span>
        <h2 className="ix-hero-empty">Tell us what comes in, and we’ll tell you what’s safe to spend.</h2>
        <p className="ix-muted">Add this month’s income (salary, freelance, anything). We subtract your usual bills and split the rest across the days left.</p>
        <button className="button primary" onClick={onAddTransaction}><Plus size={16} /> Add income</button>
      </section>
    )
  }

  return (
    <section className={`panel ix-hero ix-${status}`}>
      <div className="ix-hero-top">
        <span className="ix-eyebrow">SAFE TO SPEND TODAY</span>
        <span className="ix-chip"><Head.icon size={13} /> {Head.text}</span>
      </div>

      <div className="ix-hero-number">{moneyWhole(Math.max(0, leftToday), currency)}</div>
      <p className="ix-hero-sub">
        {status === 'over'
          ? monthOver
            ? `This month’s income is already spoken for. You’re ${moneyWhole(-leftThisMonth, currency)} over after upcoming bills.`
            : `You’ve spent ${moneyWhole(-leftToday, currency)} more than today’s allowance. Tomorrow’s allowance will adjust.`
          : <>left of today’s <strong>{moneyWhole(perDay, currency)}</strong> allowance · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left this month</>}
      </p>

      <div className="ix-meter" role="img" aria-label={`Spent ${Math.round(used * 100)}% of today's allowance`}><i style={{ width: `${used * 100}%` }} /></div>

      <div className="ix-hero-stats">
        <div><span>Spent today</span><strong>{moneyMinor(spentToday, currency)}</strong></div>
        <div><span>Left this month</span><strong>{moneyWhole(leftThisMonth, currency)}</strong><small>after upcoming bills</small></div>
        <div><span>Upcoming bills</span><strong>{moneyWhole(upcomingTotal, currency)}</strong><small>{upcoming.length} not paid yet</small></div>
      </div>

      {upcoming.length > 0 && (
        <ul className="ix-bills">
          {upcoming.slice(0, 4).map(u => (
            <li key={`${u.kind}-${u.title}`}>
              <CalendarClock size={14} />
              <span>{u.title}</span>
              <em>{u.kind === 'scheduled' ? `scheduled · ${u.dayHint}th` : `usually ~${u.dayHint}th`}</em>
              <strong>{moneyWhole(u.amount, currency)}</strong>
            </li>
          ))}
          {upcoming.length > 4 && <li className="ix-more">+ {upcoming.length - 4} more</li>}
        </ul>
      )}

      <details className="ix-how">
        <summary>How is this calculated?</summary>
        <p>
          {incomeIsEstimate
            ? 'We start with your usual monthly income (median of the last 3 months), because what you’ve logged this month is lower so far. '
            : 'We start with the income you’ve logged this month. '}
          Then we subtract what you’ve already spent, plus bills that normally repeat every month (same name, similar amount, paid in at least 2 of the last 3 months) and anything dated later this month. What’s left is divided by the days remaining, including today.
        </p>
      </details>
    </section>
  )
}
