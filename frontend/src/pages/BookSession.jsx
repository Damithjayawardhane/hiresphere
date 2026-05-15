import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const SESSION_TYPES = ['DSA', 'System Design', 'Frontend', 'Behavioural', 'Full Stack']

export default function BookSession() {
  const { interviewerId } = useParams()
  const navigate = useNavigate()
  const [interviewer, setInterviewer] = useState(null)
  const [form, setForm] = useState({ session_type: 'DSA', scheduled_at: '', duration_mins: 60, notes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdBooking, setCreatedBooking] = useState(null)
  const [cardNumber, setCardNumber] = useState('4242424242424242')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    axios.get(`/auth/users/${interviewerId}`).then((r) => setInterviewer(r.data)).catch(() => {})
  }, [interviewerId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const price = (interviewer?.rate || 60) * (form.duration_mins / 60)
      const res = await axios.post('/bookings', {
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
    if (!createdBooking) return
    setPayError('')
    setPaying(true)
    try {
      await axios.post(`/bookings/${createdBooking.id}/pay`, { card_number: cardNumber })
      navigate('/bookings')
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (!interviewer) return <div className="page" style={{ color: 'var(--muted)' }}>Loading...</div>

  const price = ((interviewer.rate || 60) * (form.duration_mins / 60)).toFixed(2)

  if (createdBooking) {
    return (
      <div className="page">
        <div style={{ maxWidth: 520 }}>
          <h1 className="page-title">Complete payment</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Your session is reserved. Pay securely to submit the request to the interviewer (simulated Stripe-style test
            card).
          </p>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600 }}>{interviewer.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
              {createdBooking.session_type} · {new Date(createdBooking.scheduled_at).toLocaleString()} ·{' '}
              {createdBooking.duration_mins} min
            </div>
            <div style={{ color: 'var(--success)', fontWeight: 700, marginTop: 12 }}>${Number(createdBooking.price).toFixed(2)}</div>
          </div>
          <div className="card">
            <div className="form-group">
              <label>Card number (demo)</label>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242424242424242"
                autoComplete="off"
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Success: <code>4242424242424242</code> · Declined: <code>4000000000000002</code>
              </div>
            </div>
            {payError && <p className="error-msg">{payError}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={handlePay} disabled={paying}>
                {paying ? 'Processing…' : 'Pay & confirm booking'}
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
      <div style={{ maxWidth: 520 }}>
        <h1 className="page-title">Book a Session</h1>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18 }}>{interviewer.name}</div>
          {interviewer.company && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 2 }}>{interviewer.company}</div>}
          {interviewer.skills && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{interviewer.skills}</div>}
          <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: 8 }}>${interviewer.rate}/hr</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Session Type</label>
              <select value={form.session_type} onChange={(e) => setForm((f) => ({ ...f, session_type: e.target.value }))}>
                {SESSION_TYPES.map((t) => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Duration</label>
              <select value={form.duration_mins} onChange={(e) => setForm((f) => ({ ...f, duration_mins: Number(e.target.value) }))}>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                placeholder="Topics you want to focus on..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>Total (after payment)</span>
              <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16 }}>${price}</span>
            </div>

            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Saving…' : 'Continue to payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
