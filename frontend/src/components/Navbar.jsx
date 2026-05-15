import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const LINKS = {
  candidate: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/interviewers', label: 'Interviewers' },
    { to: '/bookings', label: 'My Sessions' },
    { to: '/submissions', label: 'Submissions' },
    { to: '/messages', label: 'Messages' },
  ],
  interviewer: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/submissions', label: 'Reviews' },
    { to: '/packages', label: 'Packages' },
    { to: '/messages', label: 'Messages' },
  ],
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  const links = user ? LINKS[user.role] || LINKS.candidate : []

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        Hire<span>Sphere</span>
      </Link>

      {user && (
        <div className="navbar-links">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${location.pathname.startsWith(to) ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <div className="navbar-user">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user ? (
          <>
            <span className="navbar-user-name">
              {user.name} · <span className={`badge badge-${user.role}`}>{user.role}</span>
            </span>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
