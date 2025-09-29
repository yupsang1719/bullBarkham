// client/src/pages/Admin/AdminBookings.jsx
import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/admin'

const API = import.meta.env.VITE_API_URL || '' // Vite proxy -> ''

// Online cap per 30-min slot (should match server's SLOT_CAP)
const SLOT_CAP = 7

const STATUS = ['PENDING','CONFIRMED','CANCELLED']
const SERVICES = ['lunch','dinner']

function cls(...a){ return a.filter(Boolean).join(' ') }
function fmtDate(dt){ return dt.toISOString().slice(0,10) }
function todayISO(){ return fmtDate(new Date()) }

// Human labels
const SERVICE_LABEL = { lunch: 'Lunch (12:00–16:00)', dinner: 'Dinner (18:00–22:00)' }

export default function AdminBookings() {
  // ---- Date header: Today by default, quick arrows to change day
  const [date, setDate] = useState(todayISO())
  const [scope, setScope] = useState('ALL') // ALL | LUNCH | DINNER

  // Data
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [avail, setAvail] = useState([]) // [{time, service, remaining, closed}]
  const [closures, setClosures] = useState([]) // [{_id,date,service,reason}]

  // UI state
  const [changingId, setChangingId] = useState(null)
  const [active, setActive] = useState(null) // drawer booking

  const goDay = (delta) => {
    const d = new Date(date+'T00:00:00')
    d.setDate(d.getDate()+delta)
    setDate(fmtDate(d))
  }

  // Load all bookings (admin endpoint — we filter client-side by date)
  const loadBookings = async () => {
    setLoading(true); setErr('')
    try {
      const list = await adminApi.listBookings()
      setBookings(Array.isArray(list) ? list : [])
    } catch (e) {
      setErr(e.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  // Load availability per timeslot for the selected date
  const loadAvail = async () => {
    try {
      const res = await fetch(`${API}/api/availability?date=${date}`)
      if (!res.ok) throw new Error('Failed to load availability')
      const data = await res.json()
      setAvail(Array.isArray(data) ? data : [])
    } catch {
      setAvail([])
    }
  }

  // Load closures per date
  const loadClosures = async () => {
    try {
      const rows = await adminApi.listClosures(date)
      setClosures(rows || [])
    } catch (e) {
      console.warn('[closures] load error:', e?.message)
      setClosures([])
    }
  }

  useEffect(() => { loadBookings() }, [])
  useEffect(() => { loadAvail(); loadClosures() }, [date])

  // Bookings for this date
  const dayBookings = useMemo(() => bookings.filter(b => b.date === date), [bookings, date])

  // Split by service; sort by timeSlot
  const byService = useMemo(() => {
    const map = { lunch: [], dinner: [] }
    dayBookings.forEach(b => {
      const svc = b.service || guessServiceFromTime(b.timeSlot)
      if (!svc) return
      map[svc].push(b)
    })
    for (const svc of SERVICES) {
      map[svc].sort((a,b) => (a.timeSlot||'').localeCompare(b.timeSlot||'') || (a.createdAt||'').localeCompare(b.createdAt||''))
    }
    return map
  }, [dayBookings])

  // Availability by service -> array of slots for each
  const availByService = useMemo(() => {
    const m = { lunch: [], dinner: [] }
    avail.forEach(a => {
      if (a.service === 'lunch') m.lunch.push(a)
      if (a.service === 'dinner') m.dinner.push(a)
    })
    m.lunch.sort((a,b) => a.time.localeCompare(b.time))
    m.dinner.sort((a,b) => a.time.localeCompare(b.time))
    return m
  }, [avail])

  // Closure helpers
  const lunchClosed  = closures.some(c => c.service === 'lunch')
  const dinnerClosed = closures.some(c => c.service === 'dinner')

  async function toggleClosure(service) {
    try {
      const existing = closures.find(c => c.service === service)
      if (existing) {
        await adminApi.deleteClosure(existing._id) // reopen
      } else {
        await adminApi.createClosure({ date, service, reason: '' }) // close
      }
      await Promise.all([loadClosures(), loadAvail()])
    } catch (e) {
      alert(e.message || 'Failed to toggle closure')
    }
  }

  async function changeStatus(id, newStatus) {
    try {
      setChangingId(id)
      const updated = await adminApi.updateBooking(id, { status: newStatus })
      setBookings(prev => prev.map(b => b._id === id ? updated : b))
      if (active && active._id === id) setActive(updated)
      await loadAvail() // keep utilization in sync
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setChangingId(null)
    }
  }

  function exportCsv() {
    const rows = [
      ['Date','Service','Time','Name','Email','Phone','Adults','Children','Total','Status','Event','Allergies','Occasion','Notes','Created']
    ]
    dayBookings
      .sort((a,b) => (a.service||'').localeCompare(b.service||'') || (a.timeSlot||'').localeCompare(b.timeSlot||''))
      .forEach(b => {
        rows.push([
          b.date,
          b.service || guessServiceFromTime(b.timeSlot) || '',
          b.timeSlot || '',
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
            <button className="btn btn-ghost" onClick={() => setDate(todayISO())}>Today</button>
          </div>

          <div className="flex items-center gap-2">
            <ScopeButton current={scope} value="ALL" label="All" onClick={setScope} />
            <ScopeButton current={scope} value="LUNCH" label="Lunch" onClick={setScope} />
            <ScopeButton current={scope} value="DINNER" label="Dinner" onClick={setScope} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => { loadBookings(); loadAvail(); loadClosures(); }}>Refresh</button>
            <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {/* Closure toggles */}
        <div className="flex items-center gap-2">
          <button
            className={cls('px-3 py-1 rounded border', lunchClosed ? 'bg-red-600 text-white border-red-600' : 'bg-white')}
            onClick={() => toggleClosure('lunch')}
            title={lunchClosed ? 'Reopen lunch' : 'Close lunch'}
          >
            {lunchClosed ? 'Lunch Closed' : 'Close Lunch'}
          </button>
          <button
            className={cls('px-3 py-1 rounded border', dinnerClosed ? 'bg-red-600 text-white border-red-600' : 'bg-white')}
            onClick={() => toggleClosure('dinner')}
            title={dinnerClosed ? 'Reopen dinner' : 'Close dinner'}
          >
            {dinnerClosed ? 'Dinner Closed' : 'Close Dinner'}
          </button>
        </div>

        {/* Utilization by slot */}
        <UtilizationSlots avail={avail} scope={scope} />
      </div>

      {/* Content: Lunch + Dinner sections */}
      <ServiceSection
        title={SERVICE_LABEL.lunch}
        closed={lunchClosed}
        scope={scope}
        scopeKey="LUNCH"
        bookings={byService.lunch}
        changingId={changingId}
        onChangeStatus={changeStatus}
        onOpenDetails={setActive}
      />

      <ServiceSection
        title={SERVICE_LABEL.dinner}
        closed={dinnerClosed}
        scope={scope}
        scopeKey="DINNER"
        bookings={byService.dinner}
        changingId={changingId}
        onChangeStatus={changeStatus}
        onOpenDetails={setActive}
      />

      <DetailsDrawer booking={active} onClose={() => setActive(null)} onUpdateStatus={changeStatus} />
    </div>
  )
}

/* --- Small pieces --- */
function guessServiceFromTime(timeHHMM) {
  if (!timeHHMM) return ''
  return timeHHMM < '17:00' ? 'lunch' : 'dinner'
}

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

function UtilizationSlots({ avail, scope }) {
  // Build rows like: [{service,time,used,remaining,closed}]
  if (!Array.isArray(avail) || avail.length === 0) {
    return <div className="text-sm text-black/60">No availability data for this date.</div>
  }
  const rows = avail
    .filter(a => scope === 'ALL' || (scope === 'LUNCH' ? a.service === 'lunch' : a.service === 'dinner'))
    .slice()
    .sort((a,b) => (a.service||'').localeCompare(b.service||'') || a.time.localeCompare(b.time))
  return (
    <div className="grid gap-1">
      {rows.map(r => {
        const used = r.closed ? SLOT_CAP : Math.max(SLOT_CAP - (r.remaining ?? 0), 0)
        const pct = Math.min(Math.round((used / SLOT_CAP) * 100), 100)
        return (
          <div key={`${r.service}-${r.time}`} className="flex items-center gap-3">
            <div className="w-44 text-xs">
              <span className="font-medium capitalize">{r.service}</span> · {r.time}
              {r.closed && <span className="ml-2 text-[10px] rounded px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200">Closed</span>}
            </div>
            <div className="flex-1 h-3 bg-black/10 rounded overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-28 text-xs text-right tabular-nums">
              {used}/{SLOT_CAP} used
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ServiceSection({ title, closed, scope, scopeKey, bookings, changingId, onChangeStatus, onOpenDetails }) {
  if (scope !== 'ALL' && scope !== scopeKey) return null
  const has = bookings && bookings.length > 0
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">
          <div className="font-medium">
            {title}
            {closed && <span className="ml-2 text-xs rounded px-2 py-0.5 bg-red-50 text-red-700 border border-red-200">Closed</span>}
          </div>
        </div>
      </div>

      {!has ? (
        <div className="text-sm text-black/60">No bookings in this service.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Time</th>
              <th className="py-2 pr-3">Guest</th>
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">Party</th>
              <th className="py-2 pr-3">Flags</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr
                key={b._id}
                className="border-b align-top hover:bg-black/5 cursor-pointer"
                onClick={() => onOpenDetails(b)}
              >
                <td className="py-2 pr-3 tabular-nums">{b.timeSlot || '—'}</td>
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
                    onChange={e => { e.stopPropagation(); onChangeStatus(b._id, e.target.value) }}
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
            <Info label="Time" value={booking.timeSlot || '—'} />
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
              <a className="btn btn-ghost" href={`mailto:${booking.email}?subject=Your booking at The Bull Barkham&body=Hi ${encodeURIComponent(booking.name)},%0D%0A%0D%0AWe have your request for ${booking.date} at ${booking.timeSlot} for ${total} guests.`}>
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