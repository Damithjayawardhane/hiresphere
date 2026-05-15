import axios from 'axios'

export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '')

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
  },
]

export function setApiAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

export async function fetchInterviewers() {
  try {
    const { data } = await api.get('/auth/users', { params: { role: 'interviewer' } })
    if (Array.isArray(data) && data.length > 0) return { list: data, demo: false }
  } catch {
    /* backend unreachable */
  }
  return { list: DEMO_INTERVIEWERS, demo: true }
}
