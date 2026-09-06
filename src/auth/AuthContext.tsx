import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { clearStoredToken } from '../api/client'
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/auth'
import type { AuthCredentials, AuthenticatedUser, RegisterInput } from '../types/auth'

type AuthContextValue = {
  user: AuthenticatedUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (credentials: AuthCredentials) => Promise<AuthenticatedUser>
  register: (input: RegisterInput) => Promise<AuthenticatedUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthenticatedUser | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void refreshUser()
  }, [])

  async function refreshUser(): Promise<AuthenticatedUser | null> {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      clearStoredToken()
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function login(credentials: AuthCredentials): Promise<AuthenticatedUser> {
    const authenticatedUser = await loginRequest(credentials)
    setUser(authenticatedUser)
    return authenticatedUser
  }

  async function register(input: RegisterInput): Promise<AuthenticatedUser> {
    await registerRequest(input)
    return login({ email: input.email, password: input.password })
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: user !== null, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
