import { Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { CandidateCalendarPage } from '../pages/candidate/CandidateCalendarPage'
import { CandidateDashboardPage } from '../pages/candidate/CandidateDashboardPage'
import { CandidateInterviewsPage } from '../pages/candidate/CandidateInterviewsPage'
import { CandidateNotificationsPage } from '../pages/candidate/CandidateNotificationsPage'
import { CandidateApplicationPage } from '../pages/candidate/CandidateApplicationPage'
import { CandidateLoginPage } from '../pages/common/CandidateLoginPage'
import { CandidateSignupPage } from '../pages/common/CandidateSignupPage'
import { LoginPage } from '../pages/common/LoginPage'
import { NotFoundPage } from '../pages/common/NotFoundPage'
import { RoleSelectionPage } from '../pages/common/RoleSelectionPage'
import { InterviewDetailsPage } from '../pages/interviews/InterviewDetailsPage'
import { InterviewerCalendarPage } from '../pages/interviewer/InterviewerCalendarPage'
import { InterviewerDashboardPage } from '../pages/interviewer/InterviewerDashboardPage'
import { InterviewerDetailsPage } from '../pages/interviewer/InterviewerDetailsPage'
import { InterviewerInterviewsPage } from '../pages/interviewer/InterviewerInterviewsPage'
import { InterviewerNotificationsPage } from '../pages/interviewer/InterviewerNotificationsPage'
import { NotificationsPage } from '../pages/notifications/NotificationsPage'
import { CandidatesPage, CandidateProfilePage } from '../pages/ta/CandidatesPage'
import { InterviewSetupPage } from '../pages/ta/InterviewSetupPage'
import { SlotRecommendationsPage } from '../pages/ta/SlotRecommendationsPage'
import { TACalendarPage } from '../pages/ta/TACalendarPage'
import { TADashboardPage } from '../pages/ta/TADashboardPage'
import { TAInterviewsPage } from '../pages/ta/TAInterviewsPage'
import { InterviewerLoginPage } from '../pages/common/InterviewerLoginPage'

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<RoleSelectionPage />} />
    <Route path="/login" element={<RoleSelectionPage />} />
    <Route path="/login/ta" element={<LoginPage />} />
    <Route path="/login/candidate" element={<CandidateLoginPage />} />
    <Route path="/signup/candidate" element={<CandidateSignupPage />} />
    <Route path="/login/interviewer" element={<InterviewerLoginPage />} />
    <Route path="*" element={<AppShell><Routes>
      <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
      <Route path="/candidate/interviews" element={<CandidateInterviewsPage />} />
      <Route path="/candidate/calendar" element={<CandidateCalendarPage />} />
      <Route path="/candidate/notifications" element={<CandidateNotificationsPage />} />
      <Route path="/candidate/apply" element={<CandidateApplicationPage />} />
      <Route path="/ta/dashboard" element={<TADashboardPage />} />
      <Route path="/ta/candidates" element={<CandidatesPage />} />
      <Route path="/ta/candidates/:candidateId" element={<CandidateProfilePage />} />
      <Route path="/ta/candidates/:candidateId/setup-interview" element={<InterviewSetupPage />} />
      <Route path="/ta/interviews" element={<TAInterviewsPage />} />
      <Route path="/ta/interviews/create" element={<InterviewSetupPage create />} />
      <Route path="/ta/interviews/:interviewId/slots" element={<SlotRecommendationsPage />} />
      <Route path="/ta/calendar" element={<TACalendarPage />} />
      <Route path="/interviewer/dashboard" element={<InterviewerDashboardPage />} />
      <Route path="/interviewer/interviews" element={<InterviewerInterviewsPage />} />
      <Route path="/interviewer/interviews/:interviewId" element={<InterviewerDetailsPage />} />
      <Route path="/interviewer/calendar" element={<InterviewerCalendarPage />} />
      <Route path="/interviewer/notifications" element={<InterviewerNotificationsPage />} />
      <Route path="/interviews/:interviewId" element={<InterviewDetailsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></AppShell>} />
  </Routes>
}
