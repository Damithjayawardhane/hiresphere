import axios from 'axios'

function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (raw && raw !== 'None' && raw !== 'undefined') return raw
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const API_BASE = resolveApiBase()

export const api = axios.create({ baseURL: API_BASE })

/** Shown when cloud UI cannot reach the ALB-backed API (demo / viva). */
export const DEMO_INTERVIEWERS = [
  {
    id: 'demo-alice',
    name: 'Alice Johnson',
    email: 'alice@hiresphere.com',
    role: 'interviewer',
    bio: 'Senior SWE at Google, 8 yrs exp.',
    company: 'Google',
    skills: 'DSA, System Design',
    rate: 80,
    domain: 'Backend',
    interview_types: 'DSA, System Design',
    experience_level: 'Senior',
    availability: 'Weekday evenings UTC',
    badges: 'FAANG,Top Rated,System Design',
    rating_avg: 4.8,
    rating_count: 12,
  },
  {
    id: 'demo-bob',
    name: 'Bob Smith',
    email: 'bob@hiresphere.com',
    role: 'interviewer',
    bio: 'Staff Engineer at Meta.',
    company: 'Meta',
    skills: 'React, Node.js, Frontend',
    rate: 70,
    domain: 'Frontend',
    interview_types: 'DSA, Behavioral',
    experience_level: 'Staff',
    availability: 'Weekends',
    badges: 'React,Behavioral,Highly Rated',
    rating_avg: 4.6,
    rating_count: 8,
  },
  {
    id: 'demo-carol',
    name: 'Carol Lee',
    email: 'carol@hiresphere.com',
    role: 'interviewer',
    bio: 'Principal Engineer at Amazon.',
    company: 'Amazon',
    skills: 'System Design, Cloud, AWS',
    rate: 90,
    domain: 'DevOps',
    interview_types: 'System Design, Behavioral',
    experience_level: 'Principal',
    availability: 'Flexible',
    badges: 'AWS,Principal,Expert',
    rating_avg: 4.9,
    rating_count: 15,
  },
  {
    id: 'demo-damith',
    name: 'Damith Jayawardhane',
    email: 'damith@hiresphere.com',
    role: 'interviewer',
    bio: 'SLIIT interviewer — cloud & full-stack mock interviews.',
    company: 'HireSphere',
    skills: 'Java, React, AWS, System Design',
    rate: 65,
    domain: 'Backend',
    interview_types: 'DSA, Behavioral, System Design',
    experience_level: 'Senior',
    availability: 'Weekday evenings',
    badges: 'Cloud,Backend',
    rating_avg: 4.5,
    rating_count: 3,
  },
]

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

export function setApiAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

export function isLocalDev() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

export function isCloudAmplifyHost() {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('amplifyapp.com')
}

/** Real data from auth-service; demo list only on cloud when ALB API is unreachable. */
export async function fetchInterviewers() {
  try {
    const [usersRes, ratingsRes] = await Promise.all([
      api.get('/auth/users', { params: { role: 'interviewer' } }),
      api.get('/ratings/interviewers').catch(() => ({ data: {} })),
    ])
    if (Array.isArray(usersRes.data)) {
      return { list: mergeRatings(usersRes.data, ratingsRes.data || {}), demo: false }
    }
  } catch (err) {
    if (isLocalDev()) {
      throw new Error(
        'Cannot reach API at ' +
          (API_BASE || 'localhost') +
          '. Run: docker compose up -d (gateway http://localhost:8080)'
      )
    }
    if (isCloudAmplifyHost()) {
      return { list: DEMO_INTERVIEWERS, demo: true }
    }
    throw err
  }
  return { list: [], demo: false }
}
