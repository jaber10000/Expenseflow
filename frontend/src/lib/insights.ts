// Pure calculations behind every insight feature. Everything is derived from the
// transactions the API already returns, so no backend change is needed.
// Money is integer minor units (paisa/cents). Dates are 'YYYY-MM-DD' strings handled
// without timezone conversion so a transaction never slips to the neighbouring day.
import type { Transaction } from '../types'

export type Minor = number

/** Bangladesh weeks start on Saturday (0 = Sunday … 6 = Saturday). */
export const WEEK_START = 6

// ---------- basics ----------
export const toMinor = (t: Transaction): Minor => Math.round(Number(t.amount) * 100)
export const isExpense = (t: Transaction) => t.transaction_type === 'expense'
export const isIncome = (t: Transaction) => t.transaction_type === 'income'
export const sumMinor = (rows: Transaction[]): Minor => rows.reduce((s, t) => s + toMinor(t), 0)
const norm = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ')
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2)
}
const pad = (n: number) => String(n).padStart(2, '0')

// ---------- dates ----------
export interface YMD { y: number; m: number; d: number }
export const todayYMD = (): YMD => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() } }
export const toIso = ({ y, m, d }: YMD) => `${y}-${pad(m)}-${pad(d)}`
export const monthKeyOf = ({ y, m }: { y: number; m: number }) => `${y}-${pad(m)}`
export const parseKey = (key: string) => { const [y, m] = key.split('-').map(Number); return { y, m } }
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
export const weekdayOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay() }
export const shiftDays = ({ y, m, d }: YMD, delta: number): YMD => { const dt = new Date(y, m - 1, d + delta); return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() } }
export const shiftMonth = (key: string, delta: number) => { const { y, m } = parseKey(key); const i = y * 12 + (m - 1) + delta; return monthKeyOf({ y: Math.floor(i / 12), m: (i % 12) + 1 }) }
export const monthOf = (t: Transaction) => t.transaction_date.slice(0, 7)
export const inMonth = (rows: Transaction[], key: string) => rows.filter(t => monthOf(t) === key)
export const monthsWithData = (rows: Transaction[]) => [...new Set(rows.map(monthOf))].sort().reverse()

// ---------- recurring bills ----------
export interface UpcomingItem { title: string; amount: Minor; kind: 'recurring' | 'scheduled'; dayHint: number | null }

/**
 * A recurring bill = same title, paid exactly once in at least 2 of the previous 3 months,
 * with a similar amount each time. Daily habits ("Lunch") never match because they repeat within a month.
 */
export function detectRecurring(txs: Transaction[], now: YMD) {
  const key = monthKeyOf(now)
  const prior = new Set([1, 2, 3].map(n => shiftMonth(key, -n)))
  const groups = new Map<string, { title: string; perMonth: Map<string, { amount: Minor; day: number }[]> }>()
  for (const t of txs.filter(isExpense)) {
    const mk = monthOf(t)
    if (!prior.has(mk)) continue
    const k = norm(t.title)
    const g = groups.get(k) ?? { title: t.title.trim(), perMonth: new Map() }
    const list = g.perMonth.get(mk) ?? []
    list.push({ amount: toMinor(t), day: Number(t.transaction_date.slice(8, 10)) })
    g.perMonth.set(mk, list)
    groups.set(k, g)
  }
  const paidThisMonth = new Set(inMonth(txs.filter(isExpense), key).map(t => norm(t.title)))
  const out: { title: string; amount: Minor; typicalDay: number; paid: boolean }[] = []
  for (const [k, g] of groups) {
    if (g.perMonth.size < 2) continue
    const entries = [...g.perMonth.values()]
    if (entries.some(list => list.length !== 1)) continue
    const amounts = entries.map(l => l[0].amount)
    const med = median(amounts)
    if (med <= 0 || amounts.some(a => a < med * 0.65 || a > med * 1.35)) continue
    out.push({ title: g.title, amount: med, typicalDay: median(entries.map(l => l[0].day)), paid: paidThisMonth.has(k) })
  }
  return out.sort((a, b) => a.typicalDay - b.typicalDay)
}

// ---------- 1. safe to spend ----------
export type SafeStatus = 'no-income' | 'good' | 'tight' | 'over'
export interface SafeToSpend {
  status: SafeStatus
  expectedIncome: Minor
  incomeIsEstimate: boolean
  spentThisMonth: Minor
  spentToday: Minor
  upcoming: UpcomingItem[]
  upcomingTotal: Minor
  /** Income − spent − upcoming bills, right now. Negative = already over-committed. */
  leftThisMonth: Minor
  daysLeft: number
  /** Today's allowance: what was available at the start of today, split across the days left. */
  perDay: Minor
  leftToday: Minor
}

