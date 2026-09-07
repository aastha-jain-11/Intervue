import { request } from './client'

type Application = {
  id: string
  candidate: { id: string; name: string; email: string }
  job: { title: string }
}

type Interview = {
  id: string
  status: string
  durationMins: number
  selectedSlot: string | null
  selectedInterviewer: { id: string; name: string; email: string } | null
  application: Application
  matches: Array<{ interviewerId: string; matchScore: number; rank: number }>
  slotRecommendations: Array<{ slot: string; priorityScore: number; rank: number }>
  requests: Array<{ id: string; status: string; slot: string }>
}
export type AvailabilityRecommendation = { interviewerId: string; interviewerName: string; startUtc: string; endUtc: string; durationMins: number; reason: string; candidateAvailability: { startUtc: string; endUtc: string }; interviewerAvailability: { startUtc: string; endUtc: string } }

type ApplicationsResponse = { success: boolean; data: { applications: Application[] } }
type InterviewResponse = { success: boolean; data: { interview: Interview } }
type InterviewsResponse = { success: boolean; data: { interviews: Interview[] } }
type AutoScheduleResponse = { success: boolean; data: { interview: Interview; matchScore: number; notificationSent: boolean } }

export async function listApplications(): Promise<Application[]> {
  const response = await request<ApplicationsResponse>('/api/applications')
  return response.data.applications
}

export async function createInterview(applicationId: string, roundType: 'screening' | 'technical' | 'managerial' | 'HR', durationMins: number): Promise<Interview> {
  const response = await request<InterviewResponse>(`/api/applications/${applicationId}/interviews`, {
    method: 'POST',
    body: JSON.stringify({ roundType, durationMins }),
  })
  return response.data.interview
}

export async function getInterview(interviewId: string): Promise<Interview> {
  const response = await request<InterviewResponse>(`/api/interviews/${interviewId}`)
  return response.data.interview
}

export async function listInterviews(): Promise<Interview[]> {
  const response = await request<InterviewsResponse>('/api/interviews')
  return response.data.interviews
}

export async function autoScheduleInterview(interviewId: string): Promise<AutoScheduleResponse['data']> {
  const response = await request<AutoScheduleResponse>(`/api/interviews/${interviewId}/auto-schedule`, { method: 'POST' })
  return response.data
}
export async function getSlotRecommendations(interviewId: string): Promise<AvailabilityRecommendation[]> { const response = await request<{ success: boolean; data: { recommendations: AvailabilityRecommendation[] } }>(`/api/interviews/${interviewId}/slot-recommendations`); return response.data.recommendations }
export async function proposeInterview(interviewId: string, interviewerId: string, selectedSlot: string): Promise<Interview> { const response = await request<InterviewResponse>(`/api/interviews/${interviewId}/proposal`, { method: 'POST', body: JSON.stringify({ interviewerId, selectedSlot }) }); return response.data.interview }
export async function acceptInterview(interviewId: string): Promise<Interview> { const response = await request<InterviewResponse>(`/api/interviews/${interviewId}/accept`, { method: 'POST' }); return response.data.interview }
export async function rejectInterview(interviewId: string): Promise<Interview> { const response = await request<InterviewResponse>(`/api/interviews/${interviewId}/reject`, { method: 'POST' }); return response.data.interview }
