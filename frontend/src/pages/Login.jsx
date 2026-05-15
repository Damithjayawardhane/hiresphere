import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signOut, useCognito, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (params.get('confirmed') === '1') {
      const em = params.get('email')
      if (em) setForm(f => ({ ...f, email: decodeURIComponent(em) }))
    }
  }, [params])

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800 }}>Welcome back</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Sign in to your HireSphere account</p>
        </div>

        {params.get('confirmed') === '1' && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--muted)' }}>
            Email verified. Sign in with your password to finish setup.
          </div>
        )}

        {!useCognito && (
          <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--accent)' }}>Demo accounts:</strong>
            <br />
            Candidate: candidate@hiresphere.com / password123
            <br />
            Interviewer: alice@hiresphere.com / password123
          </div>
        )}

        {useCognito && (
          <div style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--muted)' }}>
            Using <strong style={{ color: 'var(--accent)' }}>AWS Cognito</strong> (Amplify). Sign in with the account you created in the deployed user pool.
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && (
              <>
                <p className="error-msg">{error}</p>
                {error.includes('already a signed in user') && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: 8, justifyContent: 'center' }}
                    onClick={() => {
                      signOut()
                      setError('')
                    }}
                  >
                    Clear session and try again
                  </button>
                )}
              </>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
