import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Button, PageHeader } from '../../components/common'

export function InterviewerDashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] || 'there'
  return <>
    <PageHeader eyebrow="Interviewer workspace" title={`Welcome back, ${firstName}`} description="Manage your availability and review interviews assigned to you." action={<Button to="/interviewer/calendar" variant="secondary">Manage availability</Button>} />
    <div className="metric-grid four">
      {[['Profile', user?.name || 'Unavailable', 'Authenticated user', 'indigo'], ['Role', 'Interviewer', 'From /users/me', 'green'], ['Availability', 'Manage', 'Used by auto-scheduling', 'blue'], ['Interviews', 'View', 'Assigned to you', 'orange']].map(([label, value, change, color]) => <div className="metric-card" key={label}><div className={`metric-icon ${color}`}>◈</div><div className="metric-label">{label}<span className="positive">{change}</span></div><strong>{value}</strong></div>)}
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Interviewer workspace</h2><p>Your interview list and scheduled details come from the backend.</p></div><Link className="text-link" to="/interviewer/interviews">View my interviews →</Link></div><p>Keep your availability current so compatible slots can be booked automatically.</p></section>
  </>
}