export function safeToSpend(txs: Transaction[], now: YMD): SafeToSpend {
  const key = monthKeyOf(now)
  const today = toIso(now)
  const month = inMonth(txs, key)
  const incomeSoFar = sumMinor(month.filter(t => isIncome(t) && t.transaction_date <= today))
  const priorIncomes = [1, 2, 3].map(n => sumMinor(inMonth(txs.filter(isIncome), shiftMonth(key, -n)))).filter(v => v > 0)
  // Use the higher of "logged so far" and "usual", so a small early payment (e.g. freelance) before
  // the salary lands doesn't make the month look broken. Flagged as an estimate when usual wins.
  const usualIncome = median(priorIncomes)
  const expectedIncome = Math.max(incomeSoFar, usualIncome)
  const incomeIsEstimate = expectedIncome > incomeSoFar

  const spentRows = month.filter(t => isExpense(t) && t.transaction_date <= today)
  const spentThisMonth = sumMinor(spentRows)
  const spentToday = sumMinor(spentRows.filter(t => t.transaction_date === today))

  const upcoming: UpcomingItem[] = [
    ...detectRecurring(txs, now).filter(r => !r.paid).map(r => ({ title: r.title, amount: r.amount, kind: 'recurring' as const, dayHint: r.typicalDay })),
    ...month.filter(t => isExpense(t) && t.transaction_date > today).map(t => ({ title: t.title, amount: toMinor(t), kind: 'scheduled' as const, dayHint: Number(t.transaction_date.slice(8, 10)) })),
  ]
  const upcomingTotal = upcoming.reduce((s, u) => s + u.amount, 0)

  const daysLeft = daysInMonth(now.y, now.m) - now.d + 1 // today counts
  const leftThisMonth = expectedIncome - spentThisMonth - upcomingTotal
  const availableAtStartOfDay = leftThisMonth + spentToday
  const perDay = Math.max(0, Math.floor(availableAtStartOfDay / daysLeft))
  const leftToday = perDay - spentToday

  let status: SafeStatus = 'good'
  if (expectedIncome === 0) status = 'no-income'
  else if (availableAtStartOfDay <= 0 || leftToday < 0) status = 'over'
  else if (leftToday < perDay * 0.25) status = 'tight'
  return { status, expectedIncome, incomeIsEstimate, spentThisMonth, spentToday, upcoming, upcomingTotal, leftThisMonth, daysLeft, perDay, leftToday }
}

// ---------- 2. financial health score ----------
export interface HealthComponent {
  key: 'savings' | 'trend' | 'fixed' | 'cushion' | 'habit'
  weight: number
  /** 0–100, or null when there is not enough data to judge this part. */
  score: number | null
  value: string
}
export interface HealthResult {
  total: number | null
  grade: 'excellent' | 'good' | 'fair' | 'attention' | null
  components: HealthComponent[]
  enoughData: boolean
}
const FIXED_CATEGORIES = new Set(['bills', 'subscription'])
export const MIN_TX_FOR_SCORE = 5

