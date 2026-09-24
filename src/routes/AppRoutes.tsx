import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from '../components/common/LoadingState'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { ROLE_DASHBOARD_PATH } from './rolePaths'
import type { UserRole } from '../types'
import { HomePage } from '../pages/public/HomePage'
import { AboutPage } from '../pages/public/AboutPage'
import { HowItWorksPage } from '../pages/public/HowItWorksPage'
import { ExploreProblemsPage } from '../pages/public/ExploreProblemsPage'
import { ProblemDetailsPage } from '../pages/public/ProblemDetailsPage'
import { UniversitiesPage } from '../pages/public/UniversitiesPage'
import { PartnersPage } from '../pages/public/PartnersPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage'
import { NotFoundPage } from '../pages/auth/NotFoundPage'
import { CitizenDashboardPage } from '../pages/citizen/CitizenDashboardPage'
import { SubmitProblemPage } from '../pages/citizen/SubmitProblemPage'
import { MyProblemsPage } from '../pages/citizen/MyProblemsPage'
import { CitizenProblemDetailsPage } from '../pages/citizen/CitizenProblemDetailsPage'
import { SimilarProblemsPage } from '../pages/citizen/SimilarProblemsPage'
import { FeedbackPage } from '../pages/citizen/FeedbackPage'
import { NotificationsPage } from '../pages/citizen/NotificationsPage'
import { CitizenProfilePage } from '../pages/citizen/CitizenProfilePage'
import { GovernmentDashboardPage } from '../pages/government/GovernmentDashboardPage'
import { ProblemQueuePage } from '../pages/government/ProblemQueuePage'
import { ProblemReviewPage } from '../pages/government/ProblemReviewPage'
import { DuplicateAnalysisPage } from '../pages/government/DuplicateAnalysisPage'
import { ValidatedProblemsPage } from '../pages/government/ValidatedProblemsPage'
import { HEIMatchingPage } from '../pages/government/HEIMatchingPage'
import { GovernmentProjectsPage } from '../pages/government/GovernmentProjectsPage'
import { GovernmentAnalyticsPage } from '../pages/government/GovernmentAnalyticsPage'
import { AuditLogsPage } from '../pages/government/AuditLogsPage'
import { GovernmentNotificationsPage } from '../pages/government/GovernmentNotificationsPage'
import { GovernmentProfilePage } from '../pages/government/GovernmentProfilePage'
import { UniversityDashboardPage } from '../pages/university/UniversityDashboardPage'
import { UniversityProblemQueuePage } from '../pages/university/UniversityProblemQueuePage'
import { UniversityProblemDetailsPage } from '../pages/university/UniversityProblemDetailsPage'
import { UniversityFacultyAssignedPage } from '../pages/university/UniversityFacultyAssignedPage'
import { UniversityResourcesSupportPage } from '../pages/university/UniversityResourcesSupportPage'
import { UniversityCollaborationsPage } from '../pages/university/UniversityCollaborationsPage'
import { UniversityGovernmentFeedbackPage } from '../pages/university/UniversityGovernmentFeedbackPage'
import { UniversityProfilePage } from '../pages/university/UniversityProfilePage'
import { UniversityNotificationsPage } from '../pages/university/UniversityNotificationsPage'
import { PartnerDashboardPage } from '../pages/partner/PartnerDashboardPage'
import { PartnerProfilePage } from '../pages/partner/PartnerProfilePage'
import { RecommendedProjectsPage } from '../pages/partner/RecommendedProjectsPage'
import { PartnerProjectDetailsPage } from '../pages/partner/PartnerProjectDetailsPage'
import { CollaborationRequestsPage as PartnerCollaborationRequestsPage } from '../pages/partner/CollaborationRequestsPage'
import { ActiveCollaborationsPage } from '../pages/partner/ActiveCollaborationsPage'
import { SupportedProjectsPage } from '../pages/partner/SupportedProjectsPage'
import { PartnerImpactPage } from '../pages/partner/PartnerImpactPage'
import { PartnerNotificationsPage } from '../pages/partner/PartnerNotificationsPage'
import { ProjectsPage } from '../pages/project/ProjectsPage'
import { ProjectWorkspacePage } from '../pages/project/ProjectWorkspacePage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { AdminRolesPage } from '../pages/admin/AdminRolesPage'
import { AdminOrganizationsPage } from '../pages/admin/AdminOrganizationsPage'
import { AdminTaxonomyPage } from '../pages/admin/AdminTaxonomyPage'
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage'
import { AdminSystemHealthPage } from '../pages/admin/AdminSystemHealthPage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'

