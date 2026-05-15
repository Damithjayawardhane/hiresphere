import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function MyBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [payId, setPayId] = useState(null)
  const [cardNumber, setCardNumber] = useState('4242424242424242')
  const [payError, setPayError] = useState('')
  const [paying, setPaying] = useState(false)
  const [recordingId, setRecordingId] = useState(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingSaving, setRecordingSaving] = useState(false)

  function load() {
    Promise.all([api.get('/bookings'), api.get('/auth/users')])
      .then(([bRes, uRes]) => {
        setBookings(bRes.data)
        const map = {}
        uRes.data.forEach((u) => {
          map[u.id] = u
        })
        setUsers(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStatus(id, status) {
    try {
      const res = await api.patch(`/bookings/${id}/status`, { status })
      setBookings((prev) => prev.map((b) => (b.id === id ? res.data : b)))
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
    setPayError('')
    setPaying(true)
    try {
      const res = await api.post(`/bookings/${id}/pay`, { card_number: cardNumber })
      setBookings((prev) => prev.map((b) => (b.id === id ? res.data.booking : b)))
      setPayId(null)
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  const upcoming = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled')
  const history = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled')

  return (
    <div className="page">
      <h1 className="page-title">{user.role === 'candidate' ? 'My Sessions' : 'Candidate Bookings'}</h1>

      {bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>No bookings yet.</p>
          {user.role === 'candidate' && (
            <Link to="/interviewers">
              <button className="btn btn-primary" style={{ marginTop: 16 }}>
                Find an Interviewer
              </button>
            </Link>
          )}
        </div>
      )}

      {user.role === 'candidate' && upcoming.some((b) => b.status === 'awaiting_payment') && (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          Complete payment for sessions in <strong>awaiting payment</strong> so your interviewer can see the request.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {upcoming.map((b) => {
          const otherId = user.role === 'candidate' ? b.interviewer_id : b.candidate_id
          const other = users[otherId]
          const scheduled = new Date(b.scheduled_at)

          return (
            <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>{b.session_type} Interview</span>
                  <span className={`badge badge-${b.status.replace(/_/g, '-')}`}>{b.status.replace(/_/g, ' ')}</span>
                  {b.payment_status === 'paid' && <span className="badge badge-confirmed">paid</span>}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {user.role === 'candidate' ? 'With' : 'Candidate'}: <strong style={{ color: 'var(--text)' }}>{other?.name || otherId}</strong>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                  {scheduled.toLocaleString()} · {b.duration_mins} min · <span style={{ color: 'var(--success)' }}>${b.price}</span>
                </div>
                {b.payment_reference && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Payment ref: {b.payment_reference}</div>
                )}
                {user.role === 'interviewer' && b.status === 'awaiting_payment' && (
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Waiting for candidate to complete payment.</div>
                )}
                {b.notes && (
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>&quot;{b.notes}&quot;</div>
                )}
                {b.recording_url && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <strong>Recording:</strong>{' '}
                    <a href={b.recording_url} target="_blank" rel="noopener noreferrer">
                      View session recording
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexDirection: 'column', alignItems: 'stretch' }}>
                {user.role === 'candidate' && b.status === 'awaiting_payment' && (
                  <>
                    {payId === b.id ? (
                      <div style={{ minWidth: 220 }}>
                        <input
                          style={{ marginBottom: 8, width: '100%' }}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Card number"
                        />
                        {payError && <p className="error-msg" style={{ fontSize: 12 }}>{payError}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} disabled={paying} onClick={() => payBooking(b.id)}>
                            {paying ? '…' : 'Pay now'}
                          </button>
                          <button type="button" className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setPayId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setPayId(b.id)}>
                        Pay session
                      </button>
                    )}
                  </>
                )}
                {user.role === 'interviewer' && b.status === 'pending' && (
                  <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(b.id, 'confirmed')}>
                    Confirm
                  </button>
                )}
                {user.role === 'interviewer' && b.status === 'confirmed' && (
                  <>
                    <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => navigate(`/session/${b.id}`)}>
                      Start Session
                    </button>
                    <button type="button" className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(b.id, 'completed')}>
                      Mark Complete
                    </button>
                  </>
                )}
                {user.role === 'interviewer' && b.status === 'completed' && (
                  <>
                    <Link to={`/feedback/${b.id}/${b.candidate_id}`}>
                      <button type="button" className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }}>
                        Give Feedback
                      </button>
                    </Link>
                    {recordingId === b.id ? (
                      <div style={{ minWidth: 220 }}>
                        <input
                          style={{ marginBottom: 8, width: '100%' }}
                          value={recordingUrl}
                          onChange={e => setRecordingUrl(e.target.value)}
                          placeholder="https://example.com/recording.mp4"
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} disabled={recordingSaving} onClick={() => saveRecording(b.id)}>
                            {recordingSaving ? '…' : 'Save'}
                          </button>
                          <button type="button" className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setRecordingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 13, padding: '7px 14px' }}
                        onClick={() => {
                          setRecordingId(b.id)
                          setRecordingUrl(b.recording_url || '')
                        }}
                      >
                        {b.recording_url ? 'Update recording' : 'Add recording URL'}
                      </button>
                    )}
                  </>
                )}
                {user.role === 'candidate' && b.status === 'confirmed' && (
                  <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => navigate(`/session/${b.id}`)}>
                    Join Session
                  </button>
                )}
                {(b.status === 'pending' || b.status === 'awaiting_payment') && user.role === 'candidate' && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: 13, padding: '7px 14px', color: 'var(--accent2)', borderColor: 'var(--accent2)' }}
                    onClick={() => updateStatus(b.id, 'cancelled')}
                  >
                    Cancel
                  </button>
                )}
                {user.role === 'interviewer' && b.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: 13, padding: '7px 14px', color: 'var(--accent2)', borderColor: 'var(--accent2)' }}
                    onClick={() => updateStatus(b.id, 'cancelled')}
                  >
                    Decline
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {history.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, marginTop: 40, marginBottom: 12 }}>Interview history</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Past and cancelled sessions (assignment: interview history).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((b) => {
              const otherId = user.role === 'candidate' ? b.interviewer_id : b.candidate_id
              const other = users[otherId]
              return (
                <div key={`h-${b.id}`} className="card" style={{ opacity: 0.92 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{b.session_type}</span>
                      <span className={`badge badge-${b.status}`} style={{ marginLeft: 8 }}>
                        {b.status}
                      </span>
                      <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                        {user.role === 'candidate' ? 'With' : 'Candidate'}: {other?.name || otherId}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{new Date(b.scheduled_at).toLocaleString()}</div>
                      {b.recording_url && (
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                          <a href={b.recording_url} target="_blank" rel="noopener noreferrer">
                            Session recording
                          </a>
                        </div>
                      )}
                    </div>
                    {user.role === 'candidate' && b.status === 'completed' && (
                      <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 220, textAlign: 'right' }}>
                        Evaluation reports are shared by your interviewer after feedback is submitted.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
