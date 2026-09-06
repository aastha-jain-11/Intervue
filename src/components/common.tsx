import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Candidate } from '../types'

export function Button({ children, variant = 'primary', onClick, to, icon }: { children: ReactNode; variant?: string; onClick?: () => void; to?: string; icon?: string }) {
  const content = <>{icon && <span>{icon}</span>}{children}</>
  return to ? <Link className={`button ${variant}`} to={to}>{content}</Link> : <button className={`button ${variant}`} onClick={onClick}>{content}</button>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span> }

export function CandidateAvatar({ candidate, large = false }: { candidate: Candidate; large?: boolean }) { return <div className={`avatar ${large ? 'avatar-large' : ''} ${candidate.id === 'candidate-1' ? 'avatar-coral' : 'avatar-indigo'}`}>{candidate.initials}</div> }

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</div> }

export function Detail({ label, value }: { label: string; value: string }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div> }

export function SearchControls({ placeholder = 'Search candidates...' }: { placeholder?: string }) { return <div className="controls"><label className="search"><span>⌕</span><input placeholder={placeholder} /></label><select defaultValue="all" aria-label="Filter status"><option value="all">All statuses</option><option>Shortlisted</option><option>Pending review</option><option>Scheduled</option></select><select defaultValue="score" aria-label="Sort candidates"><option value="score">Highest score</option><option>Newest first</option></select></div> }

export function CandidateTable({ candidates, compact = false }: { candidates: Candidate[]; compact?: boolean }) { const list = compact ? candidates.slice(0, 4) : candidates; return <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Position</th><th>ATS score</th><th>Status</th><th>Current stage</th><th>Experience</th><th></th></tr></thead><tbody>{list.map(candidate => <tr key={candidate.id}><td><Link className="candidate-cell" to={`/ta/candidates/${candidate.id}`}><CandidateAvatar candidate={candidate} /><span><strong>{candidate.name}</strong><small>{candidate.email}</small></span></Link></td><td>{candidate.role}</td><td><span className="score-mini"><i style={{ width: `${candidate.score}%` }} />{candidate.score}%</span></td><td><Badge tone={candidate.status === 'Shortlisted' ? 'success' : candidate.status === 'Pending review' ? 'warning' : 'info'}>{candidate.status}</Badge></td><td>{candidate.stage}</td><td>{candidate.experience}</td><td><Button variant="ghost" to={`/ta/candidates/${candidate.id}`}>View</Button></td></tr>)}</tbody></table></div> }

export function PipelineTimeline() { return <section className="panel timeline-panel"><div className="panel-head"><div><h2>Pipeline timeline</h2><p>Candidate journey</p></div></div><div className="timeline">{[['Applied','Sep 2, 2026','done'],['Screened','Sep 3, 2026','done'],['Shortlisted','Sep 4, 2026','done'],['Technical interview','In progress','current'],['Managerial interview','Upcoming',''],['Selected','Upcoming','']].map(([label,date,state]) => <div className={`timeline-item ${state}`} key={label}><span className="timeline-marker">{state === 'done' ? '✓' : state === 'current' ? '•' : ''}</span><div><strong>{label}</strong><small>{date}</small></div></div>)}</div></section> }
