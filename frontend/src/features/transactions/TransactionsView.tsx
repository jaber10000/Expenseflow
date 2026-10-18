import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Plus, ReceiptText, Search } from 'lucide-react'
import Empty from '../../components/Empty'
import { TableSkeleton } from '../../components/Skeleton'
import TransactionRow from './TransactionRow'
import { ALL_CATEGORIES, cents, downloadCsv, money, parseDate, sumCents } from '../../lib/format'
import type { Transaction } from '../../types'

type Props = { transactions: Transaction[]; currency: string; loading: boolean; onAdd: () => void; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void; initialSearch?: string }
const PAGE = 12
const RANGES = [['all', 'All time'], ['month', 'This month'], ['90', 'Last 90 days'], ['year', 'This year']] as const
const SORTS = [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['amt-desc', 'Highest amount'], ['amt-asc', 'Lowest amount']] as const

export default function TransactionsView({ transactions, currency, loading, onAdd, onEdit, onDelete }: Props) {
  const [q, setQ] = useState(''); const [type, setType] = useState('all'); const [cat, setCat] = useState('all')
  const [range, setRange] = useState('all'); const [sort, setSort] = useState('date-desc'); const [page, setPage] = useState(0)

  const rows = useMemo(() => {
    const now = new Date(); const start = (() => {
      if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
      if (range === 'year') return new Date(now.getFullYear(), 0, 1)
      if (range === '90') return new Date(now.getTime() - 90 * 864e5)
      return null })()
    const s = q.trim().toLowerCase()
    const out = transactions.filter(t =>
      (type === 'all' || t.transaction_type === type) && (cat === 'all' || t.category === cat) &&
      (!start || parseDate(t.transaction_date) >= start) &&
      (!s || `${t.title} ${t.category} ${t.note ?? ''} ${t.payment_method}`.toLowerCase().includes(s)))
    const dir = sort.endsWith('asc') ? 1 : -1
    return out.sort((a, b) => sort.startsWith('amt') ? (cents(a) - cents(b)) * dir : (a.transaction_date.localeCompare(b.transaction_date) || a.id - b.id) * dir)
  }, [transactions, q, type, cat, range, sort])

  useEffect(() => setPage(0), [q, type, cat, range, sort])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE)
  const inc = sumCents(rows.filter(t => t.transaction_type === 'income')), exp = sumCents(rows.filter(t => t.transaction_type === 'expense'))

  const groups: [string, Transaction[]][] = []
  for (const t of slice) {
    const label = sort.startsWith('date') ? parseDate(t.transaction_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Results'
    const g = groups[groups.length - 1]
    if (g && g[0] === label) g[1].push(t); else groups.push([label, [t]])
  }
  let idx = 0

  return (
    <div className="view">
      <div className="page-heading">
        <div><span className="eyebrow">LEDGER</span><h1>Transactions</h1><p>Search, filter and manage every entry.</p></div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => downloadCsv(rows)} disabled={!rows.length}><Download size={16} /> Export CSV</button>
          <button className="button primary" onClick={onAdd}><Plus size={17} /> Add transaction</button>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <label className="search-box"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, category, note…" aria-label="Search transactions" /></label>
          <select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range">{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="chips" style={{ marginTop: 14 }}>
          {[['all', 'All'], ['income', 'Income'], ['expense', 'Expenses']].map(([v, l]) => <button key={v} className={`chip ${type === v ? 'on' : ''}`} onClick={() => setType(v)}>{l}</button>)}
          <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          {['all', ...ALL_CATEGORIES].map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c === 'all' ? 'Any category' : c}</button>)}
        </div>
        <div className="sum-strip" style={{ margin: '16px 4px 4px' }}>
          <span>Income <strong style={{ color: 'var(--green)' }}>{money(inc, currency)}</strong></span>
          <span>Expenses <strong>{money(exp, currency)}</strong></span>
          <span>Net <strong>{money(inc - exp, currency)}</strong></span>
        </div>
        {loading && !transactions.length ? <TableSkeleton rows={7} />
          : groups.length ? groups.map(([label, list]) => (
            <div key={label}><div className="tx-group"><span>{label}</span></div>
              {list.map(t => <TransactionRow key={t.id} t={t} index={idx++} onEdit={onEdit} onDelete={onDelete} />)}</div>))
          : <Empty icon={<ReceiptText size={24} />} title={transactions.length ? 'No matching transactions' : 'No transactions yet'} text={transactions.length ? 'Try a different search or clear a filter.' : 'Add your first one to get started.'} action={!transactions.length ? <button className="button primary" onClick={onAdd}><Plus size={16} /> Add transaction</button> : undefined} />}
        <div className="pager">
          <span>Showing <strong>{rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, (page + 1) * PAGE)}</strong> of <strong>{rows.length}</strong></span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="icon-button" style={{ width: 34, height: 34 }} disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            Page {page + 1} / {pages}
            <button className="icon-button" style={{ width: 34, height: 34 }} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </span>
        </div>
      </section>
    </div>
  )
}
