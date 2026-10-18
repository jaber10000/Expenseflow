export default function Ring({ pct, color, children, size = 128 }: { pct: number; color: string; children?: React.ReactNode; size?: number }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} stroke={color}
          style={{ ['--c' as string]: c, strokeDasharray: c, strokeDashoffset: c * (1 - p) }} />
      </svg>
      <div className="mid">{children}</div>
    </div>
  )
}
