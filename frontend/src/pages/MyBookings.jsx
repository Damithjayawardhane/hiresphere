import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, fetchFeedbackForBooking } from '../api'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'

export default function MyBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState({})
  const [feedbackByBooking, setFeedbackByBooking] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payId, setPayId] = useState(null)
  const [cardNumber, setCardNumber] = useState('')
  const [payError, setPayError] = useState('')
  const [paying, setPaying] = useState(false)
  const [recordingId, setRecordingId] = useState(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingSaving, setRecordingSaving] = useState(false)

  async function load() {
    setError('')
    try {
      const [bRes, uRes] = await Promise.all([api.get('/bookings'), api.get('/auth/users')])
      const list = bRes.data || []
      setBookings(list)
      const map = {}
      ;(uRes.data || []).forEach(u => {
        map[u.id] = u
      })
      setUsers(map)

      const completed = list.filter(b => b.status === 'completed')
      const fbEntries = await Promise.all(
        completed.map(async b => [b.id, await fetchFeedbackForBooking(b.id)])
      )
      setFeedbackByBooking(Object.fromEntries(fbEntries.filter(([, fb]) => fb)))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStatus(id, status) {
    try {
      const res = await api.patch(`/bookings/${id}/status`, { status })
      setBookings(prev => prev.map(b => (b.id === id ? res.data : b)))
    } catch {}
  }

  async function saveRecording(id) {
    setRecordingSaving(true)
    try {
      const res = await api.patch(`/bookings/${id}/recording`, { recording_url: recordingUrl })
      setBookings(prev => prev.map(b => (b.id === id ? res.data : b)))
      setRecordingId(null)
      setRecordingUrl('')
    } catch {}
    finally {
      setRecordingSaving(false)
    }
  }

  async function payBooking(id) {
    if (!cardNumber.trim()) {
      setPayError('Enter a card number')
      return
    }
    setPayError('')
    setPaying(true)
    try {
      const res = await api.post(`/bookings/${id}/pay`, { card_number: cardNumber })
      setBookings(prev => prev.map(b => (b.id === id ? res.data.booking : b)))
      setPayId(null)
      setCardNumber('')
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading bookings from database…" />
      </div>
    )
  }

  const upcoming = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled')
  const history = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')

  function renderBooking(b, historySection = false) {
    const otherId = user.role === 'candidate' ? b.interviewer_id : b.candidate_id
    const other = users[otherId]
    const scheduled = new Date(b.scheduled_at)
    const fb = feedbackByBooking[b.id]

    return (
      <article key={b.id} className={`card booking-row${historySection ? '' : ''}`} style={historySection ? { opacity: 0.92 } : undefined}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>{b.session_type}</span>
            <span className={`badge badge-${b.status.replace(/_/g, '-')}`}>{b.status.replace(/_/g, ' ')}</span>
            {b.payment_status === 'paid' && <span className="badge badge-confirmed">paid</span>}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {user.role === 'candidate' ? 'With' : 'Candidate'}:{' '}
            <strong style={{ color: 'var(--text)' }}>{other?.name || otherId}</strong>
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {scheduled.toLocaleString()} · {b.duration_mins} min · <span style={{ color: 'var(--success)' }}>${b.price}</span>
          </p>
          {b.notes && (
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>&quot;{b.notes}&quot;</p>
          )}
          {b.recording_url && (
            <p style={{ marginTop: 8, fontSize: 13 }}>
              <a href={b.recording_url} target="_blank" rel="noopener noreferrer">Session recording</a>
            </p>
          )}
          {fb && user.role === 'candidate' && (
            <div className="card" style={{ marginTop: 12, padding: 14, background: 'var(--surface2)' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Interviewer feedback</p>
              <p style={{ fontWeight: 600 }}>
                {fb.recommendation} · Coding {fb.coding_score}/10 · Communication {fb.communication_score}/10
              </p>
              {fb.strengths && <p style={{ fontSize: 13, marginTop: 6 }}>{fb.strengths}</p>}
            </div>
          )}
        </div>

        <div className="booking-actions">
          {user.role === 'candidate' && b.status === 'awaiting_payment' && (
            payId === b.id ? (
              <div style={{ minWidth: 220 }}>
                <input
                  style={{ marginBottom: 8 }}
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="Card number"
                />
                {payError && <p className="error-msg" style={{ fontSize: 12 }}>{payError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={paying} onClick={() => payBooking(b.id)}>
                    {paying ? '…' : 'Pay now'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setPayId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPayId(b.id)}>
                Pay session
              </button>
            )
          )}
          {user.role === 'interviewer' && b.status === 'pending' && (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(b.id, 'confirmed')}>
                Confirm
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => updateStatus(b.id, 'cancelled')}>
                Decline
              </button>
            </>
          )}
          {user.role === 'interviewer' && b.status === 'confirmed' && (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/session/${b.id}`)}>
                Start session
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => updateStatus(b.id, 'completed')}>
                Mark complete
              </button>
            </>
          )}
          {user.role === 'interviewer' && b.status === 'completed' && (
            <>
              <Link to={`/feedback/${b.id}/${b.candidate_id}`}>
                <button type="button" className="btn btn-outline btn-sm">Give feedback</button>
              </Link>
              {recordingId === b.id ? (
                <div style={{ minWidth: 220 }}>
                  <input
                    style={{ marginBottom: 8 }}
                    value={recordingUrl}
                    onChange={e => setRecordingUrl(e.target.value)}
                    placeholder="Recording URL"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-primary btn-sm" disabled={recordingSaving} onClick={() => saveRecording(b.id)}>
                      Save
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setRecordingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setRecordingId(b.id)
                    setRecordingUrl(b.recording_url || '')
                  }}
                >
                  {b.recording_url ? 'Update recording' : 'Add recording'}
                </button>
              )}
            </>
          )}
          {user.role === 'candidate' && b.status === 'confirmed' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/session/${b.id}`)}>
              Join session
            </button>
          )}
          {(b.status === 'pending' || b.status === 'awaiting_payment') && user.role === 'candidate' && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => updateStatus(b.id, 'cancelled')}>
              Cancel
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title={user.role === 'candidate' ? 'My sessions' : 'Candidate bookings'}
        subtitle="All bookings loaded from the booking service database."
      />

      {error && <div className="alert alert-error">{error}</div>}

      {bookings.length === 0 && (
        <div className="card empty-state">
          <p>No bookings yet.</p>
          {user.role === 'candidate' && (
            <Link to="/interviewers">
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }}>
                Find an interviewer
              </button>
            </Link>
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {upcoming.map(b => renderBooking(b))}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(b => renderBooking(b, true))}
          </div>
        </section>
      )}
    </div>
  )
}
