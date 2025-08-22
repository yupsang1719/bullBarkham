import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/admin'

const API = import.meta.env.VITE_API_URL || '' // Vite proxy -> ''
const CAP = 32

const SESSION_LABELS = {
  'lunch-1':  'Lunch — 11:45–13:45',
  'lunch-2':  'Lunch — 14:00–16:00',
  'dinner-1': 'Dinner — 17:45–19:45',
  'dinner-2': 'Dinner — 20:00–22:00'
}
const SESSION_SERVICE = (id) => id.startsWith('lunch') ? 'lunch' : 'dinner'
const STATUS = ['PENDING','CONFIRMED','CANCELLED']

function cls(...a){ return a.filter(Boolean).join(' ') }
function fmtDate(dt){ return dt.toISOString().slice(0,10) }

export default function AdminBookings() {
  // ---- Date header: Today by default, quick arrows to change day
  const [date, setDate] = useState(() => fmtDate(new Date()))
  const [scope, setScope] = useState('ALL') // ALL | LUNCH | DINNER
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [util, setUtil] = useState([]) // [{session,label,service,remaining}]
  const [changingId, setChangingId] = useState(null)
  const [active, setActive] = useState(null) // drawer booking

  const goDay = (delta) => {
    const d = new Date(date+'T00:00:00')
    d.setDate(d.getDate()+delta)
    setDate(fmtDate(d))
  }

  // Load all bookings (admin endpoint)
  const loadBookings = async () => {
    setLoading(true); setErr('')
    try {
      const list = await adminApi.listBookings()
      setBookings(list)
    } catch (e) {
      setErr(e.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  // Load utilization per session for the selected date
  const loadUtil = async () => {
    try {
      const res = await fetch(`${API}/api/availability?date=${date}`)
      if (!res.ok) throw new Error('Failed to load availability')
      const data = await res.json()
      setUtil(Array.isArray(data) ? data : [])
    } catch {
      setUtil([])
    }
  }

  useEffect(() => { loadBookings() }, [])
  useEffect(() => { loadUtil() }, [date])

  // Filter the bookings client‑side for the chosen date + scope
  const dayBookings = useMemo(() => {
    const list = bookings.filter(b => b.date === date)
    if (scope === 'ALL') return list
    if (scope === 'LUNCH') return list.filter(b => (b.service || SESSION_SERVICE(b.session)) === 'lunch')
    if (scope === 'DINNER') return list.filter(b => (b.service || SESSION_SERVICE(b.session)) === 'dinner')
    return list
  }, [bookings, date, scope])

  // Group by session for quick scanning
  const bySession = useMemo(() => {
    const map = new Map()
    dayBookings.forEach(b => {
      const k = b.session || 'unknown'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(b)
    })
    // ensure all sessions for date appear in order
    const order = ['lunch-1','lunch-2','dinner-1','dinner-2']
    return order
      .map(k => ({ session: k, label: SESSION_LABELS[k], rows: map.get(k) || [] }))
  }, [dayBookings])

  async function changeStatus(id, newStatus) {
    try {
      setChangingId(id)
      const updated = await adminApi.updateBooking(id, { status: newStatus })
      setBookings(prev => prev.map(b => b._id === id ? updated : b))
      if (active && active._id === id) setActive(updated)
      await loadUtil() // keep utilization in sync
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setChangingId(null)
    }
  }

  function exportCsv() {
    const rows = [
      ['Date','Session','Service','Name','Email','Phone','Adults','Children','Total','Status','Event','Allergies','Occasion','Notes','Created']
    ]
    dayBookings
      .sort((a,b) => (a.session||'').localeCompare(b.session||'') || (a.createdAt||'').localeCompare(b.createdAt||''))
      .forEach(b => {
        rows.push([
          b.date,
          SESSION_LABELS[b.session] || b.session,
          b.service || SESSION_SERVICE(b.session),
          b.name, b.email, b.phone,
          b.partyAdults ?? '', b.partyChildren ?? '',
          b.partySize ?? b.groupSize ?? '',
          b.status,
          b.eventSlug || '',
          b.allergies || '',
          b.occasion || '',
          b.specialNotes || b.message || '',
          b.createdAt ? new Date(b.createdAt).toLocaleString() : ''
        ])
      })
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings_${date}_${scope}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6">
      {/* Header: date quick nav + scope + actions */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => goDay(-1)} aria-label="Previous day">◀</button>
            <input
              type="date"
              className="border rounded px-2 py-2"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={() => goDay(+1)} aria-label="Next day">▶</button>
            <button className="btn btn-ghost" onClick={() => setDate(fmtDate(new Date()))}>Today</button>
          </div>

          <div className="flex items-center gap-2">
            <ScopeButton current={scope} value="ALL" label="All" onClick={setScope} />
            <ScopeButton current={scope} value="LUNCH" label="Lunch" onClick={setScope} />
            <ScopeButton current={scope} value="DINNER" label="Dinner" onClick={setScope} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => { loadBookings(); loadUtil(); }}>Refresh</button>
            <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {/* Utilization */}
        <Utilization util={util} scope={scope} />
      </div>

      {/* Content */}
      <div className="grid gap-4">
        {loading ? (
          <div className="card p-4">Loading…</div>
        ) : err ? (
          <div className="card p-4 text-red-700">{err}</div>
        ) : (
          bySession.map(group => {
            const service = SESSION_SERVICE(group.session)
            if (scope === 'LUNCH' && service !== 'lunch') return null
            if (scope === 'DINNER' && service !== 'dinner') return null

            const avail = util.find(u => u.session === group.session)
            const remaining = avail ? avail.remaining : CAP
            const used = Math.max(CAP - remaining, 0)

            return (
              <div className="card p-4" key={group.session}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm">
                    <div className="font-medium">{SESSION_LABELS[group.session]}</div>
                    <div className="text-black/60">{service} · {used}/{CAP} seats used</div>
                  </div>
                </div>

                {group.rows.length === 0 ? (
                  <div className="text-sm text-black/60">No bookings in this session.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-3">Guest</th>
                        <th className="py-2 pr-3">Contact</th>
                        <th className="py-2 pr-3">Party</th>
                        <th className="py-2 pr-3">Flags</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows
                        .sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''))
                        .map(b => (
                        <tr
                          key={b._id}
                          className="border-b align-top hover:bg-black/5 cursor-pointer"
                          onClick={() => setActive(b)}
                        >
                          <td className="py-2 pr-3">
                            <div className="font-medium">{b.name}</div>
                            {b.eventSlug && <div className="text-xs text-blue-800 bg-blue-50 inline-block rounded px-2 py-0.5 mt-1">Event: {b.eventSlug}</div>}
                          </td>
                          <td className="py-2 pr-3">
                            <div>{b.phone}</div>
                            <div className="text-xs text-black/60">{b.email}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <div>{(b.partySize ?? b.groupSize) || 0} total</div>
                            <div className="text-xs text-black/60">A{b.partyAdults ?? 0} / C{b.partyChildren ?? 0}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="text-xs">
                              {b.hasAccessibilityNeeds && <Flag>Accessibility</Flag>}
                              {b.allergies && <Flag title={`Allergies: ${b.allergies}`}>Allergies</Flag>}
                              {(b.occasion || b.occasionNotes) && <Flag>Occasion</Flag>}
                              {(b.specialNotes || b.message) && <Flag>Notes</Flag>}
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              className={cls('border rounded px-2 py-1',
                                b.status === 'CONFIRMED' && 'bg-green-50',
                                b.status === 'CANCELLED' && 'bg-red-50')}
                              value={b.status}
                              disabled={changingId === b._id}
                              onChange={e => { e.stopPropagation(); changeStatus(b._id, e.target.value) }}
                            >
                              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="text-2xs text-black/50 mt-1">
                              {b.createdAt ? new Date(b.createdAt).toLocaleString() : ''}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })
        )}
      </div>

      <DetailsDrawer booking={active} onClose={() => setActive(null)} onUpdateStatus={changeStatus} />
    </div>
  )
}

/* --- Small pieces --- */
function ScopeButton({ current, value, label, onClick }) {
  const active = current === value
  return (
    <button
      className={cls('px-3 py-1 rounded border', active ? 'bg-black text-white border-black' : 'bg-white')}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
  )
}

function Utilization({ util, scope }) {
  if (!util || util.length === 0) {
    return <div className="text-sm text-black/60">No availability data for this date.</div>
  }
  const order = ['lunch-1','lunch-2','dinner-1','dinner-2']
  return (
    <div className="grid gap-2">
      <div className="text-sm text-black/70">Utilization (cap {CAP})</div>
      <div className="grid gap-1">
        {order.map(id => {
          const row = util.find(u => u.session === id) || { remaining: CAP, label: SESSION_LABELS[id], service: SESSION_SERVICE(id) }
          if (scope === 'LUNCH' && row.service !== 'lunch') return null
          if (scope === 'DINNER' && row.service !== 'dinner') return null
          const used = Math.max(CAP - (row.remaining ?? CAP), 0)
          const pct = Math.min(Math.round((used / CAP) * 100), 100)
          return (
            <div key={id} className="flex items-center gap-3">
              <div className="w-40 text-xs">{row.label || SESSION_LABELS[id]}</div>
              <div className="flex-1 h-3 bg-black/10 rounded overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 text-xs text-right tabular-nums">{used}/{CAP} used</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailsDrawer({ booking, onClose, onUpdateStatus }) {
  if (!booking) return null
  const total = booking.partySize ?? booking.groupSize
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={onClose}>
      <div className="w-full max-w-lg h-full bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">Booking Details</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 grid gap-4 overflow-auto h-[calc(100%-56px)]">
          {/* Guest & contact */}
          <section>
            <div className="text-xl font-semibold">{booking.name}</div>
            <div className="text-sm mt-1">
              <a className="link" href={`tel:${booking.phone}`}>{booking.phone}</a> ·{' '}
              <a className="link" href={`mailto:${booking.email}`}>{booking.email}</a>
            </div>
          </section>

          {/* When */}
          <section className="grid grid-cols-2 gap-3">
            <Info label="Date" value={booking.date} />
            <Info label="Service" value={booking.service || '—'} />
            <Info label="Session" value={SESSION_LABELS[booking.session] || booking.session} />
            <Info label="Event" value={booking.eventSlug || '—'} />
          </section>

          {/* Party */}
          <section className="grid grid-cols-3 gap-3">
            <Info label="Adults" value={booking.partyAdults ?? '—'} />
            <Info label="Children" value={booking.partyChildren ?? '—'} />
            <Info label="Total" value={total ?? '—'} />
          </section>

          {/* Flags / Notes */}
          <section className="grid gap-2">
            {booking.hasAccessibilityNeeds && <Badge>Accessibility needs</Badge>}
            {booking.allergies && <Info label="Allergies" value={booking.allergies} />}
            {(booking.occasion || booking.occasionNotes) && (
              <Info label="Occasion" value={`${booking.occasion || '—'} ${booking.occasionNotes ? `– ${booking.occasionNotes}` : ''}`} />
            )}
            {(booking.specialNotes || booking.message) && (
              <Info label="Notes" value={booking.specialNotes || booking.message} />
            )}
            {booking.accessibilityNotes && <Info label="Access Notes" value={booking.accessibilityNotes} />}
          </section>

          {/* Status + actions */}
          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Status:</span>
              <select
                className={cls('border rounded px-2 py-1',
                  booking.status === 'CONFIRMED' && 'bg-green-50',
                  booking.status === 'CANCELLED' && 'bg-red-50')}
                value={booking.status}
                onChange={e => onUpdateStatus(booking._id, e.target.value)}
              >
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <a className="btn btn-ghost" href={`mailto:${booking.email}?subject=Your booking at The Bull Barkham&body=Hi ${encodeURIComponent(booking.name)},%0D%0A%0D%0AWe have your request for ${booking.date} (${SESSION_LABELS[booking.session] || booking.session}) for ${total} guests.`}>
                Email guest
              </a>
              <a className="btn btn-ghost" href={`tel:${booking.phone}`}>Call</a>
            </div>

            <div className="text-2xs text-black/50">
              Created: {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '—'} ·
              Updated: {booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '—'}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-black/50">{label}</div>
      <div className="text-sm">{value || '—'}</div>
    </div>
  )
}
function Badge({ children }) {
  return <span className="inline-block text-xs bg-purple-50 text-purple-800 rounded px-2 py-0.5">{children}</span>
}
function Flag({ children, title }) {
  return <span title={title} className="inline-block text-xs bg-black/10 text-black rounded px-2 py-0.5 mr-1">{children}</span>
}
