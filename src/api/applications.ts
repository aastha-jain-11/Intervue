import { request } from './client'
import type { Job } from './jobs'

export type Application = {
  id: string
  status: string
  screeningStatus: string
  candidate: { id: string; name: string; email: string }
  job: Job
}

type ApplicationsResponse = { success: boolean; data: { applications: Application[] } }
type ApplicationResponse = { success: boolean; data: { application: Application } }

export async function listApplications(): Promise<Application[]> {
  const response = await request<ApplicationsResponse>('/api/applications')
  return response.data.applications
}

export async function applyToJob(jobId: string): Promise<Application> {
  const response = await request<ApplicationResponse>(`/api/jobs/${jobId}/applications`, { method: 'POST', body: JSON.stringify({}) })
  return response.data.application
}

export async function getApplication(applicationId: string): Promise<Application> {
  const response = await request<ApplicationResponse>(`/api/applications/${applicationId}`)
  return response.data.application
}
