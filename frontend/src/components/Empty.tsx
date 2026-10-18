import type { ReactNode } from 'react'
export default function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{text}</p>{action}</div>
}