import { AdminHEIRegistryPage } from '../pages/admin/AdminHEIRegistryPage'
import { AdminPartnerRegistryPage } from '../pages/admin/AdminPartnerRegistryPage'
import { AnalyticsDashboardPage } from '../pages/analytics/AnalyticsDashboardPage'
import { AIOverviewPage } from '../pages/admin/ai/AIOverviewPage'
import { AIPredictionsPage } from '../pages/admin/ai/AIPredictionsPage'
import { TrainingDatasetPage } from '../pages/admin/ai/TrainingDatasetPage'
import { RetrainingJobsPage } from '../pages/admin/ai/RetrainingJobsPage'
import { AISettingsPage } from '../pages/admin/ai/AISettingsPage'
import { AdminProblemsPage } from '../pages/admin/AdminProblemsPage'

function AuthOnlyRoute({ children }: { children: ReactNode }) { const { isAuthenticated, isInitialized, currentUser } = useAuth(); if (!isInitialized) return <LoadingState rows={1} />; return isAuthenticated && currentUser ? <Navigate to={ROLE_DASHBOARD_PATH[currentUser.role]} replace /> : <>{children}</> }
function roleRoute(role: UserRole, children: ReactNode) { return <ProtectedRoute><RoleRoute allowedRoles={[role]}>{children}</RoleRoute></ProtectedRoute> }
function multiRoleRoute(roles: UserRole[], children: ReactNode) { return <ProtectedRoute><RoleRoute allowedRoles={roles}>{children}</RoleRoute></ProtectedRoute> }
function ProjectIndexRedirect() { const { id } = useParams(); return <Navigate to={`/projects/${id}/overview`} replace /> }
function FacultyTeamParamRedirect() { return <Navigate to="/university/faculty" replace /> }
function FacultyProjectParamRedirect() { return <Navigate to="/university/faculty" replace /> }

function ProfileRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  const profilePaths: Record<UserRole, string> = {
    citizen: '/citizen/profile',
    government: '/government/profile',
    hei: '/university/profile',
    faculty: '/university/profile',
    partner: '/partner/profile',
    admin: '/admin/settings',
  }
  return <Navigate to={profilePaths[currentUser.role]} replace />
}

function NotificationsRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  const notificationPaths: Record<UserRole, string> = {
    citizen: '/citizen/notifications',
    government: '/government/notifications',
    hei: '/hei/notifications',
    faculty: '/hei/notifications',
    partner: '/partner/notifications',
    admin: '/admin/audit-logs',
  }
  return <Navigate to={notificationPaths[currentUser.role]} replace />
}

