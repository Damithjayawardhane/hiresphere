import axios from 'axios'

function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (raw && raw !== 'None' && raw !== 'undefined') return raw
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const API_BASE = resolveApiBase()

export const api = axios.create({ baseURL: API_BASE })

function mergeRatings(users, ratingsMap) {
  return users.map(u => {
    const r = ratingsMap[u.id] || {}
    const profileBadges = (u.badges || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const dynamicBadges = r.badges || []
    const badges = [...new Set([...profileBadges, ...dynamicBadges])]
    return {
      ...u,
      rating_avg: r.rating_avg ?? u.rating_avg ?? null,
      rating_count: r.rating_count ?? u.rating_count ?? 0,
      badges: badges.join(','),
    }
  })
}

/** Unique filter values from interviewer records in the database. */
export function collectFilterOptions(interviewers) {
  const domains = new Set()
  const levels = new Set()
  const types = new Set()
  for (const iv of interviewers) {
    if (iv.domain) domains.add(iv.domain)
    if (iv.experience_level) levels.add(iv.experience_level)
    parseInterviewTypes(iv.interview_types).forEach(t => types.add(t))
  }
  return {
    domains: ['', ...[...domains].sort()],
    levels: ['', ...[...levels].sort()],
    types: ['', ...[...types].sort()],
  }
}

export function parseInterviewTypes(raw) {
  if (!raw) return []
  return raw
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function setApiAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

export function isLocalDev() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

/** Interviewers + ratings from auth-service / interview-service (no mock fallback). */
export async function fetchInterviewers() {
  const [usersRes, ratingsRes] = await Promise.all([
    api.get('/auth/users', { params: { role: 'interviewer' } }),
    api.get('/ratings/interviewers').catch(() => ({ data: {} })),
  ])
  const list = Array.isArray(usersRes.data) ? mergeRatings(usersRes.data, ratingsRes.data || {}) : []
  return { list, filters: collectFilterOptions(list) }
}

export async function fetchFeedbackForBooking(bookingId) {
  try {
    const res = await api.get(`/feedback/booking/${bookingId}`)
    return res.data
  } catch {
    return null
  }
}
