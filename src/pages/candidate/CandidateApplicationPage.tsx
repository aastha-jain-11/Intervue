import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, PageHeader } from '../../components/common'

const roles = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Product Designer', 'Data Analyst']

export function CandidateApplicationPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitApplication = () => {
    if (!role || !experience || !resume) {
      setError('Choose a role, add your experience, and upload your resume to continue.')
      return
    }
    setError('')
    setSubmitted(true)
  }

  return <><div className="back-link"><Link to="/candidate/dashboard">← Back to dashboard</Link></div><PageHeader eyebrow="Candidate portal" title="Apply for a role" description="Tell us where your experience fits best and share your latest resume."/><div className="application-layout"><section className="panel application-form"><div className="panel-head"><div><h2>Your application</h2><p>Complete the details below to be considered for an opportunity.</p></div><span className="form-required">All fields required</span></div><label className="field"><span>Role you wish to apply for</span><select value={role} onChange={event => { setRole(event.target.value); setError('') }}><option value="">Select a role</option>{roles.map(item => <option value={item} key={item}>{item}</option>)}</select></label><label className="field"><span>Experience in this field</span><div className="experience-input"><input type="number" min="0" max="50" step="0.5" value={experience} onChange={event => { setExperience(event.target.value); setError('') }} placeholder="e.g. 3"/><span>years</span></div></label><label className="resume-upload"><span>Resume</span><input type="file" accept=".pdf,.doc,.docx" onChange={event => { setResume(event.target.files?.[0] || null); setError('') }}/><span className="upload-box"><strong>{resume ? resume.name : 'Upload your resume'}</strong><small>{resume ? `${Math.max(1, Math.round(resume.size / 1024))} KB · Ready to submit` : 'PDF, DOC, or DOCX · Max 10 MB'}</small><b>{resume ? '✓' : '↑'}</b></span></label>{error && <p className="form-error" role="alert">{error}</p>}{submitted && <div className="application-success" role="status"><strong>Application received</strong><span>Your {role} application is ready for review.</span></div>}<div className="application-actions"><Button variant="secondary" to="/candidate/dashboard">Cancel</Button>{submitted ? <Button onClick={() => navigate('/candidate/dashboard')}>Back to dashboard</Button> : <Button onClick={submitApplication}>Submit application</Button>}</div></section><aside className="panel application-aside"><div className="application-aside-icon">✦</div><div className="section-kicker">YOUR NEXT STEP</div><h2>Put your experience forward</h2><p>Our team will review your profile and contact you if your experience matches an open opportunity.</p><div className="application-checklist"><span>✓ Role preference</span><span>✓ Relevant experience</span><span>✓ Current resume</span></div></aside></div></>
}
