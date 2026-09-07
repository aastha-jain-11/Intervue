import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { listInterviews } from '../../api/interviews'
import { PageHeader } from '../../components/common'

type Interview = Awaited<ReturnType<typeof listInterviews>>[number]

export function InterviewerInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void listInterviews().then(setInterviews).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load interviews.')
    }).finally(() => setLoading(false))
  }, [])

  return <>
    <PageHeader eyebrow="Interviewer workspace" title="My interviews" description="Interviews assigned to your authenticated interviewer account." />
    <section className="panel">
      {loading ? <p>Loading interviews...</p> : error ? <p role="alert" className="form-error">{error}</p> : interviews.length === 0 ? <p className="candidate-empty-state">No interviews have been assigned to you yet.</p> : <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Role</th><th>Status</th><th>Scheduled slot</th><th /></tr></thead><tbody>{interviews.map(interview => <tr key={interview.id}><td><strong>{interview.application.candidate.name}</strong><small className="table-sub">{interview.application.candidate.email}</small></td><td>{interview.application.job.title}</td><td>{interview.status}</td><td>{interview.selectedSlot ? new Date(interview.selectedSlot).toLocaleString() : 'Not scheduled'}</td><td><Link className="button ghost" to={`/interviewer/interviews/${interview.id}`}>View</Link></td></tr>)}</tbody></table></div>}
    </section>
  </>
}
