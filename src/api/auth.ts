import { getApiBaseUrl, request, storeToken, clearStoredToken } from './client'
import type { AuthenticatedUser, AuthCredentials, RegisterInput } from '../types/auth'

type UserResponse = {
  success: boolean
  data: { user: AuthenticatedUser }
}

type LoginResponse = UserResponse & {
  data: { token: string; user: AuthenticatedUser }
}

type RegisterResponse = UserResponse

type LogoutResponse = {
  success: boolean
  data: { message: string }
}

export async function login(credentials: AuthCredentials): Promise<AuthenticatedUser> {
  const response = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  storeToken(response.data.token)
  return response.data.user
}

export async function register(input: RegisterInput): Promise<AuthenticatedUser> {
  const response = await request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data.user
}

export async function logout(): Promise<void> {
  try {
    await request<LogoutResponse>('/auth/logout', { method: 'POST' })
  } finally {
    clearStoredToken()
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await request<UserResponse>('/users/me')
  return response.data.user
}

export function startGoogleLogin(): void {
  window.location.href = `${getApiBaseUrl()}/auth/google`
}
