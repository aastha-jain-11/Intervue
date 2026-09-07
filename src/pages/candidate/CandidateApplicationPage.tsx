import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { applyToJob } from '../../api/applications'
import { listJobs, type Job } from '../../api/jobs'
import { PageHeader } from '../../components/common'

export function CandidateApplicationPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void listJobs().then((items) => {
      setJobs(items)
      setSelectedJobId(items[0]?.id ?? '')
    }).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load open jobs.')
    }).finally(() => setLoading(false))
  }, [])

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedJobId) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await applyToJob(selectedJobId)
      setMessage('Application submitted successfully.')
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to submit application.')
    } finally { setSubmitting(false) }
  }

  return <><div className="back-link"><Link to="/candidate/dashboard">← Back to dashboard</Link></div><PageHeader eyebrow="Candidate portal" title="Apply for a role" description="Choose an open role from the live jobs API." /><section className="panel"><form className="form-grid" onSubmit={submitApplication}>{loading ? <p>Loading open jobs...</p> : jobs.length === 0 ? <p>No open jobs are available.</p> : <><label className="field full"><span>Open role</span><select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)}>{jobs.map(job => <option value={job.id} key={job.id}>{job.title}{job.department ? ` · ${job.department}` : ''}</option>)}</select></label><div className="full"><p>{jobs.find(job => job.id === selectedJobId)?.description || 'No description provided.'}</p><button className="button" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit application'}</button></div></>}{message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}</form></section></>
}
