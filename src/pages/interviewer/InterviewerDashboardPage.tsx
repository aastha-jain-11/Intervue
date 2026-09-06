import { Link } from 'react-router-dom'
import { candidates, interviews } from '../../data/demoData'
import { Badge, Button, CandidateAvatar, PageHeader } from '../../components/common'

export function InterviewerDashboardPage() {
	return <>
		<PageHeader eyebrow="Monday, September 7, 2026" title="Your interview day, at a glance" description="One pending request needs your attention." action={<Button to="/interviewer/calendar" variant="secondary">View calendar</Button>} />
		<div className="metric-grid four">
			{[['Pending requests', '3', 'Needs action', 'orange'], ['Upcoming interviews', '6', 'This week', 'blue'], ["Today's interviews", '1', 'Next at 2:00 PM', 'indigo'], ['Completed', '24', 'This quarter', 'green']].map(([label, value, change, color]) => <div className="metric-card" key={label}><div className={`metric-icon ${color}`}>◈</div><div className="metric-label">{label}<span className="positive">{change}</span></div><strong>{value}</strong></div>)}
		</div>
		<div className="dashboard-grid interviewer-grid">
			<section className="panel request-panel"><div className="panel-head"><div><h2>Pending requests</h2><p>Review proposed times from the talent team</p></div><Badge tone="warning">3 awaiting</Badge></div><div className="request-card"><div className="request-heading"><CandidateAvatar candidate={candidates[0]} /><div><strong>Rahul Sharma</strong><span>Software Engineer · Technical Interview</span></div><Badge tone="ai">96% match</Badge></div><div className="proposed-time"><span>Proposed time</span><strong>Wed, Sep 10, 2026</strong><b>2:00 - 3:00 PM IST</b></div><Button to="/interviewer/interviews/interview-1">Review request</Button></div></section>
			<section className="panel"><div className="panel-head"><div><h2>Upcoming interviews</h2><p>Your next conversations</p></div><Link className="text-link" to="/interviewer/interviews">View all →</Link></div>{interviews.slice(0, 3).map(item => <Link to={`/interviewer/interviews/${item.id}`} className="upcoming-item" key={item.id}><div className="date-tile"><strong>10</strong><span>SEP</span></div><div><strong>{item.candidate}</strong><span>{item.round}</span></div><div className="upcoming-time"><strong>{item.time.split(' IST')[0]}</strong><span>{item.status}</span></div></Link>)}</section>
		</div>
	</>
}
