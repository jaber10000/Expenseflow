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

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'

export const parseDate = (iso: string) => new Date(`${iso}T00:00:00`)
export const fmtDate = (iso: string) => parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

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

export const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
  });

export const monthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

export const moneyCompact = (
  amount: number,
  currency = "USD"
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
