import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { UserRole } from '../../types/auth'

function NavItem({ to, icon, children }: { to: string; icon: string; children: ReactNode }) {
  return <NavLink className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} to={to}><span className="nav-icon">{icon}</span>{children}</NavLink>
}

function roleLabel(role: UserRole): string {
  return role === 'candidate' ? 'Candidate' : role === 'interviewer' ? 'Interviewer' : 'Talent Acquisition'
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'I'
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = user?.role || 'candidate'
  const isCandidate = role === 'candidate'
  const isInterviewer = role === 'interviewer'
  const homePath = isCandidate ? '/candidate/dashboard' : isInterviewer ? '/interviewer/dashboard' : '/ta/dashboard'
  const notificationsPath = isCandidate ? '/candidate/notifications' : isInterviewer ? '/interviewer/notifications' : '/notifications'

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return <div className="app-shell">
    <aside className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
      <Link className="brand" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link>
      <div className="workspace-switch"><span className="workspace-dot" /> {isCandidate ? 'Candidate portal' : 'Acme Corporation'} <span className="chevron">⌄</span></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        <p className="nav-label">{isCandidate ? 'My journey' : 'Workspace'}</p>
        <NavItem to={homePath} icon="◫">Dashboard</NavItem>
        {isCandidate ? <>
          <NavItem to="/candidate/interviews" icon="▣">My interviews</NavItem>
          <NavItem to="/candidate/calendar" icon="□">Calendar</NavItem>
          <NavItem to="/candidate/apply" icon="＋">Apply for a role</NavItem>
        </> : <>
          <NavItem to={isInterviewer ? '/interviewer/interviews' : '/ta/candidates'} icon="◉">{isInterviewer ? 'My Interviews' : 'Candidates'}</NavItem>
          <NavItem to={isInterviewer ? '/interviewer/calendar' : '/ta/interviews'} icon="▣">{isInterviewer ? 'Calendar' : 'Interviews'}</NavItem>
          {!isInterviewer && <NavItem to="/ta/calendar" icon="□">Calendar</NavItem>}
        </>}
        <NavItem to={notificationsPath} icon="◌">Notifications <span className="nav-count">3</span></NavItem>
        {!isCandidate && <><p className="nav-label nav-spaced">Manage</p><NavItem to="/settings" icon="⚙">Settings</NavItem></>}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">?</span><div><strong>Need a hand?</strong><small>Visit Help Center</small></div><span>↗</span></div><div className="profile-row"><div className="avatar avatar-indigo">{user ? initials(user.name) : 'I'}</div><div><strong>{user?.name || 'Intervue user'}</strong><small>{user ? roleLabel(user.role) : ''}</small></div><button className="more" type="button" onClick={() => void handleLogout()} aria-label="Log out">↪</button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation">☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{roleLabel(role)}</strong></div><div className="top-actions"><button className="icon-btn" aria-label="Search">⌕</button><Link className="notification-bell" to={notificationsPath} aria-label="Notifications">♧<i>3</i></Link><div className="avatar avatar-indigo">{user ? initials(user.name) : 'I'}</div></div></header>
      <div className="content">{children}</div>
    </main>
  </div>
}
