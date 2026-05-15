import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ConfirmSignUp() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { confirmCognitoSignUp, useCognito } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!useCognito) navigate('/register', { replace: true })
  }, [useCognito, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmCognitoSignUp(email, code)
      navigate(`/login?confirmed=1&email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Confirm your email</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
          Enter the verification code sent to <strong>{email || 'your email'}</strong>.
        </p>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Verification code</label>
              <input value={code} onChange={e => setCode(e.target.value)} required placeholder="123456" />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading || !email}>
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
