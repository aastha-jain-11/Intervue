import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { autoScheduleInterview, getInterview } from '../../api/interviews'
import { PageHeader } from '../../components/common'

export function SlotRecommendationsPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [interview, setInterview] = useState<Awaited<ReturnType<typeof getInterview>> | null>(null)
  const [notificationSent, setNotificationSent] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!interviewId) return
    void getInterview(interviewId).then(setInterview).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load the interview.')
    }).finally(() => setLoading(false))
  }, [interviewId])

  async function autoSchedule() {
    if (!interviewId) return
    setScheduling(true)
    setError('')
    try {
      const result = await autoScheduleInterview(interviewId)
      setInterview(result.interview)
      setNotificationSent(result.notificationSent)
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to schedule the interview.')
    } finally { setScheduling(false) }
  }

  if (loading) return <p>Loading interview...</p>
  return <>
    <div className="back-link"><Link to="/ta/interviews/create">← Back to setup</Link></div>
    <PageHeader eyebrow="Interview workflow · Step 2 of 2" title="Automatic scheduling" description="The scheduler checks candidate and interviewer availability before booking." />
    <section className="panel">
      {interview && <><h2>{interview.application.candidate.name} · {interview.application.job.title}</h2><p>Status: {interview.status}</p>{interview.selectedSlot && <p>Booked slot: {new Date(interview.selectedSlot).toLocaleString()}</p>}{interview.selectedInterviewer && <p>Interviewer: {interview.selectedInterviewer.name}</p>}<button className="button" type="button" onClick={() => void autoSchedule()} disabled={scheduling || interview.status === 'scheduled'}>{scheduling ? 'Finding a compatible slot...' : interview.status === 'scheduled' ? 'Interview scheduled' : 'Auto-schedule interview'}</button>{notificationSent !== null && <p role="status">Notification: {notificationSent ? 'sent' : 'booking succeeded, notification failed'}</p>}</>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
  </>
}
