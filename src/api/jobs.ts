import { request } from './client'

export type Job = {
  id: string
  title: string
  description: string | null
  department: string | null
  location: string | null
  requiredSkills: string[]
  status: string
  createdAt: string
}

type JobsResponse = { success: boolean; data: { jobs: Job[] } }

export async function listJobs(): Promise<Job[]> {
  const response = await request<JobsResponse>('/api/jobs?status=open')
  return response.data.jobs
}
