import { useEffect, useMemo } from 'react'
const COLORS = ['#6d5dfc', '#22d3ee', '#f59e0b', '#ec4899', '#22c55e']
export default function Confetti({ onDone }: { onDone: () => void }) {
  const bits = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ i, left: Math.random() * 100, delay: Math.random() * 0.6, c: COLORS[i % COLORS.length] })), [])
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return <div className="confetti" aria-hidden>{bits.map(b => <i key={b.i} style={{ left: `${b.left}%`, background: b.c, animationDelay: `${b.delay}s` }} />)}</div>
}
