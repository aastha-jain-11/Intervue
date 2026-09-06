import { useState } from 'react'
import { Button, PageHeader } from '../../components/common'

const interviewerNotifications = [
  { type: 'request', title: 'New interview request', text: 'You have been requested to interview Rahul Sharma for a Technical Interview.', time: '10 minutes ago', unread: true },
  { type: 'change', title: 'Calendar availability matched', text: 'A new slot was found that works with your working hours.', time: '1 hour ago', unread: true },
  { type: 'confirmed', title: 'Interview confirmed', text: 'Your interview with Priya Kumar is confirmed for September 11.', time: 'Yesterday', unread: false },
  { type: 'screening', title: 'Interview feedback reminder', text: 'Feedback for Aman Shah is due after your recent interview.', time: 'Yesterday', unread: false },
]

export function InterviewerNotificationsPage() {
  const [read, setRead] = useState<string[]>([])
  return <><PageHeader eyebrow="Interviewer workspace" title="Notifications" description="Requests, schedule changes, and reminders relevant to your interviews." action={<Button variant="secondary" onClick={() => setRead(interviewerNotifications.map(item => item.title))}>Mark all as read</Button>} /><section className="panel notification-panel interviewer-notifications"><div className="notification-filter"><button className="active">All</button><button>Unread <b>2</b></button><button>Interview requests</button><button>Calendar</button></div>{interviewerNotifications.map(item => <div className={`notification-item ${!read.includes(item.title) && item.unread ? 'unread' : ''}`} key={item.title}><span className={`notification-icon ${item.type}`}>{item.type === 'request' ? '▣' : item.type === 'change' ? '↻' : item.type === 'confirmed' ? '✓' : '✦'}</span><div><strong>{item.title}</strong><p>{item.text}</p><small>{item.time}</small></div>{!read.includes(item.title) && item.unread && <button className="read-dot" onClick={() => setRead([...read, item.title])} aria-label="Mark notification as read" />}</div>)}</section></>
}
