import { request } from './client'

type Availability = {
  id: string
  startUtc: string
  endUtc: string
  status: string
  createdAt: string
  updatedAt: string
}

type AvailabilityResponse = { success: boolean; data: { availability: Availability } }
type AvailabilityListResponse = { success: boolean; data: { availability: Availability[] } }
type DeleteResponse = { success: boolean; data: { message: string } }

export async function listInterviewerAvailability(): Promise<Availability[]> {
  const response = await request<AvailabilityListResponse>('/api/interviewers/me/availability')
  return response.data.availability
}

export async function createInterviewerAvailability(startUtc: string, endUtc: string): Promise<Availability> {
  const response = await request<AvailabilityResponse>('/api/interviewers/me/availability', {
    method: 'POST',
    body: JSON.stringify({ startUtc, endUtc }),
  })
  return response.data.availability
}

export async function updateInterviewerAvailability(slotId: string, startUtc: string, endUtc: string): Promise<Availability> {
  const response = await request<AvailabilityResponse>(`/api/interviewers/me/availability/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify({ startUtc, endUtc }),
  })
  return response.data.availability
}

export async function deleteInterviewerAvailability(slotId: string): Promise<void> {
  await request<DeleteResponse>(`/api/interviewers/me/availability/${slotId}`, { method: 'DELETE' })
}
