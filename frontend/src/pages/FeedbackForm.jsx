import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

function ScoreSlider({ label, value, onChange }) {
  const color = value >= 8 ? 'var(--success)' : value >= 5 ? 'var(--warning)' : 'var(--accent2)'
  return (
    <div className="form-group">
      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}/10</span>
      </label>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ background: 'transparent', border: 'none', padding: 0, accentColor: color }} />
    </div>
  )
}

export default function FeedbackForm() {
  const { bookingId, candidateId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    technical_score: 7, communication_score: 7, problem_solving: 7, overall_score: 7,
    strengths: '', improvements: '', recommendation: 'Maybe', notes: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post('/feedback', { ...form, booking_id: bookingId, candidate_id: candidateId })
      navigate('/bookings')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const recColors = { 'Hire': 'var(--success)', 'Maybe': 'var(--warning)', 'No Hire': 'var(--accent2)' }

  return (
    <div className="page">
      <div style={{ maxWidth: 560 }}>
        <h1 className="page-title">Submit Feedback</h1>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Performance Scores</h3>

            <ScoreSlider label="Technical Skills" value={form.technical_score} onChange={v => setForm(f => ({...f, technical_score: v}))} />
            <ScoreSlider label="Communication" value={form.communication_score} onChange={v => setForm(f => ({...f, communication_score: v}))} />
            <ScoreSlider label="Problem Solving" value={form.problem_solving} onChange={v => setForm(f => ({...f, problem_solving: v}))} />
            <ScoreSlider label="Overall" value={form.overall_score} onChange={v => setForm(f => ({...f, overall_score: v}))} />

            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />
            <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Recommendation</h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {['Hire', 'Maybe', 'No Hire'].map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({...f, recommendation: r}))}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: 14,
                    background: form.recommendation === r ? recColors[r] : 'var(--surface2)',
                    color: form.recommendation === r ? '#fff' : 'var(--muted)',
                    border: `1px solid ${form.recommendation === r ? recColors[r] : 'var(--border)'}`,
                    cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Strengths</label>
              <textarea rows={2} placeholder="What did the candidate do well?" value={form.strengths}
                onChange={e => setForm(f => ({...f, strengths: e.target.value}))} style={{resize:'vertical'}} />
            </div>
            <div className="form-group">
              <label>Areas for Improvement</label>
              <textarea rows={2} placeholder="What should they work on?" value={form.improvements}
                onChange={e => setForm(f => ({...f, improvements: e.target.value}))} style={{resize:'vertical'}} />
            </div>
            <div className="form-group">
              <label>Detailed Notes</label>
              <textarea rows={3} placeholder="Any additional observations..." value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} style={{resize:'vertical'}} />
            </div>

            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
