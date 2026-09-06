import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from '../types/auth'

const dashboardByRole: Record<UserRole, string> = {
  candidate: '/candidate/dashboard',
  interviewer: '/interviewer/dashboard',
  ta_admin: '/ta/dashboard',
}

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="empty-page"><p>Checking your session...</p></div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardByRole[user.role]} replace />
  }

  return <>{children}</>
}

export function dashboardPathForRole(role: UserRole): string {
  return dashboardByRole[role]
}
