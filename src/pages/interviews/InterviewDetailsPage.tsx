import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getInterview } from '../../api/interviews'
import { Badge, Detail, PageHeader } from '../../components/common'

export function InterviewDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [interview, setInterview] = useState<Awaited<ReturnType<typeof getInterview>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { if (interviewId) void getInterview(interviewId).then(setInterview).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load interview.')) }, [interviewId])
  if (error) return <p role="alert" className="form-error">{error}</p>
  if (!interview) return <p>Loading interview...</p>
  const start = interview.selectedSlot ? new Date(interview.selectedSlot) : null
  const end = start ? new Date(start.getTime() + interview.durationMins * 60_000) : null
  return <><div className="back-link"><Link to="/candidate/interviews">← Back to interviews</Link></div><PageHeader eyebrow="Interview details" title={interview.application.job.title} description={`${interview.roundType} interview with ${interview.selectedInterviewer?.name || 'an interviewer'}`} action={<Badge tone={interview.status === 'scheduled' ? 'success' : 'warning'}>{interview.status}</Badge>} /><section className="panel"><div className="confirmed-facts"><Detail label="Candidate" value={interview.application.candidate.name} /><Detail label="Interviewer" value={interview.selectedInterviewer?.name || 'Not selected'} /><Detail label="Date" value={start ? start.toLocaleDateString() : 'Not scheduled'} /><Detail label="Time" value={start && end ? `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}` : 'Not scheduled'} /><Detail label="Duration" value={`${interview.durationMins} minutes`} /></div>{interview.meetLink && <p><a href={interview.meetLink}>Join meeting</a></p>}</section></>
}
