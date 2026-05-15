import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'

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
        setItems(subRes.data || [])
        if (usersRes?.data) {
          const map = {}
          usersRes.data.forEach(u => {
            map[u.id] = u
          })
          setUsers(map)
        }
      })
      .catch(() => setError('Could not load submissions from database.'))
      .finally(() => setLoading(false))
  }, [isInterviewer])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!githubUrl && !file) {
      setError('Add a GitHub URL or upload a file.')
      return
    }
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

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading submissions…" />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title={isInterviewer ? 'Review submissions' : 'Coding submissions'}
        subtitle={
          isInterviewer
            ? 'Review candidate solutions and add annotations — stored in the interview service database.'
            : 'Submit solutions via GitHub or file upload for your interviewer to review.'
        }
      />

      {error && !annotateId && <div className="alert alert-error">{error}</div>}

      {!isInterviewer && (
        <div className="card" style={{ maxWidth: 580, marginBottom: 32 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>New submission</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>GitHub repository or gist URL</label>
              <input
                placeholder="https://github.com/you/solution"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>File upload</label>
              <div className="upload-zone">
                {file ? (
                  <span>Selected: <strong>{file.name}</strong></span>
                ) : (
                  <span>Choose a .zip, .py, .js, or other solution file</span>
                )}
              </div>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Language, approach, time complexity…"
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit to database'}
            </button>
          </form>
        </div>
      )}

      <h2 className="section-title">{isInterviewer ? 'All candidate submissions' : 'Your submission history'}</h2>

      {items.length === 0 ? (
        <div className="card empty-state">
          <p>No submissions yet.</p>
        </div>
      ) : (
        <div className="submission-list">
          {items.map(s => (
            <article key={s.id} className="card submission-card">
              <p className="submission-meta">{new Date(s.created_at).toLocaleString()}</p>
              {isInterviewer && (
                <p style={{ fontSize: 14, marginBottom: 8 }}>
                  Candidate: <strong>{users[s.candidate_id]?.name || s.candidate_id}</strong>
                </p>
              )}
              {s.github_url && (
                <a className="submission-link" href={s.github_url} target="_blank" rel="noopener noreferrer">
                  {s.github_url}
                </a>
              )}
              {s.file_name && (
                <p style={{ marginTop: 8, fontSize: 14 }}>
                  <span className="badge badge-confirmed">file</span> {s.file_name}
                </p>
              )}
              {s.notes && <p className="submission-notes">{s.notes}</p>}

              {s.annotation && (
                <div className="annotation-box">
                  <div className="annotation-box-label">Interviewer feedback</div>
                  <p style={{ fontSize: 14, lineHeight: 1.5 }}>{s.annotation}</p>
                  {s.annotated_at && (
                    <p className="submission-meta" style={{ marginTop: 8, marginBottom: 0 }}>
                      {new Date(s.annotated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {isInterviewer && (
                <div style={{ marginTop: 16 }}>
                  {annotateId === s.id ? (
                    <>
                      <textarea
                        rows={4}
                        value={annotateText}
                        onChange={e => setAnnotateText(e.target.value)}
                        placeholder="Feedback on approach, correctness, style…"
                        style={{ marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={annotating}
                          onClick={() => saveAnnotation(s.id)}
                        >
                          {annotating ? 'Saving…' : 'Save annotation'}
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setAnnotateId(null)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setAnnotateId(s.id)
                        setAnnotateText(s.annotation || '')
                      }}
                    >
                      {s.annotation ? 'Edit annotation' : 'Add annotation'}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
