import { ArrowDownLeft, CreditCard, Plus, ReceiptText, Search, SlidersHorizontal } from 'lucide-react'
import type { Transaction } from '../../types'
import { money } from '../../lib/format'

type Props = {
  rows: Transaction[]
  total: number
  search: string
  onSearch: (v: string) => void
  filter: string
  onFilter: (v: string) => void
  onDelete: (id: number) => Promise<void>
  onAdd: () => void
  title: string
  subtitle: string
  /** Show only the newest N rows (used on the Overview page). */
  limit?: number
}

export default function TransactionsPanel({ rows, total, search, onSearch, filter, onFilter, onDelete, onAdd, title, subtitle, limit }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <section className="panel transactions-panel">
      <div className="panel-heading transaction-heading">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <div className="transaction-tools">
          <label className="search-box"><Search size={16} /><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search transactions…" /></label>
          <label className="filter-select"><SlidersHorizontal size={15} /><select value={filter} onChange={e => onFilter(e.target.value)} aria-label="Filter transaction type"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>TYPE</th><th></th></tr></thead>
          <tbody>
            {shown.map(t => (
              <tr key={t.id}>
                <td><div className="transaction-name"><span className={`transaction-symbol ${t.transaction_type}`}>{t.transaction_type === 'income' ? <ArrowDownLeft size={16} /> : <CreditCard size={15} />}</span><div><strong>{t.title}</strong><small>{t.note || 'No note added'}</small></div></div></td>
                <td><span className="category-pill">{t.category}</span></td>
                <td>{new Date(`${t.transaction_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                <td>{t.payment_method}</td>
                <td className={t.transaction_type === 'income' ? 'amount-positive' : 'amount-negative'}>{t.transaction_type === 'income' ? '+' : '−'}{money(Number(t.amount), t.currency)}</td>
                <td><span className={`type-pill ${t.transaction_type}`}>{t.transaction_type}</span></td>
                <td><button className="delete-button" title="Delete transaction" onClick={() => { if (confirm(`Delete "${t.title}"?`)) void onDelete(t.id) }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="empty-table">
          <div className="empty-icon"><ReceiptText size={22} /></div>
          <strong>{search ? 'No matching transactions' : 'Your money story starts here'}</strong>
          <p>{search ? 'Try a different search or filter.' : 'Add your first transaction to bring your dashboard to life.'}</p>
          {!search && <button className="button primary" onClick={onAdd}><Plus size={16} /> Add first transaction</button>}
        </div>
      )}
      <div className="table-footer"><span>Showing <strong>{shown.length}</strong> of <strong>{total}</strong> transactions</span><span><span className="status-dot" /> Synced with your workspace</span></div>
    </section>
  )
}
