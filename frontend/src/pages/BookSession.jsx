import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, parseInterviewTypes } from '../api'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'

export default function BookSession() {
  const { interviewerId } = useParams()
  const navigate = useNavigate()
  const [interviewer, setInterviewer] = useState(null)
  const [sessionTypes, setSessionTypes] = useState([])
  const [form, setForm] = useState({ session_type: '', scheduled_at: '', duration_mins: 60, notes: '' })
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdBooking, setCreatedBooking] = useState(null)
  const [cardNumber, setCardNumber] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    api
      .get(`/auth/users/${interviewerId}`)
      .then(r => {
        setInterviewer(r.data)
        const types = parseInterviewTypes(r.data.interview_types)
        setSessionTypes(types.length ? types : ['General'])
        setForm(f => ({ ...f, session_type: types[0] || 'General' }))
      })
      .catch(() => setLoadError('Interviewer not found in database.'))
  }, [interviewerId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const price = (interviewer?.rate || 60) * (form.duration_mins / 60)
      const res = await api.post('/bookings', {
        ...form,
        interviewer_id: interviewerId,
        price,
      })
      setCreatedBooking(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    if (!createdBooking || !cardNumber.trim()) {
      setPayError('Enter a card number')
      return
    }
    setPayError('')
    setPaying(true)
    try {
      await api.post(`/bookings/${createdBooking.id}/pay`, { card_number: cardNumber })
      navigate('/bookings')
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="alert alert-error">{loadError}</div>
      </div>
    )
  }

  if (!interviewer) {
    return (
      <div className="page">
        <Loading label="Loading interviewer profile…" />
      </div>
    )
  }

  const price = ((interviewer.rate || 60) * (form.duration_mins / 60)).toFixed(2)

  if (createdBooking) {
    return (
      <div className="page">
        <PageHeader title="Complete payment" subtitle="Pay to confirm your session request with the interviewer." />
        <div style={{ maxWidth: 520 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600 }}>{interviewer.name}</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
              {createdBooking.session_type} · {new Date(createdBooking.scheduled_at).toLocaleString()} ·{' '}
              {createdBooking.duration_mins} min
            </p>
            <p style={{ color: 'var(--success)', fontWeight: 700, marginTop: 12 }}>${Number(createdBooking.price).toFixed(2)}</p>
          </div>
          <div className="card">
            <div className="form-group">
              <label>Card number</label>
              <input
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                placeholder="Enter test card number"
                autoComplete="off"
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Test success: 4242424242424242 · Decline: 4000000000000002
              </p>
            </div>
            {payError && <p className="error-msg">{payError}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={handlePay} disabled={paying}>
                {paying ? 'Processing…' : 'Pay & confirm'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/bookings')}>
                Pay later
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title="Book a session" subtitle={`Schedule with ${interviewer.name}`} />
      <div style={{ maxWidth: 520 }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18 }}>{interviewer.name}</div>
          {interviewer.company && <p className="interviewer-company">{interviewer.company}</p>}
          {interviewer.skills && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{interviewer.skills}</p>}
          {interviewer.rate != null && (
            <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: 8 }}>${interviewer.rate}/hr</p>
          )}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Session type</label>
              <select
                value={form.session_type}
                onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}
                required
              >
                {sessionTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date & time</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Duration</label>
              <select
                value={form.duration_mins}
                onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                placeholder="Topics you want to focus on…"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>Estimated total</span>
              <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>${price}</span>
            </div>

            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Saving…' : 'Continue to payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
