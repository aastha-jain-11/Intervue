import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { startGoogleLogin } from '../../api/auth'
import { useAuth } from '../../auth/AuthContext'

export function CandidateSignupPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register({ name, email, password, role: 'candidate' })
      navigate('/candidate/dashboard', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Unable to create your account right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="login-page"><div className="login-visual"><Link className="brand light" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><div className="login-quote"><span>“</span><h1>Put your next opportunity in motion.</h1><p>Create your candidate profile and keep every interview detail close at hand.</p></div><small>One clear place for your interview journey.</small></div><div className="login-form-wrap"><form className="login-form" onSubmit={handleSubmit}><Link className="mobile-brand brand" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><Link className="login-back" to="/login/candidate">← Back to candidate login</Link><div className="eyebrow">Candidate portal</div><h1>Create your candidate account</h1><p>Set up your profile to view interviews and stay in sync with your hiring journey.</p><div className="signup-fields"><label className="field"><span>Full name</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required /></label><label className="field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" autoComplete="new-password" required /></label><label className="field"><span>Confirm password</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required /></label></div><label className="signup-consent"><input type="checkbox" defaultChecked required /> I agree to the Terms of Service and Privacy Policy.</label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create candidate account'}</button><button className="button sso" type="button" onClick={startGoogleLogin}>◎ Continue with Google</button><p className="auth-switch">Already have an account? <Link to="/login/candidate">Sign in</Link></p></form></div></div>
}
