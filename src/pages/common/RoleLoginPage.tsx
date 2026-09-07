import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { startGoogleLogin } from '../../api/auth'
import { useAuth } from '../../auth/AuthContext'

type Role = 'ta' | 'candidate' | 'interviewer'
type BackendRole = 'ta_admin' | 'candidate' | 'interviewer'

type RoleContent = {
  eyebrow: string
  title: string
  description: string
  destinationRole: BackendRole
  email: string
}

const roleContent: Record<Role, RoleContent> = {
  ta: { eyebrow: 'Talent acquisition', title: 'Sign in to your hiring workspace', description: 'Review candidates, build interview panels, and keep hiring moving.', destinationRole: 'ta_admin', email: '' },
  candidate: { eyebrow: 'Candidate portal', title: 'Continue your interview journey', description: 'View interview details, preparation notes, and upcoming conversations.', destinationRole: 'candidate', email: '' },
  interviewer: { eyebrow: 'Interviewer workspace', title: 'Make every conversation count', description: 'Review requests, manage availability, and meet your next candidate.', destinationRole: 'interviewer', email: '' },
}

const roleLabelByRole: Record<BackendRole, string> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
  ta_admin: 'Talent Acquisition',
}

export function RoleLoginPage({ role }: { role: Role }) {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
  const content = roleContent[role]
  const isCandidate = role === 'candidate'
  const googleRole = role === 'ta' ? undefined : role
  const [email, setEmail] = useState(content.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const user = await login({ email, password })
      if (user.role !== content.destinationRole) {
        try {
          await logout()
        } catch {
          // Logout still clears local auth state even if the backend is unavailable.
        }
        setError(`This account is registered as ${roleLabelByRole[user.role]}. Please use the ${roleLabelByRole[user.role]} login.`)
        return
      }
      navigate(user.role === 'ta_admin' ? '/ta/dashboard' : user.role === 'interviewer' ? '/interviewer/dashboard' : '/candidate/dashboard', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to sign in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="login-page">
    <div className="login-visual"><Link className="brand light" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><div className="login-quote"><span>“</span><h1>Great interviews start with the right conversation.</h1><p>One intelligent workspace for every step between shortlist and offer.</p></div><small>Trusted by teams building what is next.</small></div>
    <div className="login-form-wrap"><form className="login-form" onSubmit={handleSubmit}><Link className="mobile-brand brand" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><button type="button" className="login-back" onClick={() => navigate('/')}>← Choose another role</button><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.description}</p><label className="field"><span>Work email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label className="field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><div className="login-options"><label><input type="checkbox" defaultChecked/> Remember me</label><a href="#forgot">Forgot password?</a></div>{error && <p role="alert" className="form-error">{error}</p>}<button className="button" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button><div className="or"><span>or</span></div><button className="button sso" type="button" onClick={() => startGoogleLogin(googleRole)}>◎ Continue with Google</button>{isCandidate && <p className="auth-switch">New to Intervue? <Link to="/signup/candidate">Create a candidate account</Link></p>}<small className="terms">By continuing, you agree to Intervue's Terms of Service and Privacy Policy.</small></form></div>
  </div>
}
