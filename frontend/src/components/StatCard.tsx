import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'

type Props = { label: string; value: number | string; format?: (n: number) => string; note: string; icon: ReactNode; tone: string; delta?: number | null; goodWhenUp?: boolean; index?: number }

export default function StatCard({ label, value, format, note, icon, tone, delta, goodWhenUp = true, index = 0 }: Props) {
  const shown = useCountUp(Number(value) || 0)
  const good = delta == null ? null : (delta >= 0) === goodWhenUp
  return (
    <article className="stat-card reveal" style={{ ['--tone' as string]: tone, ['--i' as string]: index }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong>{typeof value === 'string' || !format ? value : format(shown)}</strong>
        {delta != null && Number.isFinite(delta)
          ? <span className={`delta ${Math.abs(delta) < 0.5 ? 'flat' : good ? 'up' : 'down'}`}>
              {Math.abs(delta) < 0.5 ? <Minus size={12} /> : delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta).toFixed(0)}% vs last month
            </span>
          : <small>{note}</small>}
      </div>
    </article>
  )
}
