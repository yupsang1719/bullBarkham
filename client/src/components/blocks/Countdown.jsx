import { useCountdown } from '../../hooks/useCountdown'

export default function Countdown({ targetDate }) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate)
  return (
    <div className="flex items-center gap-4 text-center">
      {[['Days', days], ['Hours', hours], ['Mins', minutes], ['Secs', seconds]].map(([label, val]) => (
        <div key={label} className="min-w-[64px]">
          <div className="text-2xl font-mono tabular-nums">{String(val).padStart(2, '0')}</div>
          <div className="text-xs uppercase tracking-wide text-black/60">{label}</div>
        </div>
      ))}
    </div>
  )
}
