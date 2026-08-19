import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: 'var(--primary)', width: 40, height: 40 }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    const loginPath = role === 'AGENT' ? '/agent/login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    const redirect = user.role === 'ADMIN' ? '/admin/dashboard'
      : user.role === 'AGENT' ? '/agent/dashboard'
      : '/customer/dashboard'
    return <Navigate to={redirect} replace />
  }

  return children
}
