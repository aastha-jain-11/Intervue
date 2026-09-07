import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { listInterviews } from '../../api/interviews'
import { Badge, Button, PageHeader } from '../../components/common'

type Interview = Awaited<ReturnType<typeof listInterviews>>[number]

export function TAInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void listInterviews().then(setInterviews).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load interviews.')).finally(() => setLoading(false)) }, [])
  return <><PageHeader eyebrow="Talent acquisition" title="Interviews" description="Manage live interview requests and scheduled conversations." action={<Button to="/ta/interviews/create" icon="+">Create interview</Button>} /><section className="panel">{loading ? <p>Loading interviews...</p> : error ? <p role="alert" className="form-error">{error}</p> : interviews.length === 0 ? <p className="candidate-empty-state">No interviews have been created yet.</p> : <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Position</th><th>Round</th><th>Scheduled slot</th><th>Status</th><th /></tr></thead><tbody>{interviews.map(interview => <tr key={interview.id}><td><strong>{interview.application.candidate.name}</strong></td><td>{interview.application.job.title}</td><td>{interview.roundType}</td><td>{interview.selectedSlot ? new Date(interview.selectedSlot).toLocaleString() : 'Not scheduled'}</td><td><Badge tone={interview.status === 'scheduled' ? 'success' : 'warning'}>{interview.status}</Badge></td><td><Link className="button ghost" to={`/interviews/${interview.id}`}>View</Link></td></tr>)}</tbody></table></div>}</section></>
}
