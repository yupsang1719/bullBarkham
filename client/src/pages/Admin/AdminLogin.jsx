import { useState } from 'react'
import { adminApi, setToken } from '../../lib/admin'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const { token } = await adminApi.login(email, password)
      setToken(token)
      nav('/admin/events')
    } catch (e) { setErr(e.message) }
  }

  return (
    <form onSubmit={submit} className="card p-6 max-w-md">
      <h2 className="text-xl font-medium mb-3">Admin Login</h2>
      {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
      <label className="block text-sm mb-1">Email</label>
      <input className="w-full rounded-md border px-3 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
      <label className="block text-sm mb-1">Password</label>
      <input type="password" className="w-full rounded-md border px-3 py-2 mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn btn-primary w-full">Login</button>
    </form>
  )
}
