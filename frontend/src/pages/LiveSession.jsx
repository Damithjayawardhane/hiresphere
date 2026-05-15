import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go', 'rust']

const STARTERS = {
  python: '# Python\ndef solution():\n    pass\n\nprint(solution())',
  javascript: '// JavaScript\nfunction solution() {\n    \n}\n\nconsole.log(solution());',
  java: '// Java\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}',
  cpp: '// C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}',
  go: '// Go\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}',
  rust: '// Rust\nfn main() {\n    println!("Hello, world!");\n}',
}

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

function getSocketBaseUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (api) return api
  if (import.meta.env.DEV) return 'http://localhost:5003'
  return undefined
}

export default function LiveSession() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const [code, setCode] = useState(STARTERS.python)
  const [language, setLanguage] = useState('python')
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [rtcHint, setRtcHint] = useState('')
  const [camOn, setCamOn] = useState(false)

  const socketRef = useRef(null)
  const chatEndRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pendingOfferRef = useRef(null)
  const acceptRemoteOfferRef = useRef(null)

  const setupPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    pc.ontrack = (ev) => {
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0]
      }
    }
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice', { room: bookingId, candidate: ev.candidate.toJSON() })
      }
    }
    pc.onconnectionstatechange = () => {
      setRtcHint((h) => (pc.connectionState === 'failed' ? 'WebRTC connection failed — try again.' : h))
    }
    return pc
  }, [bookingId])

  const startCamera = async () => {
    if (localStreamRef.current) {
      setRtcHint('Camera is already on.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      const pc = setupPeerConnection()
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      setCamOn(true)
      setRtcHint('Camera on. Use “Send video offer” or wait for your peer’s offer.')
      if (pendingOfferRef.current) {
        const sdp = pendingOfferRef.current
        pendingOfferRef.current = null
        await acceptRemoteOfferRef.current?.(sdp)
      }
    } catch (e) {
      setRtcHint(`Camera/mic error: ${e.message || 'permission denied'}`)
    }
  }

  const acceptRemoteOffer = async (sdp) => {
    const pc = setupPeerConnection()
    if (!localStreamRef.current) {
      pendingOfferRef.current = sdp
      setRtcHint('Peer wants video — enable your camera, then we connect automatically.')
      return
    }
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socketRef.current?.emit('webrtc_answer', { room: bookingId, sdp: answer })
    setRtcHint('Answer sent — establishing WebRTC…')
  }

  acceptRemoteOfferRef.current = acceptRemoteOffer

  const sendOffer = async () => {
    if (!localStreamRef.current) {
      setRtcHint('Enable camera first.')
      return
    }
    const pc = setupPeerConnection()
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socketRef.current?.emit('webrtc_offer', { room: bookingId, sdp: offer })
    setRtcHint('Offer sent — your peer should accept automatically if their camera is on.')
  }

  useEffect(() => {
    const base = getSocketBaseUrl()
    const socket = io(base, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_session', { room: bookingId, user: user?.name, sid: socket.id })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('user_joined', ({ user: u }) => {
      setParticipants((p) => [...new Set([...p, u])])
      setMessages((m) => [...m, { system: true, text: `${u} joined the session` }])
    })

    socket.on('user_left', ({ user: u }) => {
      setMessages((m) => [...m, { system: true, text: `${u} left the session` }])
    })

    socket.on('code_update', ({ code: c, language: l }) => {
      setCode(c)
      if (l) setLanguage(l)
    })

    socket.on('new_message', (msg) => {
      setMessages((m) => [...m, msg])
    })

    socket.on('webrtc_offer', async ({ sdp }) => {
      try {
        await acceptRemoteOfferRef.current?.(sdp)
      } catch (e) {
        setRtcHint(`WebRTC offer error: ${e.message || e}`)
      }
    })

    socket.on('webrtc_answer', async ({ sdp }) => {
      try {
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        setRtcHint('Remote description set — video should connect.')
      } catch (e) {
        setRtcHint(`WebRTC answer error: ${e.message || e}`)
      }
    })

    socket.on('webrtc_ice', async ({ candidate }) => {
      try {
        const pc = pcRef.current
        if (!pc || !candidate) return
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        /* ignore late ICE */
      }
    })

    return () => {
      socket.disconnect()
      pcRef.current?.close()
      pcRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }, [bookingId, user?.name, setupPeerConnection])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleCodeChange(e) {
    const newCode = e.target.value
    setCode(newCode)
    socketRef.current?.emit('code_change', { room: bookingId, code: newCode, language, user: user?.name })
  }

  function handleLanguageChange(lang) {
    setLanguage(lang)
    const newCode = STARTERS[lang]
    setCode(newCode)
    socketRef.current?.emit('code_change', { room: bookingId, code: newCode, language: lang, user: user?.name })
  }

  function sendMessage(e) {
    e.preventDefault()
    if (!msgInput.trim()) return
    socketRef.current?.emit('chat_message', { room: bookingId, message: msgInput, user: user?.name })
    setMessages((m) => [
      ...m,
      { message: msgInput, user: user?.name, timestamp: new Date().toISOString(), self: true },
    ])
    setMsgInput('')
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>Live Session</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{bookingId}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? 'var(--success)' : 'var(--accent2)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{connected ? 'Socket connected' : 'Connecting…'}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>👥 {participants.filter(Boolean).join(', ')}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'column' }}>
        {/* WebRTC strip */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: 12, background: '#0a0a12' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            WebRTC video (assignment): signaling over the same Socket.IO channel as the live session.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 160, height: 120, borderRadius: 8, background: '#111' }} />
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 160, height: 120, borderRadius: 8, background: '#111' }} />
            <button type="button" className="btn btn-outline" style={{ fontSize: 13 }} onClick={startCamera}>
              {camOn ? 'Camera on' : 'Enable camera / mic'}
            </button>
            <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={sendOffer}>
              Send video offer
            </button>
          </div>
          {rtcHint && <div style={{ fontSize: 12, color: 'var(--accent2)', marginTop: 8 }}>{rtcHint}</div>}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                gap: 2,
                padding: '8px 12px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    background: language === l ? 'var(--accent)' : 'transparent',
                    color: language === l ? '#fff' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <textarea
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
              style={{
                flex: 1,
                resize: 'none',
                background: '#0d0d16',
                color: '#e8e8f0',
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: 14,
                lineHeight: 1.6,
                padding: '16px 20px',
                border: 'none',
                outline: 'none',
                tabSize: 2,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const s = e.target.selectionStart
                  const val = e.target.value
                  const newVal = `${val.substring(0, s)}  ${val.substring(e.target.selectionEnd)}`
                  setCode(newVal)
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = s + 2
                  }, 0)
                }
              }}
            />
          </div>

          <div style={{ width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
              Live Chat
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m, i) => (
                <div key={i}>
                  {m.system ? (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>{m.text}</div>
                  ) : (
                    <div
                      style={{
                        background: m.self ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                        borderRadius: 8,
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: m.self ? 'var(--accent)' : 'var(--muted)', marginBottom: 3 }}>{m.user}</div>
                      <div style={{ fontSize: 13 }}>{m.message}</div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
                →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
