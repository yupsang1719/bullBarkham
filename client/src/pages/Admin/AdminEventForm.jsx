import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi, getToken } from '../../lib/admin'

export default function AdminEventForm() {
  const { id } = useParams()
  const isNew = !id
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', slug: '', date: '', time: '',
    tags: '', cover: '', badges: '', summary: '', isMajor: false
  })

  useEffect(() => {
    if (!getToken()) return nav('/admin')
  }, [nav])

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        // there’s no GET by id route, so list and pick
        const all = await adminApi.listEvents()
        const found = all.find(e => e._id === id)
        if (!found) return setErr('Event not found')
        setForm({
          title: found.title || '',
          slug: found.slug || '',
          date: found.date || '',
          time: found.time || '',
          tags: (found.tags || []).join(', '),
          cover: found.cover || '',
          badges: (found.badges || []).join(', '),
          summary: found.summary || '',
          isMajor: !!found.isMajor
        })
      } catch (e) { setErr(e.message) }
    }
    load()
  }, [id])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(s=>s.trim()).filter(Boolean),
        badges: form.badges.split(',').map(s=>s.trim()).filter(Boolean)
      }
      if (isNew) await adminApi.createEvent(payload)
      else await adminApi.updateEvent(id, payload)
      nav('/admin/events')
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="card p-6 grid gap-4 max-w-2xl">
      <h2 className="text-lg font-medium">{isNew ? 'Add Event' : 'Edit Event'}</h2>
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input name="title" className="w-full rounded-md border px-3 py-2" value={form.title} onChange={onChange} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input name="slug" className="w-full rounded-md border px-3 py-2" value={form.slug} onChange={onChange} required />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Date (YYYY-MM-DD)</label>
          <input name="date" type="date" className="w-full rounded-md border px-3 py-2" value={form.date} onChange={onChange} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Time (HH:mm)</label>
          <input name="time" type="time" className="w-full rounded-md border px-3 py-2" value={form.time} onChange={onChange} required />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Tags (comma-separated)</label>
          <input name="tags" className="w-full rounded-md border px-3 py-2" value={form.tags} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">Badges (comma-separated)</label>
          <input name="badges" className="w-full rounded-md border px-3 py-2" value={form.badges} onChange={onChange} />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Cover (URL or /images/...)</label>
        <input name="cover" className="w-full rounded-md border px-3 py-2" value={form.cover} onChange={onChange} />
      </div>

      <div>
        <label className="block text-sm mb-1">Summary</label>
        <textarea name="summary" rows="4" className="w-full rounded-md border px-3 py-2" value={form.summary} onChange={onChange} />
      </div>

      <label className="inline-flex items-center gap-2">
        <input type="checkbox" name="isMajor" checked={form.isMajor} onChange={onChange} />
        <span className="text-sm">Major Event</span>
      </label>

      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => history.back()}>Cancel</button>
      </div>
    </form>
  )
}
