import { PageHeader } from '../../components/common'

export function InterviewerNotificationsPage() {
  return <><PageHeader eyebrow="Interviewer workspace" title="Notifications" description="Notification history will appear here when recipient events are exposed by the API." /><section className="panel"><p className="candidate-empty-state">No notification records are available from the current API.</p></section></>
}
