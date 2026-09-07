import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createInterview, listApplications } from '../../api/interviews'
import { PageHeader } from '../../components/common'

type Application = Awaited<ReturnType<typeof listApplications>>[number]
const roundOptions = [['technical', 'Technical Interview'], ['managerial', 'Managerial Interview'], ['screening', 'Screening'], ['HR', 'HR Interview']] as const

export function InterviewSetupPage({ create = false }: { create?: boolean }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationId, setApplicationId] = useState('')
  const [roundType, setRoundType] = useState<'screening' | 'technical' | 'managerial' | 'HR'>('technical')
  const [durationMins, setDurationMins] = useState(60)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listApplications().then((items) => {
      setApplications(items)
      setApplicationId(items[0]?.id ?? '')
    }).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load applications.')
    }).finally(() => setLoading(false))
  }, [])

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!applicationId) { setError('No application is available for an interview.'); return }
    setSubmitting(true)
    setError('')
    try {
      const interview = await createInterview(applicationId, roundType, durationMins)
      navigate(`/ta/interviews/${interview.id}/slots`)
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to create the interview.')
    } finally { setSubmitting(false) }
  }

  return <>
    <div className="back-link"><Link to={create ? '/ta/interviews' : '/ta/candidates'}>← Back</Link></div>
    <PageHeader eyebrow="Interview workflow · Step 1 of 2" title={create ? 'Create interview' : 'Set up interview'} description="Configure the round and let the scheduler find a compatible slot." />
    <form className="panel setup-main" onSubmit={submitForm}>
      <div className="panel-head"><div><h2>Interview details</h2><p>Choose a real application and configure the conversation.</p></div></div>
      {loading ? <p>Loading applications...</p> : applications.length === 0 ? <p>No applications are available yet.</p> : <div className="form-grid">
        <label className="field full"><span>Application</span><select value={applicationId} onChange={event => setApplicationId(event.target.value)}>{applications.map(application => <option value={application.id} key={application.id}>{application.candidate.name} · {application.job.title}</option>)}</select></label>
        <label className="field"><span>Round type</span><select value={roundType} onChange={event => setRoundType(event.target.value as typeof roundType)}>{roundOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>Duration</span><select value={durationMins} onChange={event => setDurationMins(Number(event.target.value))}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option></select></label>
        <div className="full">{error && <p role="alert" className="form-error">{error}</p>}<button className="button" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Continue to scheduling'}</button></div>
      </div>}
    </form>
  </>
}