export function healthScore(txs: Transaction[], asOf: YMD, fmt: { minor: (m: number) => string }): HealthResult {
  const end = toIso(asOf)
  const all = txs.filter(t => t.transaction_date <= end)
  const win = (days: number) => { const from = toIso(shiftDays(asOf, -(days - 1))); return all.filter(t => t.transaction_date >= from) }
  const w90 = win(90)
  const income90 = sumMinor(w90.filter(isIncome))
  const expense90 = sumMinor(w90.filter(isExpense))
  const lin = (x: number, lo: number, hi: number) => clamp01((x - lo) / (hi - lo)) * 100

  // Savings rate: 20%+ of income kept = full marks.
  const rate = income90 > 0 ? (income90 - expense90) / income90 : null
  const savings: HealthComponent = { key: 'savings', weight: 35, score: rate === null ? null : lin(rate, 0, 0.2), value: rate === null ? '—' : `${Math.round(rate * 100)}% kept` }

  // Spending trend: last 30 days vs the average 30 days before that.
  const last30 = sumMinor(win(30).filter(isExpense))
  const prev60From = toIso(shiftDays(asOf, -89)); const prev60To = toIso(shiftDays(asOf, -30))
  const prev60 = sumMinor(all.filter(t => isExpense(t) && t.transaction_date >= prev60From && t.transaction_date <= prev60To))
  const prevAvg = prev60 / 2
  const trendHasData = prevAvg > 0 && all.some(t => t.transaction_date < toIso(shiftDays(asOf, -29)))
  const ratio = trendHasData ? last30 / prevAvg : null
  const trend: HealthComponent = { key: 'trend', weight: 20, score: ratio === null ? null : 100 - lin(ratio, 1, 1.5), value: ratio === null ? '—' : ratio <= 1 ? `${Math.round((1 - ratio) * 100)}% lower` : `${Math.round((ratio - 1) * 100)}% higher` }

  // Fixed-cost load: bills + subscriptions as a share of income. ≤35% = full, ≥70% = zero.
  const fixed90 = sumMinor(w90.filter(t => isExpense(t) && FIXED_CATEGORIES.has(t.category.toLowerCase())))
  const fixedShare = income90 > 0 ? fixed90 / income90 : null
  const fixed: HealthComponent = { key: 'fixed', weight: 20, score: fixedShare === null ? null : 100 - lin(fixedShare, 0.35, 0.7), value: fixedShare === null ? '—' : `${Math.round(fixedShare * 100)}% of income` }

  // Cushion: tracked balance ÷ average monthly spending. 3+ months = full.
  const monthlySpend = expense90 / 3
  const balance = sumMinor(all.filter(isIncome)) - sumMinor(all.filter(isExpense))
  const months = monthlySpend > 0 ? balance / monthlySpend : null
  const cushion: HealthComponent = { key: 'cushion', weight: 15, score: months === null ? null : lin(months, 0, 3), value: months === null ? '—' : `${Math.max(0, months).toFixed(1)} months · ${fmt.minor(Math.max(0, balance))}` }

  // Habit: days with at least one entry in the last 30 days. 12+ days = full.
  const activeDays = new Set(win(30).map(t => t.transaction_date)).size
  const habit: HealthComponent = { key: 'habit', weight: 10, score: lin(activeDays, 0, 12), value: `${activeDays} active days` }

  const components = [savings, trend, fixed, cushion, habit]
  const enoughData = all.length >= MIN_TX_FOR_SCORE
  const scored = components.filter(c => c.score !== null)
  const wsum = scored.reduce((s, c) => s + c.weight, 0)
  const total = enoughData && wsum > 0 ? Math.round(scored.reduce((s, c) => s + c.weight * (c.score as number), 0) / wsum) : null
  const grade = total === null ? null : total >= 80 ? 'excellent' : total >= 65 ? 'good' : total >= 45 ? 'fair' : 'attention'
  return { total, grade, components, enoughData }
}

export const scoreColor = (score: number) => (score >= 80 ? '#1eaa7a' : score >= 65 ? '#7165e8' : score >= 45 ? '#ed995d' : '#e37a79')

// ---------- 3. calendar heatmap ----------
export interface DayCell { d: number; iso: string; expense: Minor; income: Minor; rows: Transaction[] }

export function monthDays(txs: Transaction[], key: string): DayCell[] {
  const { y, m } = parseKey(key)
  const cells: DayCell[] = Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ d: i + 1, iso: `${key}-${pad(i + 1)}`, expense: 0, income: 0, rows: [] }))
  for (const t of inMonth(txs, key)) {
    const c = cells[Number(t.transaction_date.slice(8, 10)) - 1]
    c.rows.push(t)
    if (isExpense(t)) c.expense += toMinor(t); else c.income += toMinor(t)
  }
  return cells
}

/** Quartile cut-offs over every spending day, so colours mean the same thing in every month. */
export function heatCutoffs(txs: Transaction[]): [number, number, number] {
  const perDay = new Map<string, number>()
  for (const t of txs.filter(isExpense)) perDay.set(t.transaction_date, (perDay.get(t.transaction_date) ?? 0) + toMinor(t))
  const v = [...perDay.values()].sort((a, b) => a - b)
  if (!v.length) return [0, 0, 0]
  const at = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))]
  return [at(0.25), at(0.5), at(0.75)]
}
export const heatLevel = (value: Minor, [q1, q2, q3]: [number, number, number]) => (value <= 0 ? 0 : value <= q1 ? 1 : value <= q2 ? 2 : value <= q3 ? 3 : 4)

// ---------- 4. money flow (sankey) ----------
export type FlowPeriod = 'this-month' | 'last-month' | 'last-90' | 'this-year'
export function flowRange(period: FlowPeriod, now: YMD): { from: string; to: string } {
  const key = monthKeyOf(now)
  if (period === 'this-month') return { from: `${key}-01`, to: toIso(now) }
  if (period === 'last-month') { const k = shiftMonth(key, -1); const { y, m } = parseKey(k); return { from: `${k}-01`, to: `${k}-${pad(daysInMonth(y, m))}` } }
  if (period === 'last-90') return { from: toIso(shiftDays(now, -89)), to: toIso(now) }
  return { from: `${now.y}-01-01`, to: toIso(now) }
}

export interface FlowNode { name: string; value: Minor; kind: 'income' | 'expense' | 'saved' | 'deficit' | 'other' }
export interface FlowData { income: FlowNode[]; expense: FlowNode[]; totalIncome: Minor; totalExpense: Minor; saved: Minor; deficit: Minor; total: Minor }

