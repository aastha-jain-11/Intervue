import { useState } from 'react'
import { interviews } from '../../data/demoData'
import { Button, PageHeader } from '../../components/common'

export function InterviewerInterviewsPage() {
	const [filter, setFilter] = useState<'pending' | 'upcoming' | 'completed'>('pending')
	const pending = interviews.filter(item => item.status === 'Awaiting interviewer' || item.status === 'Pending')
	const upcoming = interviews.filter(item => item.status === 'Scheduled')
	const completed = interviews.filter(item => item.status === 'Completed')
	const visibleInterviews = filter === 'pending' ? pending : filter === 'upcoming' ? upcoming : completed

	return <><PageHeader eyebrow="Interviewer workspace" title="My interviews" description="Requests, upcoming conversations, and completed interviews." /><div className="page-tabs"><button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending requests <b>{pending.length}</b></button><button className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>Upcoming <b>{upcoming.length}</b></button><button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed <b>{completed.length}</b></button></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Round</th><th>Proposed slot</th><th>Scheduling score</th><th>Action</th></tr></thead><tbody>{visibleInterviews.length > 0 ? visibleInterviews.map(item => <tr key={item.id}><td><strong>{item.candidate}</strong><small className="table-sub">{item.role}</small></td><td>{item.round}</td><td><strong>{item.date}</strong><small className="table-sub">{item.time}</small></td><td><span className="match-text">{item.score}%</span></td><td><Button to={`/interviewer/interviews/${item.id}`}>{filter === 'pending' ? 'Review request' : 'View'}</Button></td></tr>) : <tr><td colSpan={5}><p className="candidate-empty-state">No interviews in this view yet.</p></td></tr>}</tbody></table></div></section></>
}
