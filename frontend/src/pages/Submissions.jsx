import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function Submissions() {
  const [items, setItems] = useState([])
  const [githubUrl, setGithubUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios
      .get('/submissions')
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData()
      if (githubUrl) fd.append('github_url', githubUrl)
      if (notes) fd.append('notes', notes)
      if (file) fd.append('file', file)
      const res = await axios.post('/submissions', fd)
      setItems(prev => [res.data, ...prev])
      setGithubUrl('')
      setNotes('')
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  return (
    <div className="page">
      <h1 className="page-title">Coding challenge submissions</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, maxWidth: 640 }}>
        Submit a solution via GitHub link and/or file upload (assignment: file upload or GitHub link).
      </p>

      <div className="card" style={{ maxWidth: 560, marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, marginBottom: 16 }}>New submission</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>GitHub repository or gist URL</label>
            <input placeholder="https://github.com/you/challenge-solution" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>File (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Language, approach, assumptions..." />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>

      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 12 }}>Your history</h2>
      {items.length === 0 && <p style={{ color: 'var(--muted)' }}>No submissions yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(s => (
          <div key={s.id} className="card">
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleString()}</div>
            {s.github_url && (
              <div style={{ marginTop: 6 }}>
                <a href={s.github_url} target="_blank" rel="noopener noreferrer">{s.github_url}</a>
              </div>
            )}
            {s.file_name && <div style={{ marginTop: 4 }}>File: {s.file_name}</div>}
            {s.notes && <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>{s.notes}</div>}
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24 }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
    </div>
  )
}
