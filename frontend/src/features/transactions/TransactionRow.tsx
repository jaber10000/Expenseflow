import { ArrowDownLeft, Pencil, Trash2 } from 'lucide-react'
import { catColor, fmtDate, money } from '../../lib/format'
import type { Transaction } from '../../types'

type Props = { t: Transaction; index?: number; onEdit?: (t: Transaction) => void; onDelete?: (t: Transaction) => void; showDate?: boolean }

export default function TransactionRow({ t, index = 0, onEdit, onDelete, showDate = true }: Props) {
  const inc = t.transaction_type === 'income'
  return (
    <div className="tx-row" style={{ ['--i' as string]: Math.min(index, 14), ['--c' as string]: catColor(t.category) }}>
      <div className="tx-icon">{inc ? <ArrowDownLeft size={18} /> : t.category[0]}</div>
      <div className="tx-main">
        <strong>{t.title}</strong>
        <small><span className="pill">{t.category}</span>{showDate && fmtDate(t.transaction_date)} · {t.payment_method}{t.note ? ` · ${t.note}` : ''}</small>
      </div>
      <div className={`tx-amt ${inc ? 'in' : 'out'}`}>{inc ? '+' : '−'}{money(Number(t.amount), t.currency)}</div>
      {(onEdit || onDelete) && <div className="tx-actions">
        {onEdit && <button className="plain-icon" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}><Pencil size={15} /></button>}
        {onDelete && <button className="plain-icon del" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t)}><Trash2 size={15} /></button>}
      </div>}
    </div>
  )
}
