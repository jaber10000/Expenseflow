import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { monthLabel } from '../../lib/format'

type Props = { months: string[]; onPlay: (monthKey: string) => void }

export default function StoryCard({ months, onPlay }: Props) {
  const [key, setKey] = useState(months[0] ?? '')
  useEffect(() => { if (!months.includes(key)) setKey(months[0] ?? '') }, [months, key])
  const ready = months.length > 0
  return (
    <section className="ix-story-card">
      <div>
        <span className="ix-eyebrow light">MONTH IN REVIEW</span>
        <h2>{ready ? `Your ${monthLabel(key, 'short')} story is ready` : 'Your monthly story starts with your first entry'}</h2>
        <p>{ready ? 'A 30-second tour of where your money went, what you kept, and your health score.' : 'Add a few transactions and we’ll turn them into a story you can flip through.'}</p>
      </div>
      <div className="ix-story-actions">
        {months.length > 1 && (
          <select value={key} onChange={e => setKey(e.target.value)} aria-label="Choose month">
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
        <button className="button" disabled={!ready} onClick={() => onPlay(key)}><Play size={15} /> Play story</button>
      </div>
    </section>
  )
}