export function AppRoutes() { return <Routes>
  <Route path="/" element={<HomePage />} /><Route path="/about" element={<AboutPage />} /><Route path="/how-it-works" element={<HowItWorksPage />} /><Route path="/problems" element={<ExploreProblemsPage />} /><Route path="/problems/:id" element={<ProblemDetailsPage />} /><Route path="/universities" element={<UniversitiesPage />} /><Route path="/partners" element={<PartnersPage />} />
  <Route path="/login" element={<AuthOnlyRoute><LoginPage /></AuthOnlyRoute>} /><Route path="/register" element={<AuthOnlyRoute><RegisterPage /></AuthOnlyRoute>} /><Route path="/forgot-password" element={<AuthOnlyRoute><ForgotPasswordPage /></AuthOnlyRoute>} /><Route path="/reset-password" element={<AuthOnlyRoute><ResetPasswordPage /></AuthOnlyRoute>} />
  <Route path="/citizen/dashboard" element={roleRoute('citizen', <CitizenDashboardPage />)} />
  <Route path="/citizen/submit-problem" element={roleRoute('citizen', <SubmitProblemPage />)} />
  <Route path="/citizen/report-problem" element={roleRoute('citizen', <SubmitProblemPage />)} />
  <Route path="/citizen/report" element={roleRoute('citizen', <SubmitProblemPage />)} />
  <Route path="/citizen/track" element={<Navigate to="/citizen/problems" replace />} />
  <Route path="/citizen/track/:trackId" element={<Navigate to="/citizen/problems" replace />} />
  <Route path="/citizen/problems" element={roleRoute('citizen', <MyProblemsPage />)} />
  <Route path="/citizen/problems/:id" element={roleRoute('citizen', <CitizenProblemDetailsPage />)} />
  <Route path="/citizen/problems/:id/similar" element={roleRoute('citizen', <SimilarProblemsPage />)} />
  <Route path="/citizen/projects" element={<Navigate to="/citizen/dashboard" replace />} />
  <Route path="/citizen/feedback" element={roleRoute('citizen', <FeedbackPage />)} />
  <Route path="/citizen/notifications" element={roleRoute('citizen', <NotificationsPage />)} />
  <Route path="/citizen/profile" element={roleRoute('citizen', <CitizenProfilePage />)} />
  <Route path="/citizen/settings" element={<Navigate to="/citizen/dashboard" replace />} />
  <Route path="/government/dashboard" element={roleRoute('government', <GovernmentDashboardPage />)} />
  <Route path="/government/problem-queue" element={roleRoute('government', <ProblemQueuePage />)} />
  <Route path="/government/problems/:id/review" element={roleRoute('government', <ProblemReviewPage />)} />
  <Route path="/government/validation" element={<Navigate to="/government/problem-queue" replace />} />
  <Route path="/government/duplicate-analysis" element={roleRoute('government', <DuplicateAnalysisPage />)} />
  <Route path="/government/validated-problems" element={roleRoute('government', <ValidatedProblemsPage />)} />
  <Route path="/government/hei-matching" element={roleRoute('government', <HEIMatchingPage />)} />
  <Route path="/government/projects" element={roleRoute('government', <GovernmentProjectsPage />)} />
  <Route path="/government/projects/:id" element={roleRoute('government', <GovernmentProjectsPage />)} />
  <Route path="/government/analytics" element={roleRoute('government', <GovernmentAnalyticsPage />)} />
  <Route path="/government/audit-logs" element={roleRoute('government', <AuditLogsPage />)} />
  <Route path="/government/users" element={<Navigate to="/government/dashboard" replace />} />
  <Route path="/government/organizations" element={<Navigate to="/government/dashboard" replace />} />
  <Route path="/government/notifications" element={roleRoute('government', <GovernmentNotificationsPage />)} />
  <Route path="/government/profile" element={roleRoute('government', <GovernmentProfilePage />)} />
  <Route path="/government/settings" element={<Navigate to="/government/dashboard" replace />} />
  {/* University Portal Routes (7 Primary Modules Only) */}
  <Route path="/university" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityDashboardPage />)} />
  <Route path="/university/dashboard" element={<Navigate to="/university" replace />} />
  <Route path="/university/problem-queue" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityProblemQueuePage />)} />
  <Route path="/university/problem-queue/:id" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityProblemDetailsPage />)} />
  <Route path="/university/problems/:id" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityProblemDetailsPage />)} />
  <Route path="/university/problems" element={<Navigate to="/university/problem-queue" replace />} />
  <Route path="/university/faculty-assigned" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityFacultyAssignedPage />)} />
  <Route path="/university/faculty" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/university/resources-support" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityResourcesSupportPage />)} />
  <Route path="/university/resources" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/university/reports" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/university/collaborations" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityCollaborationsPage />)} />
  <Route path="/university/industry-csr" element={<Navigate to="/university/collaborations" replace />} />
  <Route path="/university/feedback" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityGovernmentFeedbackPage />)} />
  <Route path="/university/government-feedback" element={<Navigate to="/university/feedback" replace />} />
  <Route path="/university/profile" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityProfilePage />)} />
  <Route path="/university/notifications" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityNotificationsPage />)} />
  <Route path="/university/students" element={<Navigate to="/university" replace />} />
  <Route path="/university/faculty/*" element={<Navigate to="/university/faculty-assigned" replace />} />

  {/* HEI Portal Compatibility and Redirects */}
  <Route path="/hei" element={<Navigate to="/university" replace />} />
  <Route path="/hei/dashboard" element={<Navigate to="/university" replace />} />
  <Route path="/hei/teams" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/hei/faculty" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/hei/profile" element={<Navigate to="/university/profile" replace />} />
  <Route path="/hei/recommended-problems" element={<Navigate to="/university/problem-queue" replace />} />
  <Route path="/hei/problems" element={<Navigate to="/university/problem-queue" replace />} />
  <Route path="/hei/problems/:id" element={multiRoleRoute(['hei', 'faculty', 'admin'], <UniversityProblemDetailsPage />)} />
  <Route path="/hei/accepted-challenges" element={<Navigate to="/university/problem-queue" replace />} />
  <Route path="/hei/resources" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/hei/capability-gaps" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/hei/progress" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/hei/projects" element={<Navigate to="/university/collaborations" replace />} />
  <Route path="/hei/collaboration-requests" element={<Navigate to="/university/collaborations" replace />} />
  <Route path="/hei/notifications" element={roleRoute('hei', <UniversityNotificationsPage />)} />
  <Route path="/hei/settings" element={<Navigate to="/university/profile" replace />} />

  <Route path="/partner/dashboard" element={roleRoute('partner', <PartnerDashboardPage />)} /><Route path="/partner/profile" element={roleRoute('partner', <PartnerProfilePage />)} /><Route path="/partner/recommended-projects" element={roleRoute('partner', <RecommendedProjectsPage />)} /><Route path="/partner/project-details" element={roleRoute('partner', <PartnerProjectDetailsPage />)} /><Route path="/partner/project-details/:id" element={roleRoute('partner', <PartnerProjectDetailsPage />)} /><Route path="/partner/projects/:id" element={roleRoute('partner', <PartnerProjectDetailsPage />)} /><Route path="/partner/collaboration-requests" element={roleRoute('partner', <PartnerCollaborationRequestsPage />)} /><Route path="/partner/active-collaborations" element={roleRoute('partner', <ActiveCollaborationsPage />)} /><Route path="/partner/supported-projects" element={roleRoute('partner', <SupportedProjectsPage />)} /><Route path="/partner/resources" element={<Navigate to="/partner/dashboard" replace />} /><Route path="/partner/impact" element={roleRoute('partner', <PartnerImpactPage />)} /><Route path="/partner/notifications" element={roleRoute('partner', <PartnerNotificationsPage />)} /><Route path="/partner/settings" element={<Navigate to="/partner/dashboard" replace />} />

  {/* Standalone Faculty Portal Redirects */}
  <Route path="/faculty" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/faculty/dashboard" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/faculty/teams" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/faculty/teams/:teamId" element={<FacultyTeamParamRedirect />} />
  <Route path="/faculty/projects" element={<Navigate to="/university/collaborations" replace />} />
  <Route path="/faculty/projects/:id" element={<FacultyProjectParamRedirect />} />
  <Route path="/faculty/students" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/faculty/reviews" element={<Navigate to="/university/feedback" replace />} />
  <Route path="/faculty/reports" element={<Navigate to="/university/feedback" replace />} />
  <Route path="/faculty/milestones" element={<Navigate to="/university/feedback" replace />} />
  <Route path="/faculty/capability-gaps" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/faculty/guidance" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/faculty/resources" element={<Navigate to="/university/resources-support" replace />} />
  <Route path="/faculty/profile" element={<Navigate to="/university/profile" replace />} />
  <Route path="/faculty/notifications" element={<Navigate to="/hei/notifications" replace />} />
  <Route path="/faculty/settings" element={<Navigate to="/university/profile" replace />} />
  <Route path="/faculty/*" element={<Navigate to="/university/faculty-assigned" replace />} />
  <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} /><Route path="/projects/:id" element={<ProtectedRoute><ProjectIndexRedirect /></ProtectedRoute>} /><Route path="/projects/:id/overview" element={<ProtectedRoute><ProjectWorkspacePage section="overview" /></ProtectedRoute>} /><Route path="/projects/:id/team" element={<ProtectedRoute><ProjectWorkspacePage section="team" /></ProtectedRoute>} /><Route path="/projects/:id/milestones" element={<ProtectedRoute><ProjectWorkspacePage section="milestones" /></ProtectedRoute>} /><Route path="/projects/:id/tasks" element={<ProtectedRoute><ProjectWorkspacePage section="tasks" /></ProtectedRoute>} /><Route path="/projects/:id/documents" element={<ProtectedRoute><ProjectWorkspacePage section="documents" /></ProtectedRoute>} /><Route path="/projects/:id/discussions" element={<ProtectedRoute><ProjectWorkspacePage section="discussions" /></ProtectedRoute>} /><Route path="/projects/:id/capability-gaps" element={<ProtectedRoute><ProjectWorkspacePage section="capability-gaps" /></ProtectedRoute>} /><Route path="/projects/:id/partners" element={<ProtectedRoute><ProjectWorkspacePage section="partners" /></ProtectedRoute>} /><Route path="/projects/:id/feedback" element={<ProtectedRoute><ProjectWorkspacePage section="feedback" /></ProtectedRoute>} /><Route path="/projects/:id/impact" element={<ProtectedRoute><ProjectWorkspacePage section="impact" /></ProtectedRoute>} />
  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
  <Route path="/admin/dashboard" element={roleRoute('admin', <AdminDashboardPage />)} />
  <Route path="/admin/users" element={roleRoute('admin', <AdminUsersPage />)} />
  <Route path="/admin/roles" element={roleRoute('admin', <AdminRolesPage />)} />
  <Route path="/admin/organizations" element={roleRoute('admin', <AdminOrganizationsPage />)} />
  <Route path="/admin/universities" element={roleRoute('admin', <AdminHEIRegistryPage />)} />
  <Route path="/admin/hei-registry" element={roleRoute('admin', <AdminHEIRegistryPage />)} />
  <Route path="/admin/partner-registry" element={roleRoute('admin', <AdminPartnerRegistryPage />)} />
  <Route path="/admin/problems" element={roleRoute('admin', <AdminProblemsPage />)} />
  <Route path="/admin/student-teams" element={<Navigate to="/admin/dashboard" replace />} />
  <Route path="/admin/teams" element={<Navigate to="/admin/dashboard" replace />} />
  <Route path="/admin/taxonomy" element={roleRoute('admin', <AdminTaxonomyPage />)} />
  <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />

  {/* Super Admin AI Management Feature Routes */}
  <Route path="/admin/ai" element={<Navigate to="/admin/ai/overview" replace />} />
  <Route path="/admin/ai/overview" element={roleRoute('admin', <AIOverviewPage />)} />
  <Route path="/admin/ai/predictions" element={roleRoute('admin', <AIPredictionsPage />)} />
  <Route path="/admin/ai/feedback" element={<Navigate to="/admin/ai/overview" replace />} />
  <Route path="/admin/ai/dataset" element={roleRoute('admin', <TrainingDatasetPage />)} />
  <Route path="/admin/ai/retraining" element={roleRoute('admin', <RetrainingJobsPage />)} />
  <Route path="/admin/ai/settings" element={roleRoute('admin', <AISettingsPage />)} />
  <Route path="/admin/ai-models" element={<Navigate to="/admin/ai/overview" replace />} />

  <Route path="/admin/audit-logs" element={roleRoute('admin', <AdminAuditLogsPage />)} />
  <Route path="/admin/system-health" element={roleRoute('admin', <AdminSystemHealthPage />)} />
  <Route path="/admin/settings" element={roleRoute('admin', <AdminSettingsPage />)} />
  <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
  <Route path="/analytics/dashboard" element={<ProtectedRoute><RoleRoute allowedRoles={['admin', 'government']}><AnalyticsDashboardPage /></RoleRoute></ProtectedRoute>} />
  <Route path="/student" element={<Navigate to="/unauthorized" replace />} />
  <Route path="/student/*" element={<Navigate to="/unauthorized" replace />} />
  <Route path="/profile" element={<ProtectedRoute><ProfileRedirect /></ProtectedRoute>} />
  <Route path="/notifications" element={<ProtectedRoute><NotificationsRedirect /></ProtectedRoute>} />
  <Route path="/unauthorized" element={<UnauthorizedPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes> }
