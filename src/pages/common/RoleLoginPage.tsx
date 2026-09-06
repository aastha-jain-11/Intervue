import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common'

type Role = 'ta' | 'candidate' | 'interviewer'

type RoleContent = {
  eyebrow: string
  title: string
  description: string
  destination: string
  email: string
}

const roleContent: Record<Role, RoleContent> = {
  ta: { eyebrow: 'Talent acquisition', title: 'Sign in to your hiring workspace', description: 'Review candidates, build interview panels, and keep hiring moving.', destination: '/ta/dashboard', email: 'aarav@acme.com' },
  candidate: { eyebrow: 'Candidate portal', title: 'Continue your interview journey', description: 'View interview details, preparation notes, and upcoming conversations.', destination: '/candidate/dashboard', email: 'rahul.sharma@email.com' },
  interviewer: { eyebrow: 'Interviewer workspace', title: 'Make every conversation count', description: 'Review requests, manage availability, and meet your next candidate.', destination: '/interviewer/dashboard', email: 'rahul.mehta@acme.com' },
}

export function RoleLoginPage({ role }: { role: Role }) {
  const navigate = useNavigate()
  const content = roleContent[role]
  const isCandidate = role === 'candidate'

  return <div className="login-page">
    <div className="login-visual"><Link className="brand light" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><div className="login-quote"><span>“</span><h1>Great interviews start with the right conversation.</h1><p>One intelligent workspace for every step between shortlist and offer.</p></div><small>Trusted by teams building what is next.</small></div>
    <div className="login-form-wrap"><div className="login-form"><Link className="mobile-brand brand" to="/" aria-label="Go to Intervue home"><span className="brand-mark">I</span><span>intervue</span></Link><button className="login-back" onClick={() => navigate('/')}>← Choose another role</button><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.description}</p><label className="field"><span>Work email</span><input type="email" defaultValue={content.email}/></label><label className="field"><span>Password</span><input type="password" defaultValue="password"/></label><div className="login-options"><label><input type="checkbox" defaultChecked/> Remember me</label><a href="#forgot">Forgot password?</a></div><Button onClick={() => navigate(content.destination)}>Sign in</Button><div className="or"><span>or</span></div><Button variant="sso">◎ Continue with SSO</Button>{isCandidate && <p className="auth-switch">New to Intervue? <Link to="/signup/candidate">Create a candidate account</Link></p>}<small className="terms">By continuing, you agree to Intervue's Terms of Service and Privacy Policy.</small></div></div>
  </div>
}
