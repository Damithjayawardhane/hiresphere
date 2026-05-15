import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchInterviewers } from '../api'

const DOMAINS = ['', 'Backend', 'Frontend', 'DevOps', 'AI/ML', 'Mobile']
const LEVELS = ['', 'Senior', 'Staff', 'Principal']

function Stars({ avg }) {
  if (avg == null) return null
  const full = Math.round(avg)
  return (
    <span style={{ color: '#fbbf24', fontSize: 13, letterSpacing: 1 }} title={`${avg} / 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
      <span style={{ color: 'var(--muted)', marginLeft: 6, letterSpacing: 0 }}>{avg}</span>
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
        <span key={b} style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
          {b}
        </span>
      ))}
    </div>
  )
}

export default function Interviewers() {
  const [interviewers, setInterviewers] = useState([])
  const [usingDemo, setUsingDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [interviewType, setInterviewType] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInterviewers()
      .then(({ list, demo }) => {
        setInterviewers(list)
        setUsingDemo(demo)
      })
      .catch(err => {
        setInterviewers([])
        setError(err.message || 'Failed to load interviewers')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = interviewers.filter(i => {
    const text =
      `${i.name} ${i.skills || ''} ${i.company || ''} ${i.domain || ''} ${i.interview_types || ''} ${i.experience_level || ''} ${i.availability || ''}`.toLowerCase()
    if (search && !text.includes(search.toLowerCase())) return false
    if (domain && (i.domain || '') !== domain) return false
    if (experienceLevel && (i.experience_level || '') !== experienceLevel) return false
    if (interviewType) {
      const types = (i.interview_types || '').toLowerCase()
      if (!types.includes(interviewType.toLowerCase())) return false
    }
    return true
  })

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading interviewers...</div>

  return (
    <div className="page">
      <h1 className="page-title">Find an Interviewer</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, maxWidth: 720 }}>
        Filter by domain, interview type, and experience level (assignment-aligned search).
      </p>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {usingDemo && (
        <div
          style={{
            background: 'rgba(108,99,255,0.08)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          <strong style={{ color: 'var(--accent)' }}>Demo mode:</strong> Cloud UI cannot reach the ALB API yet.
          Try search <strong>Damith</strong>, <strong>Alice</strong>, or <strong>Google</strong>.
          For full search with your database, run locally: <code>docker compose up</code> and{' '}
          <code>npm run dev</code>.
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 200, flex: '1 1 200px' }}>
          <label style={{ fontSize: 12 }}>Search</label>
          <input placeholder="Name, skill, company…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label style={{ fontSize: 12 }}>Domain</label>
          <select value={domain} onChange={e => setDomain(e.target.value)}>
            {DOMAINS.map(d => (
              <option key={d || 'any'} value={d}>
                {d || 'Any'}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label style={{ fontSize: 12 }}>Interview type</label>
          <input
            placeholder="DSA, Behavioral…"
            value={interviewType}
            onChange={e => setInterviewType(e.target.value)}
            style={{ minWidth: 140 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label style={{ fontSize: 12 }}>Experience</label>
          <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
            {LEVELS.map(l => (
              <option key={l || 'any'} value={l}>
                {l || 'Any'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>
          No interviewers match your filters.
          {usingDemo && search ? ' Try Alice, Bob, or Carol.' : ''}
        </p>
      )}

      <div className="grid-2">
        {filtered.map(iv => (
          <div key={iv.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17 }}>{iv.name}</div>
                {iv.company && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 2 }}>{iv.company}</div>}
                {(iv.rating_avg != null || iv.rating_count > 0) && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Stars avg={iv.rating_avg} />
                    {iv.rating_count > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>({iv.rating_count} reviews)</span>
                    )}
                  </div>
                )}
              </div>
              {iv.rate != null && (
                <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: 15 }}>
                  ${iv.rate}
                  <div style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>/hr</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
              {iv.domain && <span className="badge badge-interviewer">{iv.domain}</span>}
              {iv.experience_level && <span style={{ color: 'var(--muted)' }}>{iv.experience_level}</span>}
            </div>
            <BadgeList badges={iv.badges} />

            {iv.availability && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Availability:</strong> {iv.availability}
              </div>
            )}

            {iv.bio && (
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
                {iv.bio}
              </p>
            )}

            {iv.skills && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {iv.skills.split(',').map(s => (
                  <span key={s} style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            )}

            <Link to={`/book/${iv.id}`} style={{ marginTop: 'auto' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Book Session
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
