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
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-hero">
          <h1>Welcome back</h1>
          <p>Sign in to HireSphere</p>
        </div>

        {params.get('confirmed') === '1' && (
          <div className="alert alert-success">Email verified. Sign in to continue.</div>
        )}

        {useCognito && (
          <div className="alert alert-info">
            Secured with <strong>AWS Cognito</strong>. Use the account from your deployed user pool.
          </div>
        )}

        <div className="card card-glass">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <>
                <p className="error-msg">{error}</p>
                {error.includes('already a signed in user') && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%', marginBottom: 8 }}
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
