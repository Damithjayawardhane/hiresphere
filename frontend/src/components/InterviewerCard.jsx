import { Link } from 'react-router-dom'

function Stars({ avg }) {
  if (avg == null || Number.isNaN(Number(avg))) return null
  // API returns 0–5; clamp so String.repeat never gets a negative count
  const clamped = Math.min(5, Math.max(0, Number(avg)))
  const full = Math.min(5, Math.max(0, Math.round(clamped)))
  const empty = 5 - full
  return (
    <span className="stars" title={`${clamped} / 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(empty)}
      <span className="stars-muted">{clamped}</span>
    </span>
  )
}

function BadgeList({ badges }) {
  if (!badges) return null
  const list = badges.split(',').map(s => s.trim()).filter(Boolean)
  if (!list.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {list.map(b => (
        <span key={b} className="badge-pill">{b}</span>
      ))}
    </div>
  )
}

export default function InterviewerCard({ interviewer: iv }) {
  return (
    <article className="card card-interactive interviewer-card">
      <div className="interviewer-card-header">
        <div>
          <div className="interviewer-name">{iv.name}</div>
          {iv.company && <div className="interviewer-company">{iv.company}</div>}
          {(iv.rating_avg != null || iv.rating_count > 0) && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Stars avg={iv.rating_avg} />
              {iv.rating_count > 0 && (
                <span className="stars-muted">({iv.rating_count} reviews)</span>
              )}
            </div>
          )}
        </div>
        {iv.rate != null && (
          <div className="interviewer-rate">
            ${iv.rate}
            <small>/hr</small>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
        {iv.domain && <span className="badge badge-interviewer">{iv.domain}</span>}
        {iv.experience_level && <span style={{ color: 'var(--muted)' }}>{iv.experience_level}</span>}
      </div>
      <BadgeList badges={iv.badges} />

      {iv.availability && (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>Available:</strong> {iv.availability}
        </p>
      )}
      {iv.bio && <p className="interviewer-bio">{iv.bio}</p>}

      {iv.skills && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {iv.skills.split(',').map(s => (
            <span key={s} className="skill-pill">{s.trim()}</span>
          ))}
        </div>
      )}

      <Link to={`/book/${iv.id}`} style={{ marginTop: 'auto' }}>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }}>
          Book session
        </button>
      </Link>
    </article>
  )
}
