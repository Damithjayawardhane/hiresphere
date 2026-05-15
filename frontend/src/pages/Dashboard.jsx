import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const isCandidate = user?.role === 'candidate'

  const candidateActions = [
    { label: 'Find Interviewers', desc: 'Browse expert interviewers and book a session', link: '/interviewers', color: 'var(--accent)' },
    { label: 'My Sessions', desc: 'View your upcoming and past interview sessions', link: '/bookings', color: '#a78bfa' },
    { label: 'Submissions', desc: 'Upload solutions or share a GitHub repo for coding challenges', link: '/submissions', color: '#22c55e' },
    { label: 'Messages', desc: 'Message interviewers you are working with', link: '/messages', color: '#38bdf8' },
  ]

  const interviewerActions = [
    { label: 'View Bookings', desc: 'See candidate requests and manage your schedule', link: '/bookings', color: 'var(--accent)' },
    { label: 'Review Submissions', desc: 'Annotate coding challenge solutions from candidates', link: '/submissions', color: '#22c55e' },
    { label: 'Interview Packages', desc: 'Create bundled session packages for candidates', link: '/packages', color: '#a78bfa' },
    { label: 'Messages', desc: 'Reply to candidates', link: '/messages', color: '#38bdf8' },
  ]

  const actions = isCandidate ? candidateActions : interviewerActions

  return (
    <div className="page">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>
          Welcome back,<br />
          <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 15 }}>
          {isCandidate
            ? 'Practice with real industry experts and land your dream role.'
            : 'Help candidates succeed in their interviews.'}
        </p>
      </div>

      {/* Role badge */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '0 0 auto', minWidth: 200 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Signed in as</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </div>
        {user?.company && (
          <div className="card" style={{ flex: '0 0 auto', minWidth: 200 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Company</div>
            <div style={{ fontWeight: 600 }}>{user.company}</div>
            {user.skills && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{user.skills}</div>}
            {user.rate && <div style={{ color: 'var(--success)', fontSize: 14, marginTop: 6 }}>${user.rate}/hr</div>}
          </div>
        )}
      </div>

      {/* Architecture info banner */}
      <div style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          🏗 System Architecture
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
          {[
            { label: 'Auth Service', port: ':5001', aws: 'Cognito' },
            { label: 'Booking Service', port: ':5002', aws: 'ECS Fargate' },
            { label: 'Interview Service', port: ':5003', aws: 'ECS + WebSocket + WebRTC signaling' },
            { label: 'API Gateway', port: ':8080', aws: 'ALB / API Gateway' },
            { label: 'Frontend', port: ':3000', aws: 'AWS Amplify' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', minWidth: 140 }}>
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>Local{s.port}</div>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>AWS: {s.aws}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Quick Actions</h2>
      <div className="grid-2" style={{ maxWidth: 700 }}>
        {actions.map(a => (
          <Link to={a.link} key={a.label} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', borderColor: 'var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: a.color }}>{a.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
