import { interviews } from '../../data/demoData'
import { Button, PageHeader } from '../../components/common'

export function InterviewerInterviewsPage() {
	return <><PageHeader eyebrow="Interviewer workspace" title="My interviews" description="Requests, upcoming conversations, and completed interviews." /><div className="page-tabs"><button className="active">Pending requests <b>3</b></button><button>Upcoming <b>6</b></button><button>Completed <b>24</b></button></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Round</th><th>Proposed slot</th><th>Scheduling score</th><th>Action</th></tr></thead><tbody>{interviews.slice(0, 3).map((item, index) => <tr key={item.id}><td><strong>{item.candidate}</strong><small className="table-sub">{item.role}</small></td><td>{item.round}</td><td><strong>{item.date}</strong><small className="table-sub">{item.time}</small></td><td><span className="match-text">{item.score}%</span></td><td><Button to={`/interviewer/interviews/${item.id}`}>{index === 0 ? 'Review request' : 'View'}</Button></td></tr>)}</tbody></table></div></section></>
}