function groupTop(rows: Transaction[], max: number, minShare: number, kind: 'income' | 'expense', otherName: string): FlowNode[] {
  const by = new Map<string, number>()
  for (const t of rows) by.set(t.category, (by.get(t.category) ?? 0) + toMinor(t))
  const total = [...by.values()].reduce((a, b) => a + b, 0)
  const sorted = [...by.entries()].sort((a, b) => b[1] - a[1])
  const keep: FlowNode[] = []
  let rest = 0
  sorted.forEach(([name, value], i) => { if (i < max && value >= total * minShare) keep.push({ name, value, kind }); else rest += value })
  if (rest > 0) {
    const existing = keep.find(k => k.name === otherName)
    if (existing) existing.value += rest; else keep.push({ name: otherName, value: rest, kind: 'other' })
  }
  return keep.sort((a, b) => (a.kind === 'other' ? 1 : 0) - (b.kind === 'other' ? 1 : 0) || b.value - a.value)
}

export function flowData(txs: Transaction[], range: { from: string; to: string }, otherName = 'Other', savedName = 'Saved', deficitName = 'Beyond income'): FlowData {
  const rows = txs.filter(t => t.transaction_date >= range.from && t.transaction_date <= range.to)
  const inc = rows.filter(isIncome), exp = rows.filter(isExpense)
  const totalIncome = sumMinor(inc), totalExpense = sumMinor(exp)
  const saved = Math.max(0, totalIncome - totalExpense), deficit = Math.max(0, totalExpense - totalIncome)
  const income = groupTop(inc, 4, 0.03, 'income', otherName)
  const expense = groupTop(exp, 7, 0.03, 'expense', otherName)
  if (deficit > 0) income.push({ name: deficitName, value: deficit, kind: 'deficit' })
  if (saved > 0) expense.push({ name: savedName, value: saved, kind: 'saved' })
  return { income, expense, totalIncome, totalExpense, saved, deficit, total: Math.max(totalIncome, totalExpense) }
}

// ---------- 5. month in review ----------
export interface MonthReview {
  key: string
  isCurrent: boolean
  daysElapsed: number
  txCount: number
  income: Minor
  expense: Minor
  saved: Minor
  savingsRate: number | null
  prevExpense: Minor
  deltaPct: number | null
  topCategories: { name: string; value: Minor; share: number }[]
  biggest: Transaction | null
  busiestDay: { iso: string; value: Minor } | null
  noSpendDays: number
  priciestWeekday: { index: number; value: Minor } | null
  score: HealthResult
}

export function monthReview(txs: Transaction[], key: string, now: YMD, fmt: { minor: (m: number) => string }): MonthReview {
  const { y, m } = parseKey(key)
  const isCurrent = key === monthKeyOf(now)
  const daysElapsed = isCurrent ? now.d : daysInMonth(y, m)
  const rows = inMonth(txs, key).filter(t => !isCurrent || t.transaction_date <= toIso(now))
  const exp = rows.filter(isExpense)
  const income = sumMinor(rows.filter(isIncome)), expense = sumMinor(exp)
  const prevExpense = sumMinor(inMonth(txs.filter(isExpense), shiftMonth(key, -1)))

  const by = new Map<string, number>()
  for (const t of exp) by.set(t.category, (by.get(t.category) ?? 0) + toMinor(t))
  const topCategories = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, value]) => ({ name, value, share: expense ? value / expense : 0 }))

  const days = monthDays(txs, key).slice(0, daysElapsed)
  const busy = days.reduce<DayCell | null>((best, c) => (c.expense > (best?.expense ?? 0) ? c : best), null)
  const wd = new Array<number>(7).fill(0)
  for (const c of days) wd[weekdayOf(c.iso)] += c.expense
  const wdMax = Math.max(...wd)

  const end: YMD = isCurrent ? now : { y, m, d: daysInMonth(y, m) }
  return {
    key, isCurrent, daysElapsed, txCount: rows.length, income, expense, saved: income - expense,
    savingsRate: income > 0 ? (income - expense) / income : null,
    prevExpense, deltaPct: prevExpense > 0 ? (expense - prevExpense) / prevExpense : null,
    topCategories,
    biggest: exp.reduce<Transaction | null>((best, t) => (!best || toMinor(t) > toMinor(best) ? t : best), null),
    busiestDay: busy ? { iso: busy.iso, value: busy.expense } : null,
    noSpendDays: days.filter(c => c.expense === 0).length,
    priciestWeekday: wdMax > 0 ? { index: wd.indexOf(wdMax), value: wdMax } : null,
    score: healthScore(txs, end, fmt),
  }
}
