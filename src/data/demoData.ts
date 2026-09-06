import type { Candidate, Interview, Interviewer, Notification } from '../types'

export const candidates: Candidate[] = [
  { id: 'candidate-1', name: 'Rahul Sharma', initials: 'RS', role: 'Software Engineer', score: 94, status: 'Shortlisted', stage: 'Technical Interview', experience: '3 years', skills: ['Python', 'AWS', 'System Design'], email: 'rahul.sharma@email.com' },
  { id: 'candidate-2', name: 'Priya Kumar', initials: 'PK', role: 'Software Engineer', score: 91, status: 'Shortlisted', stage: 'Interview Setup', experience: '2 years', skills: ['React', 'TypeScript', 'Node.js'], email: 'priya.kumar@email.com' },
  { id: 'candidate-3', name: 'Aman Shah', initials: 'AS', role: 'Backend Engineer', score: 87, status: 'Pending review', stage: 'Pending', experience: '3 years', skills: ['Java', 'Spring', 'SQL'], email: 'aman.shah@email.com' },
  { id: 'candidate-4', name: 'Meera Iyer', initials: 'MI', role: 'Product Designer', score: 84, status: 'Shortlisted', stage: 'Screening', experience: '4 years', skills: ['Figma', 'Research', 'Prototyping'], email: 'meera.iyer@email.com' },
  { id: 'candidate-5', name: 'Arjun Nair', initials: 'AN', role: 'Frontend Engineer', score: 79, status: 'Screened', stage: 'Screened', experience: '2 years', skills: ['React', 'CSS', 'Testing'], email: 'arjun.nair@email.com' },
  { id: 'candidate-6', name: 'Sana Khan', initials: 'SK', role: 'Data Analyst', score: 76, status: 'In review', stage: 'Applied', experience: '1 year', skills: ['SQL', 'Python', 'Tableau'], email: 'sana.khan@email.com' },
]

export const interviews: Interview[] = [
  { id: 'interview-1', candidate: 'Rahul Sharma', role: 'Software Engineer', round: 'Technical Interview', date: 'Sep 10, 2026', time: '2:00 - 3:00 PM IST', status: 'Awaiting interviewer', score: 96, interviewers: 'Rahul Mehta, Priya Shah' },
  { id: 'interview-2', candidate: 'Priya Kumar', role: 'Software Engineer', round: 'Screening', date: 'Sep 11, 2026', time: '11:00 - 11:30 AM IST', status: 'Scheduled', score: 92, interviewers: 'Neha Kapoor' },
  { id: 'interview-3', candidate: 'Meera Iyer', role: 'Product Designer', round: 'Portfolio Review', date: 'Sep 12, 2026', time: '4:00 - 5:00 PM IST', status: 'Pending', score: 88, interviewers: 'Vikram Rao' },
  { id: 'interview-4', candidate: 'Dev Malhotra', role: 'Product Manager', round: 'Managerial Interview', date: 'Sep 14, 2026', time: '10:00 - 11:00 AM IST', status: 'Completed', score: 84, interviewers: 'Priya Shah' },
]

export const interviewers: Interviewer[] = [
  { name: 'Rahul Mehta', title: 'Senior Software Engineer', type: 'Technical Interviewer', score: 96, skills: ['Java', 'AWS', 'System Design'] },
  { name: 'Priya Shah', title: 'Engineering Manager', type: 'Managerial Interviewer', score: 91, skills: ['Architecture', 'Leadership', 'System Design'] },
  { name: 'Neha Kapoor', title: 'Staff Frontend Engineer', type: 'Technical Interviewer', score: 89, skills: ['React', 'TypeScript', 'Web Performance'] },
]

export const notifications: Notification[] = [
  { type: 'confirmed', title: 'Interview confirmed', text: "Rahul Sharma's technical interview has been confirmed.", time: '2 minutes ago', unread: true },
  { type: 'request', title: 'New interview request', text: 'You have been requested to interview Rahul Sharma.', time: '10 minutes ago', unread: true },
  { type: 'change', title: 'Slot change requested', text: 'An interviewer requested an alternative slot.', time: '1 hour ago', unread: false },
  { type: 'screening', title: 'Screening complete', text: 'Priya Kumar has been shortlisted by the AI screening review.', time: 'Yesterday', unread: false },
]
