import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Messages() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [withId, setWithId] = useState('')
  const [thread, setThread] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const role = user?.role === 'candidate' ? 'interviewer' : 'candidate'
    api
      .get(`/auth/users?role=${role}`)
      .then(r => setContacts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.role])

  useEffect(() => {
    if (!withId) {
      setThread([])
      return
    }
    api.get(`/messages?with=${encodeURIComponent(withId)}`).then(r => setThread(r.data)).catch(() => setThread([]))
  }, [withId])

  async function send(e) {
    e.preventDefault()
    if (!withId || !body.trim()) return
    const res = await api.post('/messages', { to_id: withId, body })
    setThread(prev => [...prev, res.data])
    setBody('')
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  const peerLabel = user?.role === 'candidate' ? 'Interviewer' : 'Candidate'

  return (
    <div className="page">
      <h1 className="page-title">Messages</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, maxWidth: 640 }}>
        Direct messages with a {peerLabel.toLowerCase()} you are connected with (assignment: messaging service).
      </p>

      <div className="form-group" style={{ maxWidth: 400 }}>
        <label>Conversation with</label>
        <select value={withId} onChange={e => setWithId(e.target.value)}>
          <option value="">Select {peerLabel.toLowerCase()}…</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.company ? `(${c.company})` : ''}
            </option>
          ))}
        </select>
      </div>

      {withId && (
        <div className="card" style={{ maxWidth: 640, marginTop: 20, minHeight: 200 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {thread.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No messages yet. Say hello below.</p>}
            {thread.map(m => {
              const mine = m.from_id === user?.id
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: mine ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 14,
                  }}
                >
                  {m.body}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
          <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} placeholder="Type a message…" value={body} onChange={e => setBody(e.target.value)} />
            <button type="submit" className="btn btn-primary">
              Send
            </button>
          </form>
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
    </div>
  )
}
