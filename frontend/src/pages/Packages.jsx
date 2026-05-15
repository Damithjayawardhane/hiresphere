import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Packages() {
  const { user } = useAuth()
  const [packages, setPackages] = useState([])
  const [form, setForm] = useState({ title: '', description: '', session_count: 3, price: 150 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/packages', { params: user?.role === 'interviewer' ? { interviewer_id: user.id } : {} })
      .then(r => setPackages(r.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user])

  async function createPackage(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/packages', form)
      setPackages(prev => [res.data, ...prev])
      setForm({ title: '', description: '', session_count: 3, price: 150 })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create package')
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  return (
    <div className="page">
      <h1 className="page-title">Interview packages</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, maxWidth: 720 }}>
        Bundled mock interview packages (assignment: interviewer capability).
      </p>

      {user?.role === 'interviewer' && (
        <div className="card" style={{ maxWidth: 520, marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, marginBottom: 12 }}>Create package</h2>
          <form onSubmit={createPackage}>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Sessions</label>
                <input type="number" min={1} value={form.session_count} onChange={e => setForm(f => ({ ...f, session_count: +e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Bundle price ($)</label>
                <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary">Publish package</button>
          </form>
        </div>
      )}

      <div className="grid-2">
        {packages.map(p => (
          <div key={p.id} className="card">
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17 }}>{p.title}</div>
            <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: 8 }}>
              ${p.price} · {p.session_count} sessions
            </div>
            {p.description && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>{p.description}</p>}
          </div>
        ))}
      </div>
      {packages.length === 0 && <p style={{ color: 'var(--muted)' }}>No packages yet.</p>}

      <p style={{ marginTop: 24 }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
    </div>
  )
}
