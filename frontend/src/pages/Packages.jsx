import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'

export default function Packages() {
  const { user } = useAuth()
  const isInterviewer = user?.role === 'interviewer'
  const [packages, setPackages] = useState([])
  const [interviewers, setInterviewers] = useState({})
  const [form, setForm] = useState({ title: '', description: '', session_count: 1, price: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const reqs = [
      api.get('/packages', {
        params: isInterviewer ? { interviewer_id: user.id } : {},
      }),
    ]
    if (!isInterviewer) {
      reqs.push(
        api.get('/auth/users', { params: { role: 'interviewer' } }).catch(() => ({ data: [] }))
      )
    }
    Promise.all(reqs)
      .then(([pkgRes, usersRes]) => {
        setPackages(pkgRes.data || [])
        if (usersRes?.data) {
          const map = {}
          usersRes.data.forEach(u => {
            map[u.id] = u
          })
          setInterviewers(map)
        }
      })
      .catch(() => setError('Could not load packages from database.'))
      .finally(() => setLoading(false))
  }, [user, isInterviewer])

  async function createPackage(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await api.post('/packages', form)
      setPackages(prev => [res.data, ...prev])
      setForm({ title: '', description: '', session_count: 1, price: 0 })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create package')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading packages…" />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Interview packages"
        subtitle={
          isInterviewer
            ? 'Create bundled session offers — saved in the booking service database.'
            : 'Browse packages published by interviewers.'
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {isInterviewer && (
        <div className="card" style={{ maxWidth: 540, marginBottom: 32 }}>
          <h2 className="section-title">Create package</h2>
          <form onSubmit={createPackage}>
            <div className="form-group">
              <label>Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. FAANG prep bundle"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is included in this bundle?"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Number of sessions</label>
                <input
                  type="number"
                  min={1}
                  value={form.session_count}
                  onChange={e => setForm(f => ({ ...f, session_count: +e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Bundle price ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Publishing…' : 'Publish package'}
            </button>
          </form>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="card empty-state">
          <p>No packages published yet.</p>
        </div>
      ) : (
        <div className="grid-2">
          {packages.map(p => {
            const iv = interviewers[p.interviewer_id]
            const perSession = p.session_count > 0 ? (p.price / p.session_count).toFixed(0) : p.price
            return (
              <article key={p.id} className="card card-interactive package-card">
                <h3 className="package-card-title">{p.title}</h3>
                <p className="package-price">${Number(p.price).toFixed(2)}</p>
                <p className="package-meta">
                  {p.session_count} session{p.session_count !== 1 ? 's' : ''}
                  {perSession > 0 && ` · ~$${perSession}/session`}
                </p>
                {!isInterviewer && iv && (
                  <p className="package-meta">
                    By <strong style={{ color: 'var(--text)' }}>{iv.name}</strong>
                    {iv.company ? ` · ${iv.company}` : ''}
                  </p>
                )}
                {p.description && <p className="package-desc">{p.description}</p>}
                <p className="package-meta" style={{ marginTop: 'auto' }}>
                  Listed {new Date(p.created_at).toLocaleDateString()}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
