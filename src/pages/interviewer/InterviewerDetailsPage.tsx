import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getInterview } from '../../api/interviews'
import { Badge, Detail, PageHeader } from '../../components/common'

export function InterviewerDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [interview, setInterview] = useState<Awaited<ReturnType<typeof getInterview>> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!interviewId) return
    void getInterview(interviewId).then(setInterview).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load this interview.')
    })
  }, [interviewId])

  if (error) return <p role="alert" className="form-error">{error}</p>
  if (!interview) return <p>Loading interview...</p>
  const selectedSlot = interview.selectedSlot ? new Date(interview.selectedSlot) : null
  const endSlot = selectedSlot ? new Date(selectedSlot.getTime() + interview.durationMins * 60_000) : null

  return <><div className="back-link"><Link to="/interviewer/interviews">← Back to my interviews</Link></div><PageHeader eyebrow="Interview details" title={interview.application.candidate.name} description={`${interview.application.job.title} · ${interview.roundType}`} action={<Badge tone={interview.status === 'scheduled' ? 'success' : 'warning'}>{interview.status}</Badge>} /><section className="panel"><div className="interview-facts"><Detail label="Candidate email" value={interview.application.candidate.email} /><Detail label="Scheduled date" value={selectedSlot ? selectedSlot.toLocaleDateString() : 'Not scheduled'} /><Detail label="Time" value={selectedSlot && endSlot ? `${selectedSlot.toLocaleTimeString()} - ${endSlot.toLocaleTimeString()}` : 'Not scheduled'} /><Detail label="Duration" value={`${interview.durationMins} minutes`} /></div>{interview.meetLink && <p><a href={interview.meetLink}>Join meeting</a></p>}</section></>
}
