export type UserRole = 'candidate' | 'interviewer' | 'ta_admin'

export type AuthenticatedUser = {
  id: string
  name: string
  email: string
  role: UserRole
  timezone: string
  isActive: boolean
  createdAt: string
}

export type AuthCredentials = {
  email: string
  password: string
}

export type RegisterInput = AuthCredentials & {
  name: string
  role: 'candidate' | 'interviewer'
}
