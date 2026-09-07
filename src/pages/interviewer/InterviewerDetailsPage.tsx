import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { acceptInterview, getInterview, rejectInterview } from '../../api/interviews'
import { Badge, Detail, PageHeader } from '../../components/common'

export function InterviewerDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [interview, setInterview] = useState<Awaited<ReturnType<typeof getInterview>> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!interviewId) return
    void getInterview(interviewId).then(setInterview).catch((caughtError) => {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load this interview.')
    })
  }, [interviewId])
  async function respond(action: 'accept' | 'reject') { if (!interviewId) return; setSaving(true); setError(''); try { setInterview(action === 'accept' ? await acceptInterview(interviewId) : await rejectInterview(interviewId)) } catch (caughtError) { setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to respond to request.') } finally { setSaving(false) } }

  if (error) return <p role="alert" className="form-error">{error}</p>
  if (!interview) return <p>Loading interview...</p>
  const selectedSlot = interview.selectedSlot ? new Date(interview.selectedSlot) : null
  const endSlot = selectedSlot ? new Date(selectedSlot.getTime() + interview.durationMins * 60_000) : null

  return <><div className="back-link"><Link to="/interviewer/interviews">← Back to my interviews</Link></div><PageHeader eyebrow={interview.status === 'interviewer_requested' ? 'Interview request' : 'Interview details'} title={interview.application.candidate.name} description={`${interview.application.job.title} · ${interview.roundType}`} action={<Badge tone={interview.status === 'scheduled' ? 'success' : 'warning'}>{interview.status}</Badge>} /><section className="panel"><div className="interview-facts"><Detail label="Candidate email" value={interview.application.candidate.email} /><Detail label="Proposed date" value={selectedSlot ? selectedSlot.toLocaleDateString() : 'Not scheduled'} /><Detail label="Time" value={selectedSlot && endSlot ? `${selectedSlot.toLocaleTimeString()} - ${endSlot.toLocaleTimeString()} UTC` : 'Not scheduled'} /><Detail label="Reason" value="Common availability found for candidate and interviewer." /><Detail label="Duration" value={`${interview.durationMins} minutes`} /></div>{interview.status === 'interviewer_requested' && <p><button className="button" disabled={saving} onClick={() => void respond('accept')}>Accept</button> <button className="button ghost" disabled={saving} onClick={() => void respond('reject')}>Reject</button></p>}{interview.meetLink && <p><a href={interview.meetLink}>Join meeting</a></p>}</section></>
}
