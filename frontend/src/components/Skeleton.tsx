export function Sk({ w = '100%', h = 14, r }: { w?: number | string; h?: number; r?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <>{Array.from({ length: rows }, (_, i) => (
    <div className="sk-row" key={i}><Sk w={44} h={44} r={14} /><div style={{ flex: 1, display: 'grid', gap: 8 }}><Sk w="40%" /><Sk w="22%" h={10} /></div><Sk w={80} /></div>
  ))}</>
}
export function StatsSkeleton() {
  return <div className="stats-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="stat-card"><Sk w={46} h={46} r={14} /><div style={{ flex: 1, display: 'grid', gap: 8 }}><Sk w="50%" h={11} /><Sk w="80%" h={22} /></div></div>)}</div>
}
