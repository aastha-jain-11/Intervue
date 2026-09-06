const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const TOKEN_STORAGE_KEY = 'intervue_access_token'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function storeToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getApiBaseUrl(): string {
  return API_BASE_URL
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getStoredToken()

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, 'Unable to connect to the Intervue server.')
  }

  const payload = await response.json().catch(() => null) as {
    error?: { code?: string; message?: string }
  } | null

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(response.status, payload?.error?.message),
      payload?.error?.code,
    )
  }

  return payload as T
}

function getErrorMessage(status: number, backendMessage?: string): string {
  if (status === 400) return backendMessage || 'Please check the information you entered.'
  if (status === 401) return 'Invalid email or password.'
  if (status === 403) return 'You do not have permission to access this area.'
  if (status === 409) return backendMessage || 'An account with this email already exists.'
  return status >= 500 ? 'The Intervue server is unavailable right now.' : backendMessage || 'Something went wrong.'
}
