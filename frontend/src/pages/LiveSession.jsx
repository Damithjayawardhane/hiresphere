import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go', 'rust']

const STARTERS = {
  python: '# Python\ndef solution():\n    pass\n\nprint(solution())',
  javascript: '// JavaScript\nfunction solution() {\n    \n}\n\nconsole.log(solution());',
  java: '// Java\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}',
  cpp: '// C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
  go: '// Go\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}',
  rust: '// Rust\nfn main() {\n    println!("Hello, world!");\n}',
}

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

function getSocketBaseUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (apiUrl) return apiUrl
  if (import.meta.env.DEV) return 'http://localhost:5003'
  return undefined
}

/** API Gateway HTTP APIs don't reliably upgrade WebSocket; Engine.IO polling works through HTTPS proxy. */
function buildSocketOptions(baseUrl) {
  const b = baseUrl || ''
  const viaAwsHttpProxy =
    b.includes('execute-api.') ||
    (b.includes('amazonaws.com') && !b.includes('elb.amazonaws.com'))
  if (viaAwsHttpProxy) {
    return {
      path: '/socket.io',
      transports: ['polling'],
      upgrade: false,
      rememberUpgrade: false,
      withCredentials: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    }
  }
  return {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
  }
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
    pc.ontrack = ev => {
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0]
      }
    }
    pc.onicecandidate = ev => {
      if (ev.candidate && socketRef.current?.connected) {
        socketRef.current.emit('webrtc_ice', { room: bookingId, candidate: ev.candidate.toJSON() })
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') setRtcHint('WebRTC connection failed — try enabling camera again.')
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
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      setCamOn(true)
      setRtcHint('Camera on. Send a video offer or wait for your peer.')
      if (pendingOfferRef.current) {
        const sdp = pendingOfferRef.current
        pendingOfferRef.current = null
        await acceptRemoteOfferRef.current?.(sdp)
      }
    } catch (e) {
      setRtcHint(`Camera/mic error: ${e.message || 'permission denied'}`)
    }
  }

  const acceptRemoteOffer = async sdp => {
    const pc = setupPeerConnection()
    if (!localStreamRef.current) {
      pendingOfferRef.current = sdp
      setRtcHint('Peer wants video — enable your camera to connect.')
      return
    }
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    if (!socketRef.current?.connected) {
      setRtcHint('Lost signaling connection — cannot send WebRTC answer.')
      return
    }
    socketRef.current.emit('webrtc_answer', { room: bookingId, sdp: answer })
    setRtcHint('Answer sent — establishing WebRTC…')
  }

  acceptRemoteOfferRef.current = acceptRemoteOffer

  const sendOffer = async () => {
    if (!socketRef.current?.connected) {
      setRtcHint('Wait until session shows Connected — signaling uses Socket.IO.')
      return
    }
    if (!localStreamRef.current) {
      setRtcHint('Enable camera first.')
      return
    }
    const pc = setupPeerConnection()
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socketRef.current.emit('webrtc_offer', { room: bookingId, sdp: offer })
    setRtcHint('Offer sent — waiting for peer answer.')
  }

  useEffect(() => {
    const base = getSocketBaseUrl()
    const opts = buildSocketOptions(base)
    const socket = io(base, opts)
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setRtcHint('')
      socket.emit('join_session', { room: bookingId, user: user?.name, sid: socket.id })
    })
    socket.on('disconnect', reason => {
      setConnected(false)
      setRtcHint(`Disconnected (${reason}). Reconnecting…`)
    })
    socket.on('connect_error', err => {
      setConnected(false)
      setRtcHint(`Cannot reach session server: ${err?.message || err}. Check API ${base || 'URL'}.`)
    })
    socket.on('user_joined', ({ user: u }) => {
      setParticipants(p => [...new Set([...p, u])])
      setMessages(m => [...m, { system: true, text: `${u} joined` }])
    })
    socket.on('user_left', ({ user: u }) => {
      setMessages(m => [...m, { system: true, text: `${u} left` }])
    })
    socket.on('code_update', ({ code: c, language: l }) => {
      setCode(c)
      if (l) setLanguage(l)
    })
    socket.on('new_message', msg => setMessages(m => [...m, msg]))
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
        setRtcHint('Connected — remote video should appear.')
      } catch (e) {
        setRtcHint(`WebRTC answer error: ${e.message || e}`)
      }
    })
    socket.on('webrtc_ice', async ({ candidate }) => {
      try {
        const pc = pcRef.current
        if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        /* ignore */
      }
    })

    return () => {
      socket.disconnect()
      pcRef.current?.close()
      pcRef.current = null
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
  }, [bookingId, user?.name, setupPeerConnection])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleCodeChange(e) {
    const newCode = e.target.value
    setCode(newCode)
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('code_change', { room: bookingId, code: newCode, language, user: user?.name })
  }

  function handleLanguageChange(lang) {
    setLanguage(lang)
    const newCode = STARTERS[lang]
    setCode(newCode)
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('code_change', { room: bookingId, code: newCode, language: lang, user: user?.name })
  }

  function sendMessage(e) {
    e.preventDefault()
    if (!msgInput.trim()) return
    const s = socketRef.current
    if (!s?.connected) {
      setRtcHint('Session socket not connected — wait for green “Connected” before sending chat.')
      return
    }
    s.emit('chat_message', { room: bookingId, message: msgInput, user: user?.name })
    setMessages(m => [
      ...m,
      { message: msgInput, user: user?.name, timestamp: new Date().toISOString(), self: true },
    ])
    setMsgInput('')
  }

  return (
    <div className="live-session">
      <header className="live-toolbar">
        <div>
          <div className="live-toolbar-title">Live interview session</div>
          <div className="live-toolbar-id">{bookingId}</div>
        </div>
        <Link to="/bookings" className="btn btn-outline btn-sm">← Back to bookings</Link>
        <div className="live-status">
          <span className={`status-dot ${connected ? 'on' : 'off'}`} />
          {connected ? 'Connected' : 'Connecting…'}
          {participants.length > 0 && (
            <span> · {participants.filter(Boolean).join(', ')}</span>
          )}
        </div>
      </header>

      <div className="live-body">
        <section className="video-strip">
          <p className="video-strip-label">WebRTC video — signaling via Socket.IO (same session room)</p>
          <div className="video-row">
            <video ref={localVideoRef} className="session-video" autoPlay muted playsInline title="You" />
            <video ref={remoteVideoRef} className="session-video" autoPlay playsInline title="Peer" />
            <button type="button" className="btn btn-outline btn-sm" onClick={startCamera}>
              {camOn ? 'Camera on' : 'Enable camera & mic'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={sendOffer}>
              Send video offer
            </button>
          </div>
          {rtcHint && <p className="rtc-hint">{rtcHint}</p>}
        </section>

        <div className="live-panels">
          <section className="code-panel">
            <div className="code-tabs">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  type="button"
                  className={`code-tab${language === l ? ' active' : ''}`}
                  onClick={() => handleLanguageChange(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <textarea
              className="code-editor"
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const s = e.target.selectionStart
                  const val = e.target.value
                  const newVal = `${val.substring(0, s)}  ${val.substring(e.target.selectionEnd)}`
                  setCode(newVal)
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = s + 2
                  }, 0)
                  const sock = socketRef.current
                  if (sock?.connected) {
                    sock.emit('code_change', {
                      room: bookingId,
                      code: newVal,
                      language,
                      user: user?.name,
                    })
                  }
                }
              }}
            />
          </section>

          <aside className="live-chat-panel">
            <div className="live-chat-header">Session chat</div>
            <div className="live-chat-messages">
              {messages.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No messages yet</p>
              )}
              {messages.map((m, i) =>
                m.system ? (
                  <p key={i} className="live-chat-system">{m.text}</p>
                ) : (
                  <div key={i} className={`live-chat-bubble ${m.self ? 'self' : 'peer'}`}>
                    <div className="live-chat-user">{m.user}</div>
                    <div>{m.message}</div>
                  </div>
                )
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="live-chat-form" onSubmit={sendMessage}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Send</button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  )
}
