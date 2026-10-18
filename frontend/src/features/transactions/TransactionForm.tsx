import { useState } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, catColor, todayIso } from '../../lib/format'
import type { Transaction, TransactionCreate, TransactionType } from '../../types'

type Props = { currency: string; initial?: Transaction | null; onSave: (data: TransactionCreate) => Promise<void>; onCancel: () => void }

export default function TransactionForm({ currency, initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.transaction_type ?? 'expense')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Food')
  const [date, setDate] = useState(initial?.transaction_date ?? todayIso())
  const [payment, setPayment] = useState(initial?.payment_method ?? 'Card')
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const cur = initial?.currency ?? currency

  function switchType(t: TransactionType) {
    setType(t)
    if (!(t === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(category as never)) setCategory(t === 'expense' ? 'Food' : 'Salary')
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || Number(amount) <= 0) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), amount: Number(amount).toFixed(2), transaction_type: type, category, currency: cur, transaction_date: date, payment_method: payment, note: note.trim() || undefined })
    } catch { /* parent shows the error toast */ } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }} onKeyDown={e => e.key === 'Escape' && onCancel()}>
      <form className="modal" onSubmit={submit} aria-label={initial ? 'Edit transaction' : 'Add transaction'}>
        <div className="modal-heading">
          <div><span className="eyebrow">YOUR MONEY, ORGANIZED</span><h2>{initial ? 'Edit transaction' : 'Add transaction'}</h2></div>
          <button type="button" className="plain-icon" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </div>
        <div className={`type-toggle ${type}`}>
          <button type="button" className={`exp ${type === 'expense' ? 'on' : ''}`} onClick={() => switchType('expense')}>Expense</button>
          <button type="button" className={`inc ${type === 'income' ? 'on' : ''}`} onClick={() => switchType('income')}>Income</button>
        </div>
        <label>Amount ({cur})
          <input className="amount-input" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required autoFocus />
        </label>
        <label>Name<input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'income' ? 'e.g. Monthly salary' : 'e.g. Grocery run'} required maxLength={120} /></label>
        <div><label style={{ marginBottom: 8 }}>Category</label>
          <div className="cat-grid">{cats.map(c => (
            <button type="button" key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: catColor(c), marginRight: 6 }} />{c}
            </button>))}</div>
        </div>
        <div className="form-grid">
          <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
          <label>Payment method<select value={payment} onChange={e => setPayment(e.target.value)}>{PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <label>Note (optional)<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a short note…" rows={2} maxLength={2000} /></label>
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button className="button primary" disabled={saving}>{saving ? <><span className="spinner" /> Saving…</> : initial ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </div>
  )
}
