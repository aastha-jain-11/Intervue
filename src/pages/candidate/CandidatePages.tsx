import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import { listInterviews } from '../../api/interviews'
import { Badge, Button, Detail, PageHeader } from '../../components/common'

type Interview = Awaited<ReturnType<typeof listInterviews>>[number]

function useCandidateInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void listInterviews().then(setInterviews).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load interviews.')).finally(() => setLoading(false)) }, [])
  return { interviews, loading, error }
}

function InterviewRow({ interview }: { interview: Interview }) {
  const scheduled = interview.selectedSlot ? new Date(interview.selectedSlot) : null
  return <div className="candidate-interview-row"><div className="candidate-date"><strong>{scheduled ? scheduled.toLocaleDateString() : 'TBD'}</strong><span>{scheduled ? scheduled.toLocaleTimeString() : 'Not scheduled'}</span></div><div className="candidate-interview-info"><strong>{interview.roundType}</strong><span>{interview.application.job.title}</span><small>{interview.durationMins} minutes · {interview.status}</small></div><Badge tone={interview.status === 'scheduled' ? 'success' : 'warning'}>{interview.status}</Badge>{interview.status === 'scheduled' && <Button variant="ghost" to={`/interviews/${interview.id}`}>View details</Button>}</div>
}

export function CandidateDashboardPage() {
  const { user } = useAuth()
  const { interviews, loading, error } = useCandidateInterviews()
  const upcoming = interviews.filter(interview => interview.status === 'scheduled')
  const next = upcoming[0]
  return <><PageHeader eyebrow="Candidate portal" title={`Welcome back, ${user?.name.split(' ')[0] || 'there'}`} description="Your applications and scheduled interviews from the live workspace." action={<Button to="/candidate/apply" variant="secondary">View open roles</Button>} /><section className="candidate-welcome panel"><div className="candidate-welcome-copy"><div className="avatar avatar-large avatar-coral">{user?.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><div className="eyebrow">Authenticated profile</div><h2>{user?.name}</h2><p>{user?.email}</p></div></div>{next ? <div className="candidate-next"><span>{new Date(next.selectedSlot as string).toLocaleString()}</span><strong>{next.application.job.title}</strong><Button to={`/interviews/${next.id}`} icon="→">View interview</Button></div> : <div className="candidate-next"><span>No scheduled interviews</span><strong>Keep your availability current</strong></div>}</section><div className="candidate-stat-grid"><div className="candidate-stat"><span>Scheduled interviews</span><strong>{upcoming.length}</strong><small>From the interview API</small></div><div className="candidate-stat"><span>Total interviews</span><strong>{interviews.length}</strong><small>Including pending rounds</small></div><div className="candidate-stat"><span>Role</span><strong>{user?.role}</strong><small>From /users/me</small></div></div><section className="panel candidate-upcoming"><div className="panel-head"><div><h2>Your interviews</h2><p>Live interview records for your account.</p></div><Link className="text-link" to="/candidate/interviews">View all →</Link></div>{loading ? <p>Loading interviews...</p> : error ? <p role="alert" className="form-error">{error}</p> : upcoming.length ? upcoming.map(interview => <InterviewRow interview={interview} key={interview.id}/>) : <p className="candidate-empty-state">No scheduled interviews yet.</p>}</section></>
}

export function CandidateInterviewsPage() {
  const { interviews, loading, error } = useCandidateInterviews()
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'other'>('all')
  const visible = filter === 'scheduled' ? interviews.filter(item => item.status === 'scheduled') : filter === 'other' ? interviews.filter(item => item.status !== 'scheduled') : interviews
  return <><PageHeader eyebrow="Candidate portal" title="My interviews" description="Review live interview records and scheduled conversations."/><div className="page-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <b>{interviews.length}</b></button><button className={filter === 'scheduled' ? 'active' : ''} onClick={() => setFilter('scheduled')}>Scheduled <b>{interviews.filter(item => item.status === 'scheduled').length}</b></button><button className={filter === 'other' ? 'active' : ''} onClick={() => setFilter('other')}>Other <b>{interviews.filter(item => item.status !== 'scheduled').length}</b></button></div><section className="panel">{loading ? <p>Loading interviews...</p> : error ? <p role="alert" className="form-error">{error}</p> : visible.length ? visible.map(interview => <InterviewRow interview={interview} key={interview.id}/>) : <p className="candidate-empty-state">No interviews in this view yet.</p>}</section></>
}

export function CandidateCalendarPage() {
  const { interviews, loading, error } = useCandidateInterviews()
  return <><PageHeader eyebrow="Candidate portal" title="My calendar" description="Scheduled interviews from the backend."/><section className="panel">{loading ? <p>Loading calendar...</p> : error ? <p role="alert" className="form-error">{error}</p> : interviews.filter(item => item.selectedSlot).map(interview => { const start = new Date(interview.selectedSlot as string); return <div className="candidate-interview-row" key={interview.id}><Detail label="Interview" value={interview.application.job.title} /><Detail label="When" value={start.toLocaleString()} /><Detail label="Status" value={interview.status} /></div> })}</section></>
}

export function CandidateNotificationsPage() { const [items, setItems] = useState<Array<{ id: string; message: string | null; timestamp: string; readAt: string | null }>>([]); const [error, setError] = useState(''); useEffect(() => { void fetch('/api/notifications', { credentials: 'include' }).then(async response => { if (!response.ok) throw new Error('Unable to load notifications.'); return response.json() as Promise<{ data: { notifications: Array<{ id: string; message: string | null; timestamp: string; readAt: string | null }> } }> }).then(result => setItems(result.data.notifications)).catch(e => setError(e instanceof Error ? e.message : 'Unable to load notifications.')) }, []); return <><PageHeader eyebrow="Candidate portal" title="Notifications" description="Persistent updates from your interview workflow."/><section className="panel">{error ? <p role="alert" className="form-error">{error}</p> : items.length ? items.map(item => <div className="candidate-interview-row" key={item.id}><div className="candidate-interview-info"><strong>Interview Confirmed</strong><span>{item.message ?? 'Interview update'}</span><small>{new Date(item.timestamp).toLocaleString()} {item.readAt ? '· Read' : '· Unread'}</small></div></div>) : <p className="candidate-empty-state">No notifications yet.</p>}</section></> }
