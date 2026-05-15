import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'

export default function Messages() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [withId, setWithId] = useState('')
  const [thread, setThread] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const role = user?.role === 'candidate' ? 'interviewer' : 'candidate'
    api
      .get(`/auth/users?role=${role}`)
      .then(r => setContacts(r.data || []))
      .catch(() => setError('Could not load contacts from database.'))
      .finally(() => setLoading(false))
  }, [user?.role])

  useEffect(() => {
    if (!withId) {
      setThread([])
      return
    }
    api
      .get(`/messages?with=${encodeURIComponent(withId)}`)
      .then(r => setThread(r.data || []))
      .catch(() => setThread([]))
  }, [withId])

  async function send(e) {
    e.preventDefault()
    if (!withId || !body.trim()) return
    const res = await api.post('/messages', { to_id: withId, body })
    setThread(prev => [...prev, res.data])
    setBody('')
  }

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading contacts…" />
      </div>
    )
  }

  const peerLabel = user?.role === 'candidate' ? 'Interviewer' : 'Candidate'
  const activeContact = contacts.find(c => c.id === withId)

  return (
    <div className="page">
      <PageHeader
        title="Messages"
        subtitle={`Direct messages with ${peerLabel.toLowerCase()}s from your account.`}
      />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="messages-layout">
        <aside className="card">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{peerLabel}</label>
            <select value={withId} onChange={e => setWithId(e.target.value)}>
              <option value="">Select…</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `· ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
          {contacts.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>No {peerLabel.toLowerCase()}s in database yet.</p>
          )}
        </aside>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}>
          {withId ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>
                {activeContact?.name || withId}
              </p>
              <div className="message-thread">
                {thread.length === 0 && (
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>No messages yet. Start the conversation.</p>
                )}
                {thread.map(m => {
                  const mine = m.from_id === user?.id
                  return (
                    <div key={m.id} className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                      {m.body}
                      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <input style={{ flex: 1 }} placeholder="Type a message…" value={body} onChange={e => setBody(e.target.value)} />
                <button type="submit" className="btn btn-primary">Send</button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>Select a {peerLabel.toLowerCase()} to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
