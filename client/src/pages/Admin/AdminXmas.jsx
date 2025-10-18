import { useEffect, useMemo, useState } from 'react'
import { xmasAdminApi } from '../../lib/adminXmas'

const API = import.meta.env.VITE_API_URL || ''
const SITTINGS = [
  { id: 'xmas-early', label: '12:00 – 2:00 PM' },
  { id: 'xmas-late',  label: '2:30 – 4:30 PM' }
]

const MENU = {
  starters: [
    "Chicken liver, foie gras & brandy parfait, red onion jelly, toasted brioche",
    "Pan-fried scallops, Loch Duart smoked salmon, maple bacon crumb, celeriac purée",
    "Wild mushroom & truffle arancini, rocket pesto, balsamic",
    "Five-spice crispy confit duck, cucumber, spring onion, pickled ginger, sticky soy",
    "Crispy tempura prawns, pineapple Bombay potato salad, coriander",
  ],
  mains: [
    "Roast bronze turkey, pigs in blankets, sprout & parmesan, duck-fat roast potatoes, bread sauce, red cabbage, pouring gravy, maple parsnips",
    "Slow-braised short rib, truffle mash, maple parsnips, parsley mash, parsnip crisps",
    "Pan-fried line-caught sea bass, garlic prawns, balsamic Mediterranean veg, salsa verde, rocket",
    "Pink carved rack of lamb, dauphinoise potatoes, green beans, black pudding croquette, redcurrant jus",
    "Wild mushroom, tarragon & butternut wellington, roast potatoes, parsnips, red cabbage, hollandaise",
  ],
  desserts: [
    "Stout Christmas pudding, brandy ice cream",
    "Panna cotta, mango, passionfruit meringue",
    "Banoffee cheesecake, caramelised bananas, sticky toffee sauce",
    "Mince pie truffle, Cointreau cream, dark chocolate",
    "Selection of ice creams / sorbets",
    "Christmas cheese board (+£10)",
  ],
}

function numberClamp(n){ const x = Number(n)||0; return x<0?0:Math.floor(x) }

