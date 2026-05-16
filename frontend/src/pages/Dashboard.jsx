import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Loading from '../components/Loading'

export default function Dashboard() {
  const { user } = useAuth()
  const isCandidate = user?.role === 'candidate'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/bookings').catch(() => ({ data: [] })),
      isCandidate ? api.get('/submissions').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      !isCandidate ? api.get('/packages').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([bookingsRes, subsRes, pkgRes]) => {
        const bookings = bookingsRes.data || []
        const upcoming = bookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length
        const completed = bookings.filter(b => b.status === 'completed').length
        setStats({
          bookings: bookings.length,
          upcoming,
          completed,
          submissions: (subsRes.data || []).length,
          packages: (pkgRes.data || []).length,
        })
      })
      .finally(() => setLoading(false))
  }, [isCandidate])

  const candidateActions = [
    { label: 'Find interviewers', desc: 'Browse and book mock interviews', link: '/interviewers', accent: true },
    { label: 'My sessions', desc: 'Upcoming and past bookings', link: '/bookings' },
    { label: 'Submissions', desc: 'Coding challenge repos & solutions', link: '/submissions' },
    { label: 'Messages', desc: 'Chat with your interviewers', link: '/messages' },
  ]

  const interviewerActions = [
    { label: 'Bookings', desc: 'Manage candidate requests', link: '/bookings', accent: true },
    { label: 'Review submissions', desc: 'Annotate candidate code', link: '/submissions' },
    { label: 'Packages', desc: 'Bundled session offers', link: '/packages' },
    { label: 'Messages', desc: 'Reply to candidates', link: '/messages' },
  ]

  const actions = isCandidate ? candidateActions : interviewerActions

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading your dashboard…" />
      </div>
    )
  }

  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero-title">
          Welcome back, <span className="highlight">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="hero-sub">
          {isCandidate
            ? 'Practice with industry experts and track your interview journey.'
            : 'Manage sessions, feedback, and candidate progress.'}
        </p>
      </section>

      <div className="grid-4" style={{ marginBottom: 36 }}>
        <div className="stat-card">
          <div className="stat-label">Total bookings</div>
          <div className="stat-value accent">{stats?.bookings ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value">{stats?.upcoming ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats?.completed ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isCandidate ? 'Submissions' : 'Packages'}</div>
          <div className="stat-value">{isCandidate ? stats?.submissions : stats?.packages}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 40, maxWidth: 640 }}>
        <div className="card">
          <div className="stat-label">Profile</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>{user?.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{user?.email}</div>
          <span className={`badge badge-${user?.role}`} style={{ marginTop: 10 }}>{user?.role}</span>
        </div>
        {(user?.company || user?.rate) && (
          <div className="card">
            {user.company && (
              <>
                <div className="stat-label">Company</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{user.company}</div>
              </>
            )}
            {user.skills && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{user.skills}</p>}
            {user.rate && <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: 8 }}>${user.rate}/hr</p>}
          </div>
        )}
      </div>

      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem', marginBottom: 16 }}>Quick actions</h2>
      <div className="grid-2">
        {actions.map(a => (
          <Link key={a.link} to={a.link} className="card card-interactive action-card">
            <div className="action-title" style={a.accent ? { color: 'var(--accent)' } : undefined}>{a.label}</div>
            <div className="action-desc">{a.desc}</div>
            <div className="action-arrow">Open →</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
