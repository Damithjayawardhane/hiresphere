import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname.startsWith(path)
    ? { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' }
    : {}

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: 60,
      gap: 32,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/" style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.5px', textDecoration: 'none' }}>
        Hire<span style={{ color: 'var(--accent2)' }}>Sphere</span>
      </Link>

      {user && (
        <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
          <Link to="/dashboard" style={{ padding: '18px 12px', fontSize: 14, color: 'var(--text)', textDecoration: 'none', ...isActive('/dashboard') }}>Dashboard</Link>
          {user.role === 'candidate' && (
            <Link to="/interviewers" style={{ padding: '18px 12px', fontSize: 14, color: 'var(--text)', textDecoration: 'none', ...isActive('/interviewers') }}>Find Interviewers</Link>
          )}
          <Link to="/bookings" style={{ padding: '18px 12px', fontSize: 14, color: 'var(--text)', textDecoration: 'none', ...isActive('/bookings') }}>
            {user.role === 'candidate' ? 'My Sessions' : 'Bookings'}
          </Link>
          <Link to="/messages" style={{ padding: '18px 12px', fontSize: 14, color: 'var(--text)', textDecoration: 'none', ...isActive('/messages') }}>
            Messages
          </Link>
          {user.role === 'candidate' && (
            <Link to="/submissions" style={{ padding: '18px 12px', fontSize: 14, color: 'var(--text)', textDecoration: 'none', ...isActive('/submissions') }}>
              Submissions
            </Link>
          )}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {user.name} · <span className={`badge badge-${user.role}`}>{user.role}</span>
            </span>
            <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 13 }} onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login"><button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>Login</button></Link>
            <Link to="/register"><button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>Register</button></Link>
          </>
        )}
      </div>
    </nav>
  )
}
