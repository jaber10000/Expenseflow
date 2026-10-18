import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, Leaf, X } from 'lucide-react'
import type { MonthReview } from '../../lib/insights'
import { dayLabel, moneyMinor, moneyWhole, monthLabel, pct, weekdayName } from '../../lib/format'
import { HealthRing, GRADE_LABEL } from '../health/Health'
import './story.css'

type Props = { review: MonthReview; currency: string; onClose: () => void }
const SLIDE_MS = 6500

interface Slide { key: string; tone: string; body: ReactNode }

function buildSlides(r: MonthReview, currency: string): Slide[] {
  const month = monthLabel(r.key, 'short')
  const slides: Slide[] = []

  slides.push({ key: 'intro', tone: 'violet', body: (
    <>
      <span className="st-kicker">YOUR MONTH IN MONEY</span>
      <h2 className="st-title">{month}{r.isCurrent ? ', so far' : ''}</h2>
      <p className="st-text">{r.txCount} {r.txCount === 1 ? 'entry' : 'entries'} across {r.daysElapsed} days. Let’s see how it went.</p>
    </>
  ) })

  const delta = r.deltaPct
  slides.push({ key: 'spent', tone: 'coral', body: (
    <>
      <span className="st-kicker">YOU SPENT</span>
      <div className="st-big">{moneyWhole(r.expense, currency)}</div>
      {delta !== null
        ? <p className="st-text">{delta === 0 ? 'Exactly the same as last month.' : <><span className="st-delta">{delta > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />} {pct(Math.abs(delta))}</span> {delta > 0 ? 'more' : 'less'} than last month ({moneyWhole(r.prevExpense, currency)}).</>}</p>
        : <p className="st-text">No previous month to compare with yet.</p>}
    </>
  ) })

  if (r.topCategories.length) slides.push({ key: 'category', tone: 'amber', body: (
    <>
      <span className="st-kicker">WHERE IT WENT</span>
      <h2 className="st-title">{r.topCategories[0].name}</h2>
      <p className="st-text">{pct(r.topCategories[0].share)} of your spending, {moneyWhole(r.topCategories[0].value, currency)}.</p>
      <ul className="st-bars">
        {r.topCategories.map(c => <li key={c.name}><span>{c.name}</span><div><i style={{ width: `${c.share * 100}%` }} /></div><b>{pct(c.share)}</b></li>)}
      </ul>
    </>
  ) })

  if (r.biggest) slides.push({ key: 'biggest', tone: 'teal', body: (
    <>
      <span className="st-kicker">BIGGEST MOMENT</span>
      <h2 className="st-title">{r.biggest.title}</h2>
      <div className="st-big">{moneyMinor(Math.round(Number(r.biggest.amount) * 100), r.biggest.currency)}</div>
      <p className="st-text">{dayLabel(r.biggest.transaction_date)} · {r.biggest.category}</p>
    </>
  ) })

  if (r.busiestDay) slides.push({ key: 'rhythm', tone: 'blue', body: (
    <>
      <span className="st-kicker">YOUR RHYTHM</span>
      <p className="st-line">Busiest day: <b>{dayLabel(r.busiestDay.iso)}</b> ({moneyWhole(r.busiestDay.value, currency)})</p>
      {r.priciestWeekday && <p className="st-line">{weekdayName(r.priciestWeekday.index)}s cost you the most overall.</p>}
      <p className="st-line"><Leaf size={18} /> <b>{r.noSpendDays}</b> no-spend {r.noSpendDays === 1 ? 'day' : 'days'} out of {r.daysElapsed}</p>
    </>
  ) })

  slides.push({ key: 'saved', tone: r.saved >= 0 ? 'green' : 'rose', body: (
    <>
      <span className="st-kicker">{r.saved >= 0 ? 'YOU KEPT' : 'YOU OVERSPENT BY'}</span>
      <div className="st-big">{moneyWhole(Math.abs(r.saved), currency)}</div>
      <p className="st-text">
        {r.income === 0 ? 'No income logged this month, so there’s nothing to compare against.'
          : r.saved >= 0 ? `${pct(r.savingsRate ?? 0)} of the ${moneyWhole(r.income, currency)} you earned.`
          : `You earned ${moneyWhole(r.income, currency)} and spent ${moneyWhole(r.expense, currency)}.`}
      </p>
    </>
  ) })

  slides.push({ key: 'score', tone: 'violet', body: (
    <>
      <span className="st-kicker">FINANCIAL HEALTH</span>
      <div className="st-ring"><HealthRing score={r.score.total} size={170} /></div>
      <p className="st-text">{r.score.grade ? `${GRADE_LABEL[r.score.grade]}. Open the Health page for the breakdown.` : 'Add a few more entries to unlock your score.'}</p>
    </>
  ) })
  return slides
}

function summaryText(r: MonthReview, currency: string) {
  const parts = [`My ${monthLabel(r.key, 'short')} in money: spent ${moneyWhole(r.expense, currency)}`]
  if (r.topCategories[0]) parts.push(`top category ${r.topCategories[0].name} (${pct(r.topCategories[0].share)})`)
  if (r.income > 0) parts.push(r.saved >= 0 ? `kept ${moneyWhole(r.saved, currency)}` : `overspent by ${moneyWhole(-r.saved, currency)}`)
  if (r.score.total !== null) parts.push(`health score ${r.score.total}/100`)
  return `${parts.join(' · ')}. Tracked with ExpenseFlow`
}

export default function MonthStory({ review, currency, onClose }: Props) {
  const slides = useMemo(() => buildSlides(review, currency), [review, currency])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const last = slides.length - 1

  const next = useCallback(() => setI(v => Math.min(last, v + 1)), [last])
  const prev = useCallback(() => setI(v => Math.max(0, v - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  async function copy() {
    try { await navigator.clipboard.writeText(summaryText(review, currency)); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard unavailable */ }
  }
  const slide = slides[i]

  return (
    <div className="st-backdrop" role="dialog" aria-modal="true" aria-label={`${monthLabel(review.key)} in review`}>
      <div className={`st-card tone-${slide.tone}`} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <div className="st-progress">
          {slides.map((s, idx) => (
            <span key={s.key}>
              <i className={idx < i ? 'done' : idx === i ? 'active' : ''} style={idx === i ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused || idx === last ? 'paused' : 'running' } : undefined}
                onAnimationEnd={() => { if (idx === i && idx < last) next() }} />
            </span>
          ))}
        </div>
        <div className="st-head"><span>{monthLabel(review.key)}</span><button aria-label="Close story" onClick={onClose}><X size={20} /></button></div>

        <div className="st-body" key={slide.key}>{slide.body}</div>

        <button className="st-zone left" aria-label="Previous" onClick={prev} />
        <button className="st-zone right" aria-label="Next" onClick={next} />

        {i === last && <div className="st-foot"><button className="st-copy" onClick={copy}><Copy size={15} /> {copied ? 'Copied!' : 'Copy summary'}</button></div>}
      </div>
    </div>
  )
}
