import type { ReactElement } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
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
import type { UserRole } from '../types/auth'

function protectedPage(page: ReactElement, allowedRoles?: UserRole[]) {
  return <ProtectedRoute allowedRoles={allowedRoles}><AppShell>{page}</AppShell></ProtectedRoute>
}

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<RoleSelectionPage />} />
    <Route path="/login" element={<RoleSelectionPage />} />
    <Route path="/login/ta" element={<LoginPage />} />
    <Route path="/login/candidate" element={<CandidateLoginPage />} />
    <Route path="/signup/candidate" element={<CandidateSignupPage />} />
    <Route path="/login/interviewer" element={<InterviewerLoginPage />} />

    <Route path="/candidate/dashboard" element={protectedPage(<CandidateDashboardPage />, ['candidate'])} />
    <Route path="/candidate/interviews" element={protectedPage(<CandidateInterviewsPage />, ['candidate'])} />
    <Route path="/candidate/calendar" element={protectedPage(<CandidateCalendarPage />, ['candidate'])} />
    <Route path="/candidate/notifications" element={protectedPage(<CandidateNotificationsPage />, ['candidate'])} />
    <Route path="/candidate/apply" element={protectedPage(<CandidateApplicationPage />, ['candidate'])} />

    <Route path="/ta/dashboard" element={protectedPage(<TADashboardPage />, ['ta_admin'])} />
    <Route path="/ta/candidates" element={protectedPage(<CandidatesPage />, ['ta_admin'])} />
    <Route path="/ta/candidates/:candidateId" element={protectedPage(<CandidateProfilePage />, ['ta_admin'])} />
    <Route path="/ta/candidates/:candidateId/setup-interview" element={protectedPage(<InterviewSetupPage />, ['ta_admin'])} />
    <Route path="/ta/interviews" element={protectedPage(<TAInterviewsPage />, ['ta_admin'])} />
    <Route path="/ta/interviews/create" element={protectedPage(<InterviewSetupPage create />, ['ta_admin'])} />
    <Route path="/ta/interviews/:interviewId/slots" element={protectedPage(<SlotRecommendationsPage />, ['ta_admin'])} />
    <Route path="/ta/calendar" element={protectedPage(<TACalendarPage />, ['ta_admin'])} />

    <Route path="/interviewer/dashboard" element={protectedPage(<InterviewerDashboardPage />, ['interviewer'])} />
    <Route path="/interviewer/interviews" element={protectedPage(<InterviewerInterviewsPage />, ['interviewer'])} />
    <Route path="/interviewer/interviews/:interviewId" element={protectedPage(<InterviewerDetailsPage />, ['interviewer'])} />
    <Route path="/interviewer/calendar" element={protectedPage(<InterviewerCalendarPage />, ['interviewer'])} />
    <Route path="/interviewer/notifications" element={protectedPage(<InterviewerNotificationsPage />, ['interviewer'])} />

    <Route path="/interviews/:interviewId" element={protectedPage(<InterviewDetailsPage />)} />
    <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
}
