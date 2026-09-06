export type Candidate = {
  id: string
  name: string
  initials: string
  role: string
  score: number
  status: string
  stage: string
  experience: string
  skills: string[]
  email: string
}

export type Interview = {
  id: string
  candidate: string
  role: string
  round: string
  date: string
  time: string
  status: string
  score: number
  interviewers: string
}

export type Interviewer = {
  name: string
  title: string
  type: string
  score: number
  skills: string[]
}

export type Notification = {
  type: string
  title: string
  text: string
  time: string
  unread: boolean
}
