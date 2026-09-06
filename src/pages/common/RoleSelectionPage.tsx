import { Link } from 'react-router-dom'

const roles = [
  { path: '/login/ta', label: 'Talent acquisition', title: 'Lead the hiring flow', description: 'Screen candidates, coordinate panels, and find the right time for every interview.', icon: '◎', accent: 'role-indigo' },
  { path: '/login/candidate', label: 'Candidate', title: 'Your next opportunity', description: 'Keep your interview details, schedule, and preparation journey in one place.', icon: '↗', accent: 'role-coral' },
  { path: '/login/interviewer', label: 'Interviewer', title: 'Make every conversation count', description: 'Review interview requests, share your availability, and meet great candidates.', icon: '◌', accent: 'role-green' },
]

export function RoleSelectionPage() { return <main className="role-selection"><div className="role-selection-top"><div className="brand"><span className="brand-mark">I</span><span>intervue</span></div><span className="role-help">Smart interview scheduling for modern teams</span></div><div className="role-selection-intro"><div className="eyebrow">Welcome to Intervue</div><h1>Where are you joining from?</h1><p>Choose your workspace to continue. You can switch roles any time by returning here.</p></div><div className="role-grid">{roles.map(role => <Link className={`role-card ${role.accent}`} to={role.path} key={role.path}><span className="role-icon">{role.icon}</span><span className="role-label">{role.label}</span><h2>{role.title}</h2><p>{role.description}</p><span className="role-cta">Continue <b>→</b></span></Link>)}</div><p className="role-footer">Intervue · One thoughtful workflow from shortlist to scheduled interview.</p></main> }
