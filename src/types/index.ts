import type { LucideIcon } from 'lucide-react'

export type UserRole = 'citizen' | 'government' | 'hei' | 'faculty' | 'partner' | 'admin'
export type ProblemStatus = 'Pending' | 'Under Review' | 'Validated' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled' | 'Open' | 'Resolved' | 'Duplicate' | 'Merged'
export type ProjectStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled'
export type CitizenProblemStatus = 'Draft' | 'Submitted' | 'Under Review' | 'More Information Required' | 'Validated' | 'Rejected' | 'Redirected' | 'Converted to Project' | 'Open' | 'In Progress' | 'Resolved' | 'Duplicate' | 'Merged'
export type ValidationStatus = 'Submitted' | 'Under Review' | 'More Information Required' | 'Validated' | 'Rejected' | 'Redirected' | 'Converted to Project' | 'Duplicate' | 'Merged'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  organization: string
  avatar?: string
  avatarUrl?: string
  isVerified: boolean
  department?: string
  designation?: string
  phone?: string
  officeLocation?: string
}

export interface UserProfileResponse {
  id: number
  full_name: string
  email: string
  role: string
  organization_name?: string | null
  department?: string | null
  designation?: string | null
  phone?: string | null
  office_location?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

export interface ProfileUpdatePayload {
  full_name?: string
  department?: string
  designation?: string
  phone?: string
  office_location?: string
  organization_name?: string
  avatar_url?: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface Organization { id: string; name: string; type: string; logoUrl?: string }
export type JharkhandLanguage = 'en' | 'hi' | 'nag' | 'sat' | 'kru' | 'mun'

export interface TrackingStage {
  id: number
  name: string
  status: 'Completed' | 'In Progress' | 'Pending' | 'Not Started'
  date?: string
  description: string
  responsibleRole: 'Citizen' | 'Government' | 'HEI/University' | 'Faculty' | 'Student Project Team' | 'Partner' | 'Project Team'
  responsibleOrg?: string
}

export interface TrackingResource {
  id: string
  name: string
  category: 'Data' | 'Funding' | 'Technology' | 'Equipment' | 'Infrastructure' | 'Experts' | 'Training' | 'Volunteers'
  requiredQuantity: string
  status: 'Available' | 'Partially Available' | 'Partner Identified' | 'Required' | 'Pending'
  provider?: string
}

export interface CitizenFeedback {
  rating: number
  comment: string
  problemSolved: 'yes' | 'partially' | 'no'
  submittedAt: string
}

export interface Problem {
  id: string; title: string; description: string; category: string; location: string
  status: ProblemStatus; submittedAt: string; similarCount?: number
}
export interface AIPreScreeningInfo {
  status: 'completed' | 'needs_review' | 'failed' | 'pending' | string
  category: string
  subcategory?: string | null
  problem_type?: string | null
  confidence_score?: number | null
  category_status?: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string
  priority_score?: number | null
  priority_reasons?: string[] | null
  priority_status?: string | null
  has_similar_live_problem: boolean
  top_similarity_score?: number | null
  top_similar_match?: any | null
  similar_matches?: any[] | null
  similarity_status?: string | null
  verification_status?: string | null
}

export interface CitizenProblem extends Omit<Problem, 'status'> {
  trackId?: string
  citizenId?: string
  citizenName?: string | null
  status: CitizenProblemStatus
  urgency: 'Low' | 'Medium' | 'High' | 'Critical'
  affectedPeople: number
  state: string
  district: string
  locality: string
  landmark?: string
  latitude?: number
  longitude?: number
  lastUpdated: string
  requiredCapabilities: string[]
  currentStageIndex?: number
  timelineStages?: TrackingStage[]
  requiredResources?: TrackingResource[]
  citizenFeedback?: CitizenFeedback
  governmentComment?: string
  rejectionReason?: string
  ai_pre_screening?: AIPreScreeningInfo
  ai_category?: string | null
  ai_subcategory?: string | null
  ai_problem_type?: string | null
  ai_confidence_score?: number | null
  ai_summary?: string | null
  ai_priority?: string | null
  ai_priority_score?: number | null
  ai_priority_reasons?: string[] | null
  ai_similarity_status?: string | null
  ai_similarity_matches?: any[] | null
  ai_duplicate_candidates?: any[] | null
  verification_status?: string | null
}
export interface GovernmentProblem extends Omit<CitizenProblem, 'status'> { status: ValidationStatus; priority: 'Low' | 'Medium' | 'High' | 'Critical'; citizenLabel: string; attachedFiles: string[]; validationDate?: string; currentStage?: string; matchingStatus?: string }
export interface GovernmentProject extends Project { category: string; facultyLead: string; beneficiaries: number; lastUpdated: string; stage: string }
export interface DuplicateAnalysis { id: string; problemTitle: string; possibleDuplicate: string; similarity: number; category: string; location: string; keywords: string[]; reason: string; status: 'Needs Review' | 'Duplicate' | 'Not a Duplicate' }
export interface HEIRecommendation { id: string; university: string; location: string; match: number; capabilities: string[]; facultyExpertise: string[]; resources: string[]; workload: string; explanation: string }
export interface AuditLog { id: string; dateTime: string; user: string; action: string; entity: string; previousStatus: string; newStatus: string; comment: string }
export interface GovernmentUser { id: string; name: string; role: string; organization: string; verification: 'Verified' | 'Pending'; accountStatus: 'Active' | 'Suspended'; lastActive: string }
export interface HEIProblem extends GovernmentProblem { match: number; suggestedProjectType: string; expectedOutcome: string; existingEfforts: string; facultyExpertise: string[]; suggestedResources: string[]; suggestedPartnerTypes: string[] }
export interface HEIProject extends GovernmentProject { studentTeam: string; capabilityGaps: string[]; partnerStatus: string }
export interface FacultyMember { id: string; name: string; department: string; designation: string; email: string; expertise: string[]; experience: number; availability: 'Available' | 'Limited' | 'Unavailable'; currentProjects: number; profile: string }
export interface HEIResource { id: string; name: string; type: string; description: string; department: string; availability: 'Available' | 'Limited' | 'Booked'; contactPerson: string; currentUsage: string }
export interface StudentTeam { id: string; name: string; relatedProject: string; facultyMentor: string; studentCount: number; requiredCapabilities: string[]; currentCapabilities: string[]; status: 'Formation Pending' | 'Active' | 'Proposal Preparation' | 'Working' | 'Completed' }
export interface CapabilityGap { id: string; subject: string; required: string; availableInternally: string; missing: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; suggestedSolution: string; partnerType: string; action: string }
export interface CollaborationRequest { id: string; organization: string; organizationType: string; relatedProject: string; requestedSupport: string; message: string; date: string; status: 'Pending' | 'Accepted' | 'Rejected' | 'More Information Required' }
export type CollaborationRequestStatus = 'Pending Review' | 'Accepted' | 'Rejected' | 'More Information Required' | 'Completed' | 'Draft' | 'Sent' | 'Under Review' | 'Withdrawn'
export type PartnerResourceType = 'Funding' | 'Equipment' | 'Software' | 'Technical Expertise' | 'Mentorship' | 'Data' | 'Infrastructure' | 'Field Support' | 'Training'

export interface PartnerProject {
  id: string
  title: string
  description: string
  problemTitle: string
  problemDescription?: string
  projectGoals?: string[]
  expectedOutcome: string
  category: string
  location: string
  university: string
  facultyLead: string
  studentTeam: string
  stage: string
  progress: number
  requiredCapabilities?: string[]
  requiredSupport: string[]
  requiredResources: string[]
  match: number
  beneficiaries: number
  expectedTimeline?: string
  existingPartners?: string[]
  documents?: { name: string; size: string; type: string }[]
  capabilityGaps: string[]
  lastUpdated: string
}
export interface PartnerCollaborationRequest {
  id: string
  projectId?: string
  projectTitle: string
  university: string
  facultyLead: string
  requestType?: 'Support Offer' | 'Incoming Request' | 'Grant Request' | 'Resource Sharing'
  requestedSupport: string
  contribution: string
  timeline?: string
  contactPerson?: string
  message: string
  requestDate: string
  status: CollaborationRequestStatus
}
export interface ActiveCollaboration {
  id: string
  projectId?: string
  projectTitle: string
  university: string
  collaborationType: string
  partnerRepresentative: string
  universityRepresentative: string
  contribution: string
  stage: string
  progress: number
  partnerResponsibility?: string
  nextMilestone: string
  lastUpdate?: string
  status?: 'Active' | 'On Track' | 'Review Needed'
  startDate: string
  expectedCompletion: string
  milestones?: { title: string; dueDate: string; completed: boolean }[]
  upcomingActivities?: { id: string; title: string; date: string; type: string; owner: string }[]
  communications?: { id: string; sender: string; role: string; message: string; timestamp: string }[]
}
export interface SupportedProject {
  id: string
  projectId?: string
  projectTitle: string
  problemTitle: string
  location?: string
  university: string
  supportProvided: string
  partnerContribution?: string
  completionDate: string
  communitiesReached: number
  beneficiaries?: number
  outcomes: string
  impactResult?: string
  impactStatus: string
  reportData?: {
    summary: string
    keyMetrics: { label: string; value: string }[]
    testimonial: { quote: string; author: string; role: string }
  }
}
export interface PartnerImpactRecord { id: string; project: string; contributionType: string; value: string; beneficiaries: number; outcome: string; status: string }
export interface PartnerProfile {
  name: string
  type: string
  logoUrl?: string
  location: string
  website: string
  contactPerson?: string
  email: string
  phone: string
  description: string
  expertise: string[]
  resources: string[]
  industries: string[]
  preferredCategories?: string[]
  collaborationTypes: string[]
  verified: boolean
}
export interface PartnerResource {
  id: string
  name: string
  type: string
  quantity: string
  availability: 'Available' | 'Committed' | 'Limited'
  contributionStatus: 'Available' | 'Offered' | 'Committed'
  relatedProject?: string
  addedDate: string
  notes?: string
}
export type WorkspaceTaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Submitted' | 'Completed'
export interface WorkspaceProject { id: string; title: string; problemTitle: string; description: string; category: string; location: string; university: string; facultyLead: string; studentTeam: string; stage: string; progress: number; nextMilestone: string; capabilityGaps: string[]; lastUpdated: string; expectedOutcome: string; beneficiaries: number; partners: string[] }
export interface WorkspaceMilestone { id: string; title: string; project: string; description: string; responsible: string; startDate: string; dueDate: string; completionDate?: string; status: 'Upcoming' | 'In Progress' | 'Delayed' | 'Submitted for Review' | 'Completed' | 'Pending' | 'Not Started'; progress: number }
export interface WorkspaceTask { id: string; title: string; project: string; description: string; assignedBy: string; priority: 'Low' | 'Medium' | 'High' | 'Critical'; dueDate: string; status: WorkspaceTaskStatus; progress: number; progressNote?: string }
export interface ProjectOutput { id: string; title: string; project: string; type: string; submittedBy: string; submissionDate: string; reviewStatus: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'; reviewerComments?: string; attachmentName?: string }
export interface WorkspaceTeam { id: string; name: string; project: string; facultyMentor: string; students: string[]; capabilities: string[]; missingCapabilities: string[]; status: string }
export interface WorkspaceCapabilityGap { id: string; project: string; required: string; currentLevel: string; missing: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; suggestedAction: string; status: string }
export interface PublicProblem extends Problem {
  beneficiaries: string
  requiredCapabilities: string[]
  currentStage: string
  relatedProjectIds?: string[]
}
export interface University {
  id: string
  name: string
  location: string
  description: string
  capabilities: string[]
  facultyCount: number
  activeProjects: number
  verified: boolean
  hei_id?: string
  district?: string
  state?: string
  institution_type?: string
  departments?: string[]
  available_skills?: string[]
  technical_domains?: string[]
  laboratories?: string[]
  equipment?: string[]
  software_tools?: string[]
  project_experience?: {
    completed_civic_projects?: number
    active_projects?: number
    complexity_level?: string
    [key: string]: unknown
  }
  available_faculty_capacity?: number
  verification_status?: string
  contact_email?: string | null
}
export type PartnerType = 'Industry' | 'MSME' | 'Startup' | 'Research Organization' | 'CSR Organization' | 'Non-profit Organization'
export interface Partner {
  id: string; name: string; type: PartnerType; location: string; description: string
  capabilities: string[]; collaborationAreas: string[]; verified: boolean
}
export interface Milestone { id: string; title: string; status: 'completed' | 'current' | 'upcoming'; dueDate?: string }
export interface Project {
  id: string; title: string; problemTitle: string; organization: string; status: ProjectStatus
  progress: number; currentMilestone: string; milestones?: Milestone[]
}
export interface Notification {
  id: string
  title: string
  description?: string
  message?: string
  type?: string
  read: boolean
  createdAt: string
  trackId?: string
  problemTitle?: string
  status?: string
  actionUrl?: string
  priority?: string
  readAt?: string
  relatedTrackId?: string
}

export interface BackendAlertResponse {
  id: number
  user_id?: number | null
  role?: string | null
  type: string
  title: string
  message: string
  related_track_id?: string | null
  related_entity_id?: string | null
  action_url?: string | null
  priority: string
  is_read: boolean
  read_at?: string | null
  is_dismissed: boolean
  event_key?: string | null
  created_at: string
}

export interface AlertItem {
  id: number
  userId?: number | null
  role?: string | null
  type: string
  title: string
  message: string
  relatedTrackId?: string | null
  relatedEntityId?: string | null
  actionUrl?: string | null
  priority: 'Low' | 'Normal' | 'Important' | 'Critical' | string
  isRead: boolean
  readAt?: string | null
  isDismissed: boolean
  eventKey?: string | null
  createdAt: string
}
export interface Capability { id: string; name: string; description?: string; icon?: LucideIcon }
export type ProjectWorkspaceStage = 'Proposal' | 'Team Formation' | 'Development' | 'Prototype' | 'Testing' | 'Pilot' | 'Deployment' | 'Impact Tracking' | 'Completed'
export interface WorkspaceProjectDetail { id: string; name: string; problemTitle: string; location: string; category: string; description: string; owner: string; university: string; facultyLead: string; startDate: string; expectedCompletion: string; stage: ProjectWorkspaceStage; progress: number; teamCount: number; completedTasks: number; documentCount: number; beneficiaries: number; health: 'Healthy' | 'At Risk' | 'Delayed' }
export interface ProjectWorkspaceMember { id: string; name: string; role: string; organization: string; skills: string[]; availability: string; responsibility: string; participation: string }
export interface ProjectWorkspaceMilestone { id: string; title: string; description: string; startDate: string; dueDate: string; status: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed' | 'Pending'; progress: number; assignedMembers: string[]; deliverables: string[]; comments: string }
export interface ProjectWorkspaceTask { id: string; title: string; description: string; assignedMember: string; priority: 'Low' | 'Medium' | 'High' | 'Critical'; dueDate: string; status: 'To Do' | 'In Progress' | 'Review' | 'Completed'; milestone: string; lastUpdated: string }
export interface ProjectWorkspaceDocument { id: string; name: string; type: string; uploadedBy: string; uploadDate: string; size: string; version: string; approvalStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Rejected' }
export interface ProjectDiscussion { id: string; title: string; author: string; timestamp: string; pinned: boolean; comments: { id: string; author: string; text: string; timestamp: string }[] }
export interface ProjectPartner { id: string; organization: string; type: string; contact: string; contributionType: string; status: string; resources: string[]; startDate: string }
export interface ProjectFeedback { id: string; source: string; rating: number; comments: string; submittedDate: string; category: string; helpful?: boolean }
