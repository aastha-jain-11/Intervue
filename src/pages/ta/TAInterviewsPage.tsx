import { useState } from 'react'
import { interviews } from '../../data/demoData'
import { Badge, Button, PageHeader, SearchControls } from '../../components/common'

export function TAInterviewsPage() {
	const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'completed'>('all')
	const pending = interviews.filter(item => item.status === 'Awaiting interviewer' || item.status === 'Pending')
	const scheduled = interviews.filter(item => item.status === 'Scheduled')
	const completed = interviews.filter(item => item.status === 'Completed')
	const visibleInterviews = filter === 'pending' ? pending : filter === 'scheduled' ? scheduled : filter === 'completed' ? completed : interviews

	return <><PageHeader eyebrow="Talent acquisition" title="Interviews" description="Manage every interview request and scheduled conversation." action={<Button to="/ta/interviews/create" icon="+">Create interview</Button>}/><div className="page-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <b>{interviews.length}</b></button><button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending <b>{pending.length}</b></button><button className={filter === 'scheduled' ? 'active' : ''} onClick={() => setFilter('scheduled')}>Scheduled <b>{scheduled.length}</b></button><button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed <b>{completed.length}</b></button></div><section className="panel"><SearchControls placeholder="Search interviews..."/><div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Position</th><th>Round</th><th>Interviewers</th><th>Date & time</th><th>Status</th><th/></tr></thead><tbody>{visibleInterviews.length > 0 ? visibleInterviews.map(interview => <tr key={interview.id}><td><strong>{interview.candidate}</strong></td><td>{interview.role}</td><td>{interview.round}</td><td>{interview.interviewers}</td><td><strong>{interview.date}</strong><small className="table-sub">{interview.time}</small></td><td><Badge tone={interview.status === 'Scheduled' ? 'success' : interview.status === 'Completed' ? 'neutral' : 'warning'}>{interview.status}</Badge></td><td><Button variant="ghost" to={`/interviewer/interviews/${interview.id}`}>View</Button></td></tr>) : <tr><td colSpan={7}><p className="candidate-empty-state">No interviews in this view yet.</p></td></tr>}</tbody></table></div></section></>
}
