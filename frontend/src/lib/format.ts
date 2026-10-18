import type { Transaction } from '../types'

// Money arrives as exact decimal strings; sum as integer minor units to avoid float drift.
export const cents = (t: Transaction) => Math.round(Number(t.amount) * 100)
export const sumCents = (rows: Transaction[]) => rows.reduce((s, t) => s + cents(t), 0) / 100

export const money = (amount: number, currency: string, compact = false) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: compact || Math.abs(amount) >= 1000 ? 0 : 2,
    maximumFractionDigits: compact ? 1 : Math.abs(amount) >= 1000 ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(amount)

/** Whole-unit currency, no decimals (e.g. $1,235). */
export const moneyWhole = (amount: number | string, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount))

/** Ratio -> percent string: pct(0.425) = "43%", pct(0.425, 1) = "42.5%". Non-finite -> "0%". */
export const pct = (ratio: number | string, digits = 0) => {
  const n = Number(ratio)
  return `${(Number.isFinite(n) ? n * 100 : 0).toFixed(digits)}%`
}

/** Money from integer minor units (cents/paisa): moneyMinor(123456, 'USD') = "$1,235". */
export const moneyMinor = (minor: number | string, currency = 'USD') => money(Number(minor) / 100, currency)
/** Compact money from a major-unit amount: moneyCompact(12500, 'USD') = "$12.5K". */
export const moneyCompact = (amount: number | string, currency = 'USD') => money(Number(amount), currency, true)

type DateLike = Date | string
const toDate = (d: DateLike) =>
  d instanceof Date ? d : /^\d{4}-\d{2}$/.test(d) ? parseDate(`${d}-01`) : parseDate(d.slice(0, 10))
/** "October 2026" (accepts Date, "YYYY-MM-DD" or "YYYY-MM"). Pass short=true for "Oct 2026". */
export const monthLabel = (d: DateLike, short = false) =>
  toDate(d).toLocaleDateString('en-US', { month: short ? 'short' : 'long', year: 'numeric' })
/** "Oct 19" */
export const dayLabel = (d: DateLike) => toDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
/** "Monday" / "Mon". Accepts a Date, an ISO string, or a weekday index 0 (Sun) - 6 (Sat). */
export const weekdayName = (d: DateLike | number, short = false) => {
  const date = typeof d === 'number' ? new Date(2024, 0, 7 + d) : toDate(d)
  return date.toLocaleDateString('en-US', { weekday: short ? 'short' : 'long' })
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'

export const parseDate = (iso: string) => new Date(`${iso}T00:00:00`)
export const fmtDate = (iso: string) => parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Accepts a Date or an ISO date string ("2026-10-19" or full timestamp).
export const monthKey = (d: Date | string) => {
  const x = typeof d === 'string' ? parseDate(d.slice(0, 10)) : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

export function greeting(): string {
  const h = new Date().getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Neutralise spreadsheet formula injection when the CSV is opened in Excel.
const csvSafe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)
export function downloadCsv(rows: Transaction[]) {
  const head = ['Name', 'Type', 'Category', 'Date', 'Amount', 'Currency', 'Payment', 'Note']
  const body = rows.map(t => [t.title, t.transaction_type, t.category, t.transaction_date, t.amount, t.currency, t.payment_method, t.note ?? ''])
  const csv = [head, ...body].map(r => r.map(v => `"${csvSafe(String(v)).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'expenseflow-transactions.csv'; a.click()
  URL.revokeObjectURL(url)
}

export const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Subscription', 'Bills', 'Health', 'Other'] as const
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Other'] as const
export const ALL_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Subscription', 'Bills', 'Health', 'Salary', 'Freelance', 'Other']
export const PAYMENT_METHODS = ['Card', 'Cash', 'Bank transfer', 'Mobile wallet', 'Other']

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f59e0b', Shopping: '#ec4899', Transport: '#06b6d4', Subscription: '#8b5cf6',
  Bills: '#ef4444', Health: '#10b981', Salary: '#22c55e', Freelance: '#3b82f6', Other: '#94a3b8',
}
export const catColor = (c: string) => CATEGORY_COLORS[c] ?? '#94a3b8'
