import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { listInterviews } from '../../api/interviews'
import { PageHeader } from '../../components/common'

type Interview = Awaited<ReturnType<typeof listInterviews>>[number]

export function TACalendarPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void listInterviews().then(setInterviews).catch((caughtError) => setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load calendar.')).finally(() => setLoading(false)) }, [])
  return <><PageHeader eyebrow="Talent acquisition" title="Calendar" description="Scheduled interviews from live backend records." /><section className="panel">{loading ? <p>Loading calendar...</p> : error ? <p role="alert" className="form-error">{error}</p> : interviews.filter(item => item.selectedSlot).length === 0 ? <p className="candidate-empty-state">No scheduled interviews yet.</p> : interviews.filter(item => item.selectedSlot).map(interview => <div className="candidate-interview-row" key={interview.id}><div><strong>{interview.application.candidate.name}</strong><span>{interview.application.job.title} · {interview.roundType}</span></div><div><strong>{new Date(interview.selectedSlot as string).toLocaleString()}</strong><span>{interview.selectedInterviewer?.name || 'Interviewer not selected'}</span></div></div>)}</section></>
}