export default function AdminXmas() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [availability, setAvailability] = useState({})
  const [closures, setClosures] = useState([])
  const [bookings, setBookings] = useState([])

  const [filterSitting, setFilterSitting] = useState('') // '', 'xmas-early', 'xmas-late'

  // Create form
  const [form, setForm] = useState({
    sittingId: 'xmas-early',
    name: '', phone: '', email: '',
    partyAdults: '', partyChildren: '',
    allergies:'', occasionNotes:'', specialNotes:'',
    starters: {}, mains: {}, desserts: {}
  })
  const totalGuests = useMemo(() => (Number(form.partyAdults||0) + Number(form.partyChildren||0)), [form.partyAdults, form.partyChildren])
  const totals = useMemo(() => {
    const sum = (obj={}) => Object.values(obj).reduce((s,v)=>s+(Number(v)||0),0)
    return { starters: sum(form.starters), mains: sum(form.mains), desserts: sum(form.desserts) }
  }, [form.starters, form.mains, form.desserts])
  const courseOk = {
    starters: totals.starters === totalGuests && totalGuests>0,
    mains:    totals.mains    === totalGuests && totalGuests>0,
    desserts: totals.desserts === totalGuests && totalGuests>0,
  }
  const allOk = totalGuests>0 && courseOk.starters && courseOk.mains && courseOk.desserts &&
                form.name && form.phone && form.email && form.sittingId

  const refreshAll = async () => {
    setLoading(true); setErr('')
    try {
      const [avail, clos, list] = await Promise.all([
        xmasAdminApi.availability(),
        xmasAdminApi.listClosures(),
        xmasAdminApi.listBookings(filterSitting ? { sittingId: filterSitting } : {})
      ])
      setAvailability(avail); setClosures(clos); setBookings(list)
    } catch (e) {
      setErr(e.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { refreshAll() }, [filterSitting])

  const setField = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }
  const setCount = (course, item, value) => {
    setForm(f => ({ ...f, [course]: { ...(f[course]||{}), [item]: numberClamp(value) } }))
  }

  async function createBooking() {
    if (!allOk) return alert('Please fill contact, party and allocate each course equal to total guests.')
    try {
      const payload = {
        sittingId: form.sittingId,
        name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
        partyAdults: Number(form.partyAdults||0),
        partyChildren: Number(form.partyChildren||0),
        selections: {
          starters: Object.entries(form.starters).map(([item,count])=>({ item, count:Number(count)||0 })),
          mains:    Object.entries(form.mains).map(([item,count])=>({ item, count:Number(count)||0 })),
          desserts: Object.entries(form.desserts).map(([item,count])=>({ item, count:Number(count)||0 })),
        },
        allergies: form.allergies, occasionNotes: form.occasionNotes, specialNotes: form.specialNotes
      }
      const row = await xmasAdminApi.createBooking(payload)
      setBookings(b => [row, ...b])
      setForm({
        sittingId: form.sittingId, name:'', phone:'', email:'',
        partyAdults:'', partyChildren:'',
        allergies:'', occasionNotes:'', specialNotes:'',
        starters:{}, mains:{}, desserts:{}
      })
      refreshAll()
    } catch (e) {
      alert(e.message || 'Create failed')
    }
  }

  async function updateStatus(id, status) {
    try {
      const row = await xmasAdminApi.updateBooking(id, { status })
      setBookings(list => list.map(b => b._id === id ? row : b))
      refreshAll()
    } catch (e) {
      alert(e.message || 'Update failed')
    }
  }

  async function closeSitting(sittingId) {
    const reason = prompt(`Reason for closing ${sittingId}? (optional)`) || ''
    try {
      await xmasAdminApi.closeSitting(sittingId, reason)
      refreshAll()
    } catch (e) {
      alert(e.message || 'Close failed')
    }
  }
  async function reopenClosure(id) {
    try {
      await xmasAdminApi.reopenClosure(id)
      refreshAll()
    } catch (e) {
      alert(e.message || 'Reopen failed')
    }
  }

  return (
    <div className="grid gap-6">
      <header className="card p-4 flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold">Christmas Admin</div>
        <div className="ml-auto flex items-center gap-2">
          <select value={filterSitting} onChange={e=>setFilterSitting(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All sittings</option>
            {SITTINGS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={refreshAll}>Refresh</button>
          <a className="btn btn-ghost" href={`${API}/api/christmas/orders.csv${filterSitting?`?sittingId=${filterSitting}`:''}`} target="_blank" rel="noreferrer">Download CSV</a>
          <a className="btn btn-ghost" href={`${API}/api/christmas/orders-summary.csv${filterSitting?`?sittingId=${filterSitting}`:''}`} target="_blank" rel="noreferrer">Chef Prep CSV</a>
          <a className="btn btn-ghost" href={`${API}/api/christmas/print/summary${filterSitting?`?sittingId=${filterSitting}`:''}`} target="_blank" rel="noreferrer">Print Prep (HTML)</a>
          <a className="btn btn-ghost" href={`${API}/api/christmas/print/orders${filterSitting?`?sittingId=${filterSitting}`:''}`} target="_blank" rel="noreferrer">Print Orders (HTML)</a>
        </div>

        {/* Availability & closures */}
        <div className="w-full mt-3 grid gap-2">
          <div className="text-sm text-black/70">Availability</div>
          {SITTINGS.map(s => {
            const row = availability?.[s.id] || {}
            const cap = row.capacity ?? '—'
            const rem = row.closed ? 0 : (row.remaining ?? '—')
            const used = typeof cap === 'number' && typeof rem === 'number' ? (cap - rem) : '—'
            const closedRow = closures.find(c => c.sittingId === s.id)
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-48 text-sm">{s.label} {row.closed && <span className="ml-2 text-xs text-red-700">[Closed]</span>}</div>
                <div className="flex-1 h-3 bg-black/10 rounded overflow-hidden">
                  {typeof used === 'number' && typeof cap === 'number' && (
                    <div className="h-full" style={{ width: `${Math.min(100, Math.round((used/cap)*100))}%` }} />
                  )}
                </div>
                <div className="w-28 text-right text-sm tabular-nums">{used}/{cap}</div>
                {!row.closed ? (
                  <button className="btn btn-ghost" onClick={() => closeSitting(s.id)}>Close</button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => reopenClosure(closedRow?._id)}>Reopen</button>
                )}
              </div>
            )
          })}
        </div>
      </header>

      {loading ? (
        <div className="card p-4">Loading…</div>
      ) : err ? (
        <div className="card p-4 text-red-700">{err}</div>
      ) : (
        <>
          {/* Create booking */}
          <div className="card p-4 grid gap-3">
            <div className="text-base font-semibold">Create booking (phone/walk-in)</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Sitting</label>
                <select name="sittingId" className="border rounded px-2 py-1 w-full" value={form.sittingId} onChange={setField}>
                  {SITTINGS.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} {availability?.[s.id]?.closed ? '— Closed' : `— ${(availability?.[s.id]?.remaining ?? '…')} left`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input name="name" className="border rounded px-2 py-1 w-full" value={form.name} onChange={setField} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input name="phone" className="border rounded px-2 py-1 w-full" value={form.phone} onChange={setField} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input name="email" className="border rounded px-2 py-1 w-full" value={form.email} onChange={setField} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Adults</label>
                <input name="partyAdults" type="number" min="0" className="border rounded px-2 py-1 w-full" value={form.partyAdults} onChange={setField} />
              </div>
              <div>
                <label className="block text-sm mb-1">Children</label>
                <input name="partyChildren" type="number" min="0" className="border rounded px-2 py-1 w-full" value={form.partyChildren} onChange={setField} />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-black/70"><strong>Total:</strong> {totalGuests||0}</div>
              </div>
            </div>

            {/* Pre-order selection */}
            {['starters','mains','desserts'].map(course => (
              <div key={course} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium capitalize">{course}</div>
                  <div className={`text-sm ${courseOk[course] ? 'text-green-700' : 'text-black/70'}`}>
                    {totals[course]}/{totalGuests} selected
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {MENU[course].map(item => (
                    <label key={item} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                      <span className="text-sm">{item}</span>
                      <input
                        type="number" min="0" className="w-20 border rounded px-2 py-1 text-right"
                        value={form?.[course]?.[item] ?? ''}
                        onChange={e => setCount(course, item, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
                {!courseOk[course] && totalGuests>0 && (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                    Please allocate exactly {totalGuests} {totalGuests===1?'dish':'dishes'} for {course}.
                  </div>
                )}
              </div>
            ))}

            <div className="grid sm:grid-cols-3 gap-3">
              <input name="allergies" placeholder="Allergies" className="border rounded px-2 py-1" value={form.allergies} onChange={setField} />
              <input name="occasionNotes" placeholder="Occasion notes" className="border rounded px-2 py-1" value={form.occasionNotes} onChange={setField} />
              <input name="specialNotes" placeholder="Special notes" className="border rounded px-2 py-1" value={form.specialNotes} onChange={setField} />
            </div>

            <div>
              <button className="btn btn-primary disabled:opacity-60" disabled={!allOk} onClick={createBooking}>Create booking</button>
            </div>
          </div>

          {/* Bookings table */}
          <div className="card p-4">
            <div className="text-base font-semibold mb-2">Bookings</div>
            {bookings.length === 0 ? (
              <div className="text-sm text-black/60">No bookings yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Guest</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Sitting</th>
                    <th className="py-2 pr-3">Party</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id} className="border-b align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{b.name}</div>
                        {b.allergies && <div className="text-xs text-red-700">Allergies: {b.allergies}</div>}
                        {(b.specialNotes || b.occasionNotes) && (
                          <div className="text-xs text-black/60">{b.occasionNotes || b.specialNotes}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div>{b.phone}</div>
                        <div className="text-xs text-black/60">{b.email}</div>
                      </td>
                      <td className="py-2 pr-3">{b.sittingLabel || b.sittingId}</td>
                      <td className="py-2 pr-3">A{b.partyAdults||0} / C{b.partyChildren||0} — <strong>{b.partySize||0}</strong></td>
                      <td className="py-2 pr-3">
                        <select
                          className={`border rounded px-2 py-1 ${b.status==='CONFIRMED'?'bg-green-50': b.status==='CANCELLED'?'bg-red-50':''}`}
                          value={b.status}
                          onChange={e => updateStatus(b._id, e.target.value)}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <a className="btn btn-ghost" href={`${API}/api/christmas/print/booking/${b._id}`} target="_blank" rel="noreferrer">Print</a>
                          <a className="btn btn-ghost" href={`${API}/api/christmas/print/orders?sittingId=${b.sittingId}`} target="_blank" rel="noreferrer">Print Sitting</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}