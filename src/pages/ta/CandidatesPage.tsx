import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getApplication, listApplications, type Application } from '../../api/applications'
import { Button, PageHeader } from '../../components/common'

export function CandidatesPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void listApplications().then(setApplications).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load applications.')).finally(() => setLoading(false)) }, [])
  return <><PageHeader eyebrow="Talent acquisition" title="Candidates" description="Candidates from live applications." action={<Button to="/ta/interviews/create" icon="+">Create interview</Button>} /><section className="panel">{loading ? <p>Loading applications...</p> : error ? <p role="alert" className="form-error">{error}</p> : applications.length === 0 ? <p className="candidate-empty-state">No applications yet.</p> : <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Email</th><th>Position</th><th>Status</th><th /></tr></thead><tbody>{applications.map(application => <tr key={application.id}><td><strong>{application.candidate.name}</strong></td><td>{application.candidate.email}</td><td>{application.job.title}</td><td>{application.status}</td><td><Link className="button ghost" to={`/ta/candidates/${application.id}`}>View</Link></td></tr>)}</tbody></table></div>}</section></>
}

export function CandidateProfilePage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const [application, setApplication] = useState<Application | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { if (candidateId) void getApplication(candidateId).then(setApplication).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load application.')) }, [candidateId])
  if (error) return <p role="alert" className="form-error">{error}</p>
  if (!application) return <p>Loading application...</p>
  return <><div className="back-link"><Link to="/ta/candidates">← Back to candidates</Link></div><PageHeader eyebrow="Candidate application" title={application.candidate.name} description={application.job.title} action={<Button to={`/ta/candidates/${application.id}/setup-interview`}>Set up interview</Button>} /><section className="panel"><div className="detail-grid"><div className="detail"><span>Email</span><strong>{application.candidate.email}</strong></div><div className="detail"><span>Application status</span><strong>{application.status}</strong></div><div className="detail"><span>Screening status</span><strong>{application.screeningStatus}</strong></div><div className="detail"><span>Job</span><strong>{application.job.title}</strong></div></div></section></>
}
