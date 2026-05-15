import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Interviewers from './pages/Interviewers'
import BookSession from './pages/BookSession'
import MyBookings from './pages/MyBookings'
import LiveSession from './pages/LiveSession'
import FeedbackForm from './pages/FeedbackForm'
import ConfirmSignUp from './pages/ConfirmSignUp'
import Submissions from './pages/Submissions'
import Messages from './pages/Messages'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--muted)'}}>Loading...</div>
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirm-signup" element={<ConfirmSignUp />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/interviewers" element={<PrivateRoute><Interviewers /></PrivateRoute>} />
        <Route path="/book/:interviewerId" element={<PrivateRoute><BookSession /></PrivateRoute>} />
        <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
        <Route path="/session/:bookingId" element={<PrivateRoute><LiveSession /></PrivateRoute>} />
        <Route path="/feedback/:bookingId/:candidateId" element={<PrivateRoute><FeedbackForm /></PrivateRoute>} />
        <Route path="/submissions" element={<PrivateRoute><Submissions /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      </Routes>
    </>
  )
}
