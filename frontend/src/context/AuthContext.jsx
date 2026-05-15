import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  fetchAuthSession,
  confirmSignUp,
} from 'aws-amplify/auth'
import { configureAmplify, isCognitoConfigured } from '../amplify-config'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || ''

function authHeaderFromSession(session) {
  const tok = session?.tokens?.idToken
  if (!tok) return null
  if (typeof tok === 'string') return tok
  return tok.toString?.() ?? String(tok)
}

async function syncCognitoProfile(idToken, body = {}) {
  const res = await axios.post(`${API}/auth/cognito-sync`, body, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return res.data.user
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [useCognito] = useState(() => {
    configureAmplify()
    return isCognitoConfigured()
  })

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (useCognito) {
        try {
          const session = await fetchAuthSession()
          const idToken = authHeaderFromSession(session)
          if (idToken) {
            const u = await syncCognitoProfile(idToken, {})
            if (!cancelled) {
              setToken(idToken)
              setUser(u)
              axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
            }
          }
        } catch {
          /* no session */
        }
        if (!cancelled) setLoading(false)
        return
      }

      const savedToken = localStorage.getItem('hs_token')
      const savedUser = localStorage.getItem('hs_user')
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      }
      if (!cancelled) setLoading(false)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [useCognito])

  async function signUp(name, email, password, role, extra = {}) {
    if (useCognito) {
      const { isSignUpComplete, nextStep } = await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
            'custom:role': role,
          },
        },
      })
      const profile = {
        name,
        email,
        role,
        bio: extra.bio ?? '',
        company: extra.company ?? '',
        skills: extra.skills ?? '',
        rate: extra.rate ?? 60,
        domain: extra.domain ?? '',
        interview_types: extra.interview_types ?? '',
        experience_level: extra.experience_level ?? '',
        availability: extra.availability ?? '',
      }
      sessionStorage.setItem('pendingCognitoProfile', JSON.stringify(profile))
      if (isSignUpComplete) {
        await amplifySignIn({
          username: email,
          password,
          options: { authFlowType: 'USER_PASSWORD_AUTH' },
        })
        const session = await fetchAuthSession()
        const idToken = authHeaderFromSession(session)
        if (!idToken) throw new Error('No session after sign-up')
        const u = await syncCognitoProfile(idToken, profile)
        sessionStorage.removeItem('pendingCognitoProfile')
        setToken(idToken)
        setUser(u)
        axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
        return { user: u, needsConfirm: false }
      }
      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        return { user: null, needsConfirm: true, email }
      }
      return { user: null, needsConfirm: false }
    }

    const res = await axios.post(`${API}/auth/register`, {
      name,
      email,
      password,
      role,
      ...extra,
    })
    _storeSession(res.data)
    return { ...res.data, needsConfirm: false }
  }

  async function confirmCognitoSignUp(email, code) {
    await confirmSignUp({ username: email, confirmationCode: code })
  }

  async function signIn(email, password) {
    if (useCognito) {
      await amplifySignIn({
        username: email,
        password,
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      })
      const session = await fetchAuthSession()
      const idToken = authHeaderFromSession(session)
      if (!idToken) throw new Error('No ID token')
      let body = {}
      try {
        const raw = sessionStorage.getItem('pendingCognitoProfile')
        if (raw) body = JSON.parse(raw)
      } catch {
        /* ignore */
      }
      const u = await syncCognitoProfile(idToken, body)
      sessionStorage.removeItem('pendingCognitoProfile')
      setToken(idToken)
      setUser(u)
      axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
      return { user: u }
    }
    const res = await axios.post(`${API}/auth/login`, { email, password })
    _storeSession(res.data)
    return res.data
  }

  function signOut() {
    if (useCognito) {
      amplifySignOut().catch(() => {})
    }
    localStorage.removeItem('hs_token')
    localStorage.removeItem('hs_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setToken(null)
  }

  function _storeSession({ token: t, user: u }) {
    localStorage.setItem('hs_token', t)
    localStorage.setItem('hs_user', JSON.stringify(u))
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t)
    setUser(u)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signUp,
        signIn,
        signOut,
        useCognito,
        confirmCognitoSignUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
