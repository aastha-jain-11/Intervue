import { PageHeader } from '../../components/common'

export function NotificationsPage() {
  return <><PageHeader eyebrow="Workspace" title="Notifications" description="Notification history will appear here when recipient events are exposed by the API." /><section className="panel"><p className="candidate-empty-state">No notification records are available from the current API.</p></section></>
}

export function NotFoundPage() {
  return <><PageHeader eyebrow="Workspace" title="Page not found" description="The requested page does not exist." /></>
}
