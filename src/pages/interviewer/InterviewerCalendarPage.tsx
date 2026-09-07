import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { createInterviewerAvailability, deleteInterviewerAvailability, listInterviewerAvailability, updateInterviewerAvailability } from '../../api/interviewers'
import { PageHeader } from '../../components/common'

type Availability = Awaited<ReturnType<typeof listInterviewerAvailability>>[number]

function toLocalInput(value: string): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toUtc(value: string): string {
  return new Date(value).toISOString()
}

export function InterviewerCalendarPage() {
  const [availability, setAvailability] = useState<Availability[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function refresh() {
    setLoading(true)
    try {
      setAvailability(await listInterviewerAvailability())
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to load availability.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  function resetForm() {
    setStart('')
    setEnd('')
    setEditingId(null)
  }

  function editSlot(slot: Availability) {
    setEditingId(slot.id)
    setStart(toLocalInput(slot.startUtc))
    setEnd(toLocalInput(slot.endUtc))
    setError('')
    setSuccess('')
  }

  async function saveSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (editingId) await updateInterviewerAvailability(editingId, toUtc(start), toUtc(end))
      else await createInterviewerAvailability(toUtc(start), toUtc(end))
      resetForm()
      setSuccess('Availability saved.')
      await refresh()
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to save availability.')
    } finally { setSaving(false) }
  }

  async function removeSlot(slotId: string) {
    setError('')
    setSuccess('')
    try {
      await deleteInterviewerAvailability(slotId)
      if (editingId === slotId) resetForm()
      setSuccess('Availability deleted.')
      await refresh()
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to delete availability.')
    }
  }

  return <>
    <PageHeader eyebrow="Interviewer workspace" title="Calendar" description="Manage the availability that automatic scheduling uses." />
    <section className="panel">
      <div className="panel-head"><div><h2>{editingId ? 'Edit availability' : 'Add availability'}</h2><p>Times are sent to the server as UTC.</p></div></div>
      <form className="form-grid" onSubmit={saveSlot}>
        <label className="field"><span>Starts</span><input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} required /></label>
        <label className="field"><span>Ends</span><input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} required /></label>
        <div className="full"><button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add availability'}</button>{editingId && <button className="button secondary" type="button" onClick={resetForm}>Cancel</button>}</div>
      </form>
      {success && <p role="status">{success}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2>Your availability</h2><p>These slots are considered by auto-scheduling.</p></div></div>
      {loading ? <p>Loading availability...</p> : availability.length === 0 ? <p>No availability added yet.</p> : <div className="table-wrap"><table><thead><tr><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead><tbody>{availability.map(slot => <tr key={slot.id}><td>{new Date(slot.startUtc).toLocaleString()}</td><td>{new Date(slot.endUtc).toLocaleString()}</td><td>{slot.status}</td><td><button className="button ghost" type="button" onClick={() => editSlot(slot)}>Edit</button><button className="button ghost" type="button" onClick={() => void removeSlot(slot.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
  </>
}
