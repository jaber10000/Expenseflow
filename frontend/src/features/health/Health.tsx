import { Lightbulb } from 'lucide-react'
import { MIN_TX_FOR_SCORE, scoreColor, type HealthComponent, type HealthResult } from '../../lib/insights'

export const GRADE_LABEL = { excellent: 'Excellent', good: 'Good', fair: 'Getting there', attention: 'Needs attention' } as const

const LABEL: Record<HealthComponent['key'], { name: string; what: string; tip: string }> = {
  savings: { name: 'Savings rate', what: 'Share of income you keep (last 90 days)', tip: 'Aim to keep 20% of income. Even moving 5% to savings on payday helps.' },
  trend: { name: 'Spending trend', what: 'Last 30 days vs the 60 days before', tip: 'Spending is climbing. Check the Calendar page for the days that spike.' },
  fixed: { name: 'Fixed-cost load', what: 'Bills and subscriptions as a share of income', tip: 'Bills and subscriptions take a big slice. Review subscriptions you no longer use.' },
  cushion: { name: 'Safety cushion', what: 'Tracked balance in months of spending', tip: 'Build toward 3 months of spending as a buffer for emergencies.' },
  habit: { name: 'Tracking habit', what: 'Days you logged something in the last 30', tip: 'Log expenses a few times a week so every insight stays accurate.' },
}

export function HealthRing({ score, size = 132, label = true }: { score: number | null; size?: number; label?: boolean }) {
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const color = score === null ? '#d9dcea' : scoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score === null ? 'Score not available yet' : `Health score ${score} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f6" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - (score ?? 0) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      <text x="50%" y={label ? '48%' : '54%'} textAnchor="middle" dominantBaseline="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize={size * 0.3} fill="#242741">{score ?? '—'}</text>
      {label && <text x="50%" y="68%" textAnchor="middle" fontSize={size * 0.085} fill="#9a9eaf" fontWeight="600">OUT OF 100</text>}
    </svg>
  )
}

export function HealthSummaryCard({ health, onOpen }: { health: HealthResult; onOpen: () => void }) {
  const worst = health.components.filter(c => c.score !== null).sort((a, b) => (a.score as number) - (b.score as number))[0]
  return (
    <section className="panel ix-health-card">
      <span className="ix-eyebrow">FINANCIAL HEALTH</span>
      <div className="ix-health-ring"><HealthRing score={health.total} /></div>
      {health.grade ? (
        <>
          <strong className="ix-grade" style={{ color: scoreColor(health.total as number) }}>{GRADE_LABEL[health.grade]}</strong>
          {worst && (worst.score as number) < 70 && <p className="ix-muted ix-health-hint"><Lightbulb size={13} /> Biggest opportunity: <b>{LABEL[worst.key].name.toLowerCase()}</b></p>}
        </>
      ) : <p className="ix-muted ix-health-hint">Add at least {MIN_TX_FOR_SCORE} transactions to unlock your score.</p>}
      <button className="button secondary" onClick={onOpen}>See breakdown</button>
    </section>
  )
}

export function HealthBreakdown({ health }: { health: HealthResult }) {
  return (
    <div className="ix-health-page">
      <section className="panel ix-health-top">
        <HealthRing score={health.total} size={170} />
        <div>
          <span className="ix-eyebrow">YOUR SCORE</span>
          <h2 className="ix-big-grade" style={{ color: health.total !== null ? scoreColor(health.total) : undefined }}>{health.grade ? GRADE_LABEL[health.grade] : 'Not enough data yet'}</h2>
          <p className="ix-muted">{health.enoughData
            ? 'Built from five habits across your last 90 days. Parts without enough data are left out, not counted against you.'
            : `Add at least ${MIN_TX_FOR_SCORE} transactions and your score appears here.`}</p>
        </div>
      </section>
      <section className="panel ix-components">
        {health.components.map(c => {
          const info = LABEL[c.key]
          const s = c.score
          return (
            <div className="ix-component" key={c.key}>
              <div className="ix-component-head"><strong>{info.name}</strong><span>{c.value}</span></div>
              <div className="ix-bar"><i style={{ width: `${s ?? 0}%`, background: s === null ? '#d9dcea' : scoreColor(s) }} /></div>
              <div className="ix-component-foot">
                <small>{info.what} · weight {c.weight}%</small>
                <small className="ix-score-num">{s === null ? 'Not enough data' : `${Math.round(s)}/100`}</small>
              </div>
              {s !== null && s < 70 && <p className="ix-tip"><Lightbulb size={13} /> {info.tip}</p>}
            </div>
          )
        })}
      </section>
    </div>
  )
}
