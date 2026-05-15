import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp, useCognito } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate',
    bio: '',
    company: '',
    skills: '',
    rate: 60,
    domain: '',
    interview_types: '',
    experience_level: '',
    availability: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const extra = {
        bio: form.bio,
        company: form.company,
        skills: form.skills,
        rate: form.rate,
        domain: form.domain,
        interview_types: form.interview_types,
        experience_level: form.experience_level,
        availability: form.availability,
      }
      const result = await signUp(form.name, form.email, form.password, form.role, extra)
      if (result.needsConfirm && result.email) {
        navigate(`/confirm-signup?email=${encodeURIComponent(result.email)}`)
        return
      }
      if (!result.user && !result.token) {
        setError(useCognito ? 'Could not complete registration. Try again or use email confirmation.' : 'Registration failed')
        return
      }
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800 }}>Create account</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Join HireSphere as a candidate or interviewer</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Jane Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div className="form-group">
              <label>I am a...</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="candidate">Candidate (seeking interview practice)</option>
                <option value="interviewer">Interviewer (conducting mock interviews)</option>
              </select>
            </div>
            {form.role === 'interviewer' && (
              <>
                <div className="form-group">
                  <label>Primary domain</label>
                  <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="DevOps">DevOps</option>
                    <option value="AI/ML">AI/ML</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Interview types offered</label>
                  <input
                    placeholder="e.g. DSA, System Design, Behavioral"
                    value={form.interview_types}
                    onChange={e => setForm(f => ({ ...f, interview_types: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Experience level</label>
                  <select value={form.experience_level} onChange={e => setForm(f => ({ ...f, experience_level: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="Senior">Senior</option>
                    <option value="Staff">Staff</option>
                    <option value="Principal">Principal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Availability</label>
                  <input
                    placeholder="e.g. Weekday evenings UTC"
                    value={form.availability}
                    onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input placeholder="e.g. Google, Meta, Amazon" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Skills / Specialization</label>
                  <input placeholder="e.g. DSA, System Design, React" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Hourly Rate (USD)</label>
                  <input type="number" min={0} value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Bio</label>
              <textarea placeholder="Tell us about yourself..." rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
