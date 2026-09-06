import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { candidates, interviewers, interviews } from '../../data/demoData'
import { Badge, Button, Detail, PageHeader } from '../../components/common'

const eligibleCandidates = candidates.filter(candidate => candidate.status === 'Shortlisted')
const roundOptions = ['Technical Interview', 'Managerial Interview', 'Screening', 'Portfolio Review']

type InterviewForm = {
  candidate: string
  round: string
  duration: string
  mode: string
  timezone: string
}

const initialForm: InterviewForm = {
  candidate: '',
  round: 'Technical Interview',
  duration: '60 minutes',
  mode: 'Online',
  timezone: 'IST (UTC+5:30)',
}

export function InterviewSetupPage({ create = false }: { create?: boolean }) {
  const navigate = useNavigate()
  const [selectedInterviewers, setSelectedInterviewers] = useState(['Rahul Mehta'])
  const [form, setForm] = useState<InterviewForm>({ ...initialForm, candidate: create ? '' : 'Rahul Sharma' })
  const [error, setError] = useState('')
  const completedRounds = useMemo(() => interviews.filter(interview => interview.candidate === form.candidate && interview.status === 'Completed').map(interview => interview.round), [form.candidate])
  const updateField = (field: keyof InterviewForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setError('')
  }
  const submitForm = () => {
    if (!form.candidate) return setError('Select an eligible candidate before continuing.')
    if (completedRounds.includes(form.round)) return setError(`${form.candidate} has already completed the ${form.round} round.`)
    if (selectedInterviewers.length === 0) return setError('Select at least one interviewer before continuing.')
    navigate('/ta/interviews/interview-1/slots')
  }
  return <><div className="back-link"><Link to={create ? '/ta/interviews' : '/ta/candidates/candidate-1'}>← Back</Link></div><PageHeader eyebrow="Interview workflow · Step 1 of 2" title={create ? 'Create interview' : 'Set up interview'} description="Configure the round and build an interview panel with AI assistance."/><div className="setup-layout"><div className="setup-main"><section className="panel"><div className="panel-head"><div><h2>01 · Interview details</h2><p>Choose an eligible candidate and configure the conversation.</p></div><span className="form-required">All fields required</span></div><div className="form-grid"><label className="field full"><span>Candidate</span><select value={form.candidate} onChange={event => updateField('candidate', event.target.value)}><option value="">Select an eligible candidate</option>{eligibleCandidates.map(candidate => <option value={candidate.name} key={candidate.id}>{candidate.name} · {candidate.role}</option>)}</select><small className="field-hint">Only shortlisted candidates can be assigned an interview.</small></label><label className="field"><span>Round type</span><select value={form.round} onChange={event => updateField('round', event.target.value)}>{roundOptions.map(round => <option value={round} key={round}>{round}{completedRounds.includes(round) ? ' · Completed' : ''}</option>)}</select></label><label className="field"><span>Duration</span><select value={form.duration} onChange={event => updateField('duration', event.target.value)}><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></label><label className="field"><span>Interview mode</span><select value={form.mode} onChange={event => updateField('mode', event.target.value)}><option>Online</option><option>In person</option></select></label><label className="field"><span>Timezone</span><select value={form.timezone} onChange={event => updateField('timezone', event.target.value)}><option>IST (UTC+5:30)</option><option>UTC</option><option>EST (UTC-5:00)</option></select></label></div>{error && <p className="form-error" role="alert">{error}</p>}</section><section className="panel"><div className="panel-head"><div><h2>02 · AI recommended interviewers</h2><p>Based on role, skills, seniority, and availability.</p></div><Badge tone="ai">✦ AI recommendations</Badge></div><div className="recommendations">{interviewers.map(item => <div className={`recommendation ${selectedInterviewers.includes(item.name) ? 'selected' : ''}`} key={item.name}><div className="recommendation-top"><div className="avatar avatar-indigo">{item.name.split(' ').map(word => word[0]).join('')}</div><div><strong>{item.name}</strong><span>{item.title}</span><small>{item.type}</small></div><div className="match-score"><strong>{item.score}%</strong><span>match</span></div></div><div className="skill-list">{item.skills.map(skill => <span className="skill" key={skill}>{skill}</span>)}</div><button className={selectedInterviewers.includes(item.name) ? 'select-button selected' : 'select-button'} onClick={() => setSelectedInterviewers(selectedInterviewers.includes(item.name) ? selectedInterviewers.filter(name => name !== item.name) : [...selectedInterviewers, item.name])}>{selectedInterviewers.includes(item.name) ? '✓ Selected' : 'Select interviewer'}</button></div>)}</div></section></div><aside className="setup-aside"><section className="panel review-panel"><div className="section-kicker">REVIEW</div><h2>Ready to find a time?</h2><p>Review your choices before we analyze calendars.</p><div className="review-list"><Detail label="Candidate" value={form.candidate || 'Not selected'} /><Detail label="Interview round" value={form.round} /><Detail label="Duration" value={form.duration} /><Detail label="Interviewers" value={`${selectedInterviewers.length} selected`} /><Detail label="Interview mode" value={form.mode} /><Detail label="Timezone" value={form.timezone} /></div><Button onClick={submitForm} icon="✦">Find best available slots</Button><small className="review-note">Your preferences are used to rank the best options.</small></section></aside></div></>
}
