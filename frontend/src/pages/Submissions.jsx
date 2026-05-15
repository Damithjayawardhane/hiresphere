import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Submissions() {
  const { user } = useAuth()
  const isInterviewer = user?.role === 'interviewer'
  const [items, setItems] = useState([])
  const [users, setUsers] = useState({})
  const [githubUrl, setGithubUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [annotateId, setAnnotateId] = useState(null)
  const [annotateText, setAnnotateText] = useState('')
  const [annotating, setAnnotating] = useState(false)

  useEffect(() => {
    const reqs = [api.get('/submissions')]
    if (isInterviewer) reqs.push(api.get('/auth/users').catch(() => ({ data: [] })))
    Promise.all(reqs)
      .then(([subRes, usersRes]) => {
        setItems(subRes.data)
        if (usersRes?.data) {
          const map = {}
          usersRes.data.forEach(u => {
            map[u.id] = u
          })
          setUsers(map)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isInterviewer])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData()
      if (githubUrl) fd.append('github_url', githubUrl)
      if (notes) fd.append('notes', notes)
      if (file) fd.append('file', file)
      const res = await api.post('/submissions', fd)
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

  async function saveAnnotation(id) {
    setAnnotating(true)
    setError('')
    try {
      const res = await api.patch(`/submissions/${id}/annotate`, { annotation: annotateText })
      setItems(prev => prev.map(s => (s.id === id ? res.data : s)))
      setAnnotateId(null)
      setAnnotateText('')
    } catch (err) {
      setError(err.response?.data?.error || 'Annotation failed')
    } finally {
      setAnnotating(false)
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  return (
    <div className="page">
      <h1 className="page-title">
        {isInterviewer ? 'Review submissions' : 'Coding challenge submissions'}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, maxWidth: 640 }}>
        {isInterviewer
          ? 'Review candidate solutions and add annotations (assignment requirement).'
          : 'Submit a solution via GitHub link and/or file upload.'}
      </p>

      {!isInterviewer && (
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
      )}

      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 12 }}>
        {isInterviewer ? 'All submissions' : 'Your history'}
      </h2>
      {items.length === 0 && <p style={{ color: 'var(--muted)' }}>No submissions yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(s => (
          <div key={s.id} className="card">
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleString()}</div>
            {isInterviewer && (
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Candidate: <strong>{users[s.candidate_id]?.name || s.candidate_id}</strong>
              </div>
            )}
            {s.github_url && (
              <div style={{ marginTop: 6 }}>
                <a href={s.github_url} target="_blank" rel="noopener noreferrer">{s.github_url}</a>
              </div>
            )}
            {s.file_name && <div style={{ marginTop: 4 }}>File: {s.file_name}</div>}
            {s.notes && <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>{s.notes}</div>}
            {s.annotation && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'rgba(34,197,94,0.08)',
                  borderRadius: 8,
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>Interviewer annotation</div>
                <div style={{ fontSize: 14 }}>{s.annotation}</div>
                {s.annotated_at && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{new Date(s.annotated_at).toLocaleString()}</div>
                )}
              </div>
            )}
            {isInterviewer && (
              <div style={{ marginTop: 12 }}>
                {annotateId === s.id ? (
                  <>
                    <textarea
                      rows={3}
                      value={annotateText}
                      onChange={e => setAnnotateText(e.target.value)}
                      placeholder="Feedback on approach, correctness, style..."
                      style={{ width: '100%', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} disabled={annotating} onClick={() => saveAnnotation(s.id)}>
                        {annotating ? 'Saving…' : 'Save annotation'}
                      </button>
                      <button type="button" className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setAnnotateId(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => { setAnnotateId(s.id); setAnnotateText(s.annotation || '') }}>
                    {s.annotation ? 'Edit annotation' : 'Add annotation'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && isInterviewer && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}

      <p style={{ marginTop: 24 }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
    </div>
  )
}
