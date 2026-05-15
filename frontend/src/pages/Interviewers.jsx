import { useEffect, useState } from 'react'
import { fetchInterviewers } from '../api'
import InterviewerCard from '../components/InterviewerCard'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import { API_BASE } from '../api'

export default function Interviewers() {
  const [interviewers, setInterviewers] = useState([])
  const [filters, setFilters] = useState({ domains: [''], levels: [''], types: [''] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [interviewType, setInterviewType] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInterviewers()
      .then(({ list, filters: f }) => {
        setInterviewers(list)
        setFilters(f)
      })
      .catch(err => {
        setInterviewers([])
        setError(
          err.response?.data?.error ||
            err.message ||
            `Cannot load interviewers from API (${API_BASE || 'not configured'}).`
        )
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

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading interviewers from database…" />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Find an interviewer"
        subtitle="Browse experts from the database — filter by domain, session type, and experience."
      />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-group">
          <label>Search</label>
          <input placeholder="Name, skill, company…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Domain</label>
          <select value={domain} onChange={e => setDomain(e.target.value)}>
            {filters.domains.map(d => (
              <option key={d || 'any'} value={d}>{d || 'Any domain'}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Session type</label>
          <select value={interviewType} onChange={e => setInterviewType(e.target.value)}>
            {filters.types.map(t => (
              <option key={t || 'any'} value={t}>{t || 'Any type'}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Experience</label>
          <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
            {filters.levels.map(l => (
              <option key={l || 'any'} value={l}>{l || 'Any level'}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <p>No interviewers match your filters.</p>
          {interviewers.length === 0 && !error && (
            <p style={{ marginTop: 8, fontSize: 13 }}>Register as an interviewer or seed the auth-service database.</p>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map(iv => (
            <InterviewerCard key={iv.id} interviewer={iv} />
          ))}
        </div>
      )}
    </div>
  )
}
