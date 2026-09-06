import { useState } from 'react'
import { Link } from 'react-router-dom'
import { candidates, interviews, notifications } from '../../data/demoData'
import { Badge, Button, CandidateAvatar, PageHeader } from '../../components/common'

const candidate = candidates[0]
const candidateInterviews = interviews.filter(item => item.candidate === candidate.name || item.id === 'interview-2' || item.id === 'interview-4')

function InterviewRow({ interview }: { interview: typeof interviews[number] }) {
  const completed = interview.status === 'Completed'
  return <div className="candidate-interview-row"><div className="candidate-date"><strong>{completed ? 'Aug 28' : 'Sep 10'}</strong><span>2026</span></div><div className="candidate-interview-info"><strong>{interview.round}</strong><span>{interview.role}</span><small>{completed ? 'Completed conversation' : `${interview.time} · Online`}</small></div><Badge tone={completed ? 'neutral' : 'success'}>{completed ? 'Completed' : 'Upcoming'}</Badge>{!completed && <Button variant="ghost" to={`/interviews/${interview.id}`}>View details</Button>}</div>
}

export function CandidateDashboardPage() {
  const upcoming = candidateInterviews.filter(item => item.status !== 'Completed')
  return <><PageHeader eyebrow="Candidate portal" title={`Welcome back, ${candidate.name.split(' ')[0]}`} description="Everything you need for your interview journey, in one place." action={<Button to="/candidate/calendar" variant="secondary">View calendar</Button>} /><section className="candidate-welcome panel"><div className="candidate-welcome-copy"><CandidateAvatar candidate={candidate} large/><div><div className="eyebrow">Software Engineer application</div><h2>Your next conversation is coming up</h2><p>Technical Interview with Rahul Mehta and Priya Shah</p></div></div><div className="candidate-next"><span>Thursday, September 10</span><strong>2:00 - 3:00 PM IST</strong><Button to="/interviews/interview-1" icon="→">View interview</Button></div></section><div className="candidate-stat-grid"><div className="candidate-stat"><span>Upcoming interviews</span><strong>{upcoming.length}</strong><small>Next: Sep 10, 2026</small></div><div className="candidate-stat"><span>Completed interviews</span><strong>{candidateInterviews.filter(item => item.status === 'Completed').length}</strong><small>Keep building momentum</small></div><div className="candidate-stat"><span>Application status</span><strong>In progress</strong><small>Technical interview stage</small></div></div><section className="panel candidate-upcoming"><div className="panel-head"><div><h2>Upcoming interviews</h2><p>Prepare for your next conversations.</p></div><Link className="text-link" to="/candidate/interviews">View all →</Link></div>{upcoming.map(item => <InterviewRow interview={item} key={item.id}/>)}</section></>
}

export function CandidateInterviewsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const upcomingCount = candidateInterviews.filter(item => item.status !== 'Completed').length
  const completedCount = candidateInterviews.filter(item => item.status === 'Completed').length
  const visibleInterviews = filter === 'upcoming'
    ? candidateInterviews.filter(item => item.status !== 'Completed')
    : filter === 'completed'
      ? candidateInterviews.filter(item => item.status === 'Completed')
      : candidateInterviews

  return <><PageHeader eyebrow="Candidate portal" title="My interviews" description="Review upcoming conversations and your interview history."/><div className="page-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All interviews <b>{candidateInterviews.length}</b></button><button className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>Upcoming <b>{upcomingCount}</b></button><button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed <b>{completedCount}</b></button></div><section className="panel candidate-interview-list">{visibleInterviews.length > 0 ? visibleInterviews.map(item => <InterviewRow interview={item} key={item.id}/>) : <p className="candidate-empty-state">No interviews in this view yet.</p>}</section></>
}

export function CandidateCalendarPage() { const days = ['MON 7','TUE 8','WED 9','THU 10','FRI 11']; return <><PageHeader eyebrow="Candidate portal" title="My calendar" description="Your interviews and preparation time for the week ahead." action={<div className="calendar-actions"><Button variant="secondary">←</Button><Button variant="secondary">Today</Button><Button variant="secondary">→</Button></div>}/><section className="panel calendar-panel candidate-calendar"><div className="calendar-toolbar"><div><strong>September 7 - 11, 2026</strong><span>Asia/Kolkata (IST)</span></div><div className="calendar-legend"><span>● Interview</span><span>● Available</span></div></div><div className="calendar-grid"><div className="time-column"><span/>{['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'].map(time => <span key={time}>{time}</span>)}</div><div className="days-grid">{days.map(day => <div className="day-column" key={day}><strong>{day}</strong>{Array.from({length:9}).map((_,i)=><span className="hour-cell" key={i}/>)}</div>)}<div className="calendar-event orange" style={{left:'61%',top:'190px',height:'96px'}}><strong>Technical interview</strong><small>2:00 - 3:00 PM</small></div></div></div></section></> }

export function CandidateNotificationsPage() { const [read, setRead] = useState<string[]>([]); return <><PageHeader eyebrow="Candidate portal" title="Notifications" description="Updates about your application and interviews." action={<Button variant="secondary" onClick={() => setRead(notifications.map(item => item.title))}>Mark all as read</Button>}/><section className="panel notification-panel candidate-notifications"><div className="notification-filter"><button className="active">All</button><button>Unread <b>2</b></button><button>Interviews</button></div>{notifications.slice(0,3).map(item => <div className={`notification-item ${!read.includes(item.title) && item.unread ? 'unread' : ''}`} key={item.title}><span className={`notification-icon ${item.type}`}>✓</span><div><strong>{item.title}</strong><p>{item.type === 'request' ? 'Your interviewer has been confirmed for the upcoming conversation.' : item.text}</p><small>{item.time}</small></div>{!read.includes(item.title) && item.unread && <button className="read-dot" onClick={() => setRead([...read,item.title])} aria-label="Mark notification as read"/>}</div>)}</section></> }
