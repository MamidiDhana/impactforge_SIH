import type { CitizenProblem, CitizenProblemStatus, TrackingStage, AIPreScreeningInfo } from '../types'
import { buildInitialStages } from '../data/jharkhandData'

export interface BackendReportPayload {
  problem_title: string
  category?: string | null
  context_and_desired_outcome: string | null
  existing_efforts: string | null
  expected_outcome: string | null
  state: string
  district: string
  locality: string
  address_or_landmark: string
  latitude: number | null
  longitude: number | null
  priority?: string | null
}

export interface BackendReportResponse {
  track_id: string
  problem_title: string
  category: string
  context_and_desired_outcome: string | null
  existing_efforts: string | null
  expected_outcome: string | null
  state: string
  district: string
  locality: string
  address_or_landmark: string
  latitude: number | null
  longitude: number | null
  priority: string
  status: string
  verification_status?: string | null
  created_at: string
  updated_at: string
  citizen_id?: number | null
  assigned_to?: string | null
  assigned_role?: string | null
  assigned_by?: string | null
  assigned_at?: string | null
  official_remarks?: string | null
  remarks_updated_by?: string | null
  remarks_updated_at?: string | null
  resolved_at?: string | null
  // AI Categorization fields (Phase 1 Part 1)
  ai_category?: string | null
  ai_subcategory?: string | null
  ai_problem_type?: string | null
  ai_summary?: string | null
  ai_confidence_score?: number | null
  ai_analysis_status?: string | null
  ai_model?: string | null
  ai_analyzed_at?: string | null
  // AI Priority Scoring fields (Phase 1 Part 2)
  ai_priority?: 'Low' | 'Medium' | 'High' | 'Critical' | string | null
  ai_priority_score?: number | null
  ai_priority_reasons?: string[] | null
  ai_priority_factors?: PriorityFactors | null
  ai_priority_status?: string | null
  ai_priority_model?: string | null
  ai_priority_analyzed_at?: string | null
  // AI Similar-Problem Detection fields (Phase 1 Part 3)
  ai_similarity_status?: string | null
  ai_similarity_matches?: SimilarProblemMatch[] | null
  ai_similarity_model?: string | null
  ai_similarity_analyzed_at?: string | null
  // AI Official Duplicate Analysis fields (Phase 1 Part 4)
  ai_duplicate_status?: string | null
  ai_duplicate_candidates?: DuplicateCandidate[] | null
  ai_duplicate_model?: string | null
  ai_duplicate_analyzed_at?: string | null
  // AI Capability Extraction fields (Phase 1 Part 5)
  ai_capability_status?: string | null
  ai_capabilities?: ExtractedCapabilities | null
  ai_capability_confidence?: number | null
  ai_capability_reasons?: string[] | null
  ai_capability_model?: string | null
  ai_capability_analyzed_at?: string | null
  // AI HEI Matching fields (Phase 1 Part 6)
  ai_hei_matching_status?: string | null
  ai_hei_matches?: HEIRecommendationMatch[] | null
  ai_hei_matching_model?: string | null
  ai_hei_matching_analyzed_at?: string | null
  // AI Faculty & Student Matching fields (Phase 1 Part 7)
  ai_faculty_matching_status?: string | null
  ai_faculty_matches?: FacultyRecommendationMatch[] | null
  ai_student_matches?: StudentRecommendationMatch[] | null
  ai_faculty_matching_model?: string | null
  ai_faculty_matching_analyzed_at?: string | null
  // AI Capability-Gap Analysis fields (Phase 1 Part 8)
  ai_capability_gap_status?: string | null
  ai_capability_gap_analysis?: CapabilityGapAnalysis | null
  ai_capability_gap_score?: number | null
  ai_capability_gap_severity?: 'minimal' | 'moderate' | 'significant' | 'critical' | string | null
  ai_capability_gap_model?: string | null
  ai_capability_gap_analyzed_at?: string | null
  // AI Partner Matching fields (Phase 1 Part 9)
  ai_partner_matching_status?: string | null
  ai_partner_matches?: PartnerRecommendationMatch[] | null
  ai_partner_matching_model?: string | null
  ai_partner_matching_analyzed_at?: string | null
  // AI Dynamic Re-Matching fields (Phase 1 Part 10)
  ai_rematching_status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | string | null
  ai_last_rematched_at?: string | null
  ai_rematching_reason?: string | null
  ai_rematching_version?: number | null
  // AI Project and Impact Analytics fields (Phase 1 Part 11)
  ai_project_analytics_status?: string | null
  ai_project_analytics?: ProjectAnalyticsDetail | null
  ai_project_feasibility_score?: number | null
  ai_project_impact_score?: number | null
  ai_project_readiness_score?: number | null
  ai_project_risk_score?: number | null
  ai_project_analytics_model?: string | null
  ai_project_analytics_analyzed_at?: string | null
  // AI Problem Routing & Dashboard Assignment fields (Government Validation Flow)
  routing_target?: 'university' | 'partner' | 'both' | 'neither' | null
  requires_funding?: boolean | null
  university_can_solve?: boolean | null
  ai_routing_reason?: string | null
  ai_routing_analyzed_at?: string | null
  ai_routing_model?: string | null
  // AI Pre-Screening summary
  ai_pre_screening?: AIPreScreeningResult | null
}

export type AIPreScreeningResult = AIPreScreeningInfo


export interface OfficialReviewDetail {
  decision: 'confirm_duplicate' | 'not_duplicate' | 'needs_review'
  reviewed_by_id: number
  reviewed_by_email: string
  reviewed_by_role: string
  official_remarks: string
  reviewed_at: string
}

export interface DuplicateCandidate {
  matching_track_id: string
  similarity_score: number
  duplicate_classification:
    | 'not_duplicate'
    | 'possible_duplicate'
    | 'likely_duplicate'
    | 'confirmed_duplicate_candidate'
    | string
  reasons: string[]
  current_status: string
  current_priority: string
  district_location: string
  created_date: string
  title?: string | null
  category?: string | null
  official_review?: OfficialReviewDetail | null
}

export interface DuplicateAnalysisResponse {
  track_id: string
  ai_duplicate_status: string
  ai_duplicate_model?: string | null
  ai_duplicate_analyzed_at?: string | null
  total_candidates: number
  candidates: DuplicateCandidate[]
}

export interface DuplicateReviewPayload {
  candidate_track_id: string
  decision: 'confirm_duplicate' | 'not_duplicate' | 'needs_review'
  official_remarks: string
}

export interface ExtractedCapabilities {
  skills: string[]
  technical_domains: string[]
  equipment: string[]
  materials: string[]
  software_tools: string[]
  manpower: string[]
  complexity: 'low' | 'medium' | 'high'
  estimated_duration_days?: number | null
  budget_min?: number | null
  budget_max?: number | null
  safety_requirements: string[]
  department_domain: string
}

export interface CapabilityResponse {
  track_id: string
  ai_capability_status: string
  ai_capabilities: ExtractedCapabilities
  ai_capability_confidence: number
  ai_capability_reasons: string[]
  ai_capability_model?: string | null
  ai_capability_analyzed_at?: string | null
  disclaimer: string
}

export interface HEIFactorScores {
  skills: number
  technical_domains: number
  equipment: number
  software: number
  location: number
  complexity: number
}

export interface MatchedCapabilityDetails {
  matched_skills: string[]
  matched_domains: string[]
  matched_equipment: string[]
  matched_software: string[]
}

export interface MissingCapabilityDetails {
  missing_skills: string[]
  missing_domains: string[]
  missing_equipment: string[]
  missing_software: string[]
}

export interface HEIRecommendationMatch {
  hei_id: string
  hei_name: string
  district: string
  state: string
  institution_type: string
  verification_status: string
  match_score: number
  recommendation_level: 'low' | 'moderate' | 'strong' | 'excellent'
  factor_scores: HEIFactorScores
  matched_capabilities: MatchedCapabilityDetails
  missing_capabilities: MissingCapabilityDetails
  reasons: string[]
  confidence: number
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
  }
  available_faculty_capacity?: number
  contact_email?: string | null
}

export interface BackendAuditLog {
  id: number
  actor_user_id?: number | null
  actor_email?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  metadata_json?: string | null
  created_at: string
}

export interface HEIInterestRecord {
  id?: number | null
  hei_id: string
  hei_name: string
  action_type: 'official_recommendation' | 'expression_of_interest' | string
  actor_user_id?: number | null
  actor_name: string
  actor_role: string
  actor_email: string
  remarks: string
  created_at: string
}

export interface HEIMatchingResponse {
  track_id: string
  ai_hei_matching_status: 'completed' | 'needs_review' | 'pending' | 'no_matches' | 'failed' | 'unavailable' | string
  matches: HEIRecommendationMatch[]
  recorded_interests: HEIInterestRecord[]
  model?: string | null
  analyzed_at?: string | null
  disclaimer: string
}

export interface HEIInterestPayload {
  hei_id: string
  remarks: string
}

export interface HEIInterestResponse {
  status: string
  action_type: string
  track_id: string
  hei_id: string
  hei_name: string
  recorded_by: string
  remarks: string
  created_at: string
  disclaimer: string
}

export interface FacultyFactorScores {
  skills: number
  technical_domains: number
  relevant_experience: number
  availability_workload: number
  location_hei_relevance: number
}

export interface StudentFactorScores {
  skills: number
  technical_domains: number
  student_interests: number
  availability_workload: number
  location_hei_relevance: number
}

export interface FacultyRecommendationMatch {
  faculty_id: string
  name: string
  institution_id: string
  institution_name: string
  department: string
  district: string
  state: string
  verification_status: string
  availability: string
  current_workload: number
  research_expertise: string[]
  match_score: number
  recommendation_level: 'low' | 'moderate' | 'strong' | 'excellent' | string
  factor_scores: FacultyFactorScores
  matched_skills: string[]
  missing_skills: string[]
  reasons: string[]
  confidence: number
}

export interface StudentRecommendationMatch {
  student_id: string
  name: string
  institution_id: string
  institution_name: string
  department: string
  district: string
  state: string
  verification_status: string
  availability: string
  current_workload: number
  interests: string[]
  match_score: number
  recommendation_level: 'low' | 'moderate' | 'strong' | 'excellent' | string
  factor_scores: StudentFactorScores
  matched_skills: string[]
  missing_skills: string[]
  reasons: string[]
  confidence: number
}

export interface FacultyInterestRecord {
  id?: number | null
  report_id?: number | null
  track_id: string
  faculty_id: string
  faculty_name: string
  institution_id: string
  action_type: 'official_recommendation' | 'expression_of_interest' | string
  actor_user_id?: number | null
  actor_name: string
  actor_role: string
  actor_email: string
  remarks: string
  created_at: string
}

export interface StudentInterestRecord {
  id?: number | null
  report_id?: number | null
  track_id: string
  student_id: string
  student_name: string
  institution_id: string
  action_type: 'official_recommendation' | 'expression_of_interest' | string
  actor_user_id?: number | null
  actor_name: string
  actor_role: string
  actor_email: string
  remarks: string
  created_at: string
}

export interface FacultyMatchingResponse {
  track_id: string
  ai_faculty_matching_status: 'completed' | 'needs_review' | 'pending' | 'no_matches' | 'failed' | 'unavailable' | string
  matches: FacultyRecommendationMatch[]
  recorded_interests: FacultyInterestRecord[]
  model?: string | null
  analyzed_at?: string | null
  disclaimer: string
}

export interface StudentMatchingResponse {
  track_id: string
  ai_student_matching_status: 'completed' | 'needs_review' | 'pending' | 'no_matches' | 'failed' | 'unavailable' | string
  matches: StudentRecommendationMatch[]
  recorded_interests: StudentInterestRecord[]
  model?: string | null
  analyzed_at?: string | null
  disclaimer: string
}

export interface FacultyInterestPayload {
  faculty_id: string
  remarks: string
}

export interface FacultyInterestResponse {
  status: string
  action_type: string
  track_id: string
  faculty_id: string
  faculty_name: string
  recorded_by: string
  remarks: string
  created_at: string
  disclaimer: string
}

export interface StudentInterestPayload {
  student_id: string
  remarks: string
}

export interface StudentInterestResponse {
  status: string
  action_type: string
  track_id: string
  student_id: string
  student_name: string
  recorded_by: string
  remarks: string
  created_at: string
  disclaimer: string
}

export interface CapabilityGapFactorScores {
  skills_coverage: number
  domains_coverage: number
  equipment_coverage: number
  software_coverage: number
  manpower_coverage: number
  safety_coverage: number
  materials_coverage: number
}

export interface PartialSkillMatch {
  required_skill: string
  matched_domain_or_competency: string
  relevance_note: string
}

export interface VerificationSummary {
  has_unverified_entities: boolean
  verified_count: number
  unverified_count: number
  verification_notes: string
}

export interface CapabilityGapAnalysis {
  coverage_score: number
  gap_percentage: number
  gap_severity: 'minimal' | 'moderate' | 'significant' | 'critical' | string
  factor_scores: CapabilityGapFactorScores
  available_skills: string[]
  missing_skills: string[]
  partially_available_skills: PartialSkillMatch[]
  missing_technical_domains: string[]
  missing_equipment: string[]
  missing_software_tools: string[]
  missing_manpower: string[]
  missing_materials: string[]
  missing_budget?: string | null
  missing_safety_expertise: string[]
  missing_department_support: string[]
  covered_capabilities: Record<string, any>
  missing_capabilities: Record<string, any>
  recommended_actions: string[]
  required_external_support: string[]
  verification_summary: VerificationSummary
  confidence: number
  explanation: string
}

export interface CapabilityGapResponse {
  track_id: string
  ai_capability_gap_status: 'completed' | 'needs_review' | 'pending' | 'failed' | 'unavailable' | string
  gap_score?: number | null
  coverage_score?: number | null
  gap_severity?: 'minimal' | 'moderate' | 'significant' | 'critical' | string | null
  analysis?: CapabilityGapAnalysis | null
  model?: string | null
  analyzed_at?: string | null
  disclaimer: string
}

export interface CitizenCapabilityGapResponse {
  track_id: string
  ai_capability_gap_status: string
  coverage_score?: number | null
  gap_severity?: string | null
  summary_of_covered_needs: string[]
  summary_of_missing_needs: string[]
  required_support_types: string[]
  explanation: string
  disclaimer: string
}

export interface PartnerFactorScores {
  equipment_and_materials_score: number
  funding_and_budget_score: number
  domain_and_skills_score: number
  manpower_and_operations_score: number
  location_relevance_score: number
  experience_and_reliability_score: number
  total_score: number
}

export interface PartnerRecommendationMatch {
  partner_id: string
  organization_name: string
  partner_type: string
  location: string
  service_districts: string[]
  score: number
  match_level: 'low' | 'moderate' | 'strong' | 'excellent' | string
  matched_support_areas: string[]
  missing_support_areas: string[]
  estimated_support_type: string
  explanation: string
  rationale: string[]
  confidence: number
  verification_status: string
  funding_capacity: string
  maximum_project_budget: number
  availability: string
  factor_scores: PartnerFactorScores
  contact_email?: string | null
}

export interface CitizenPartnerRecommendation {
  partner_id: string
  organization_name: string
  partner_type: string
  location: string
  score: number
  match_level: string
  matched_support_areas: string[]
  estimated_support_type: string
  explanation: string
  verification_status: string
}

export interface PartnerInterestRecord {
  id: number
  report_id: number
  track_id: string
  partner_id: string
  partner_name: string
  support_type: string
  proposed_amount?: number | null
  proposed_resources: string[]
  notes: string
  status: string
  created_by: string
  creator_user_id?: number | null
  creator_role: string
  created_at: string
  updated_at: string
}

export interface PartnerMatchingResponse {
  track_id: string
  status: string
  model?: string | null
  analyzed_at?: string | null
  total_evaluated_partners: number
  recommendations: PartnerRecommendationMatch[]
  registered_interests: PartnerInterestRecord[]
  advisory_warning: string
}

export interface CitizenPartnerMatchingResponse {
  track_id: string
  status: string
  recommendations: CitizenPartnerRecommendation[]
  advisory_warning: string
}

export interface PartnerInterestPayload {
  partner_id: string
  support_type: string
  proposed_amount?: number
  proposed_resources?: string[]
  notes?: string
}

export interface PartnerInterestUpdatePayload {
  status?: string
  proposed_amount?: number
  proposed_resources?: string[]
  notes?: string
}

export interface PartnerInterestActionResponse {
  success: boolean
  message: string
  interest?: PartnerInterestRecord | null
}

// ==============================================================================
// Phase 1 Part 10: Dynamic Re-Matching Interfaces
// ==============================================================================

export interface RematchingDiffItem {
  entity_id: string
  entity_name: string
  change_type: 'added' | 'removed' | 'score_changed' | 'rank_changed' | 'unchanged' | string
  old_score?: number | null
  new_score?: number | null
  old_level?: string | null
  new_level?: string | null
  notes?: string | null
}

export interface RematchingDiffSummary {
  hei_diffs: RematchingDiffItem[]
  faculty_diffs: RematchingDiffItem[]
  student_diffs: RematchingDiffItem[]
  partner_diffs: RematchingDiffItem[]
  capability_gap_diff?: {
    old_coverage?: number
    new_coverage?: number
    coverage_delta?: number
    old_severity?: string
    new_severity?: string
    severity_changed?: boolean
  } | null
  total_added: number
  total_removed: number
  total_changed: number
}

export interface RematchingEventRecord {
  id: number
  report_id: number
  track_id: string
  trigger_type: string
  trigger_source: string
  changed_fields: string[]
  affected_matching_types: string[]
  previous_matching_snapshot: Record<string, any>
  new_matching_snapshot: Record<string, any>
  diff_summary?: RematchingDiffSummary | null
  status: string
  error_message?: string | null
  created_at: string
  completed_at?: string | null
  created_by: string
}

export interface CitizenRematchingEventRecord {
  id: number
  track_id: string
  trigger_type: string
  changed_fields: string[]
  affected_matching_types: string[]
  status: string
  summary_notes: string
  created_at: string
  completed_at?: string | null
}

export interface RematchingStatusResponse {
  track_id: string
  ai_rematching_status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | string
  ai_rematching_version: number
  ai_last_rematched_at?: string | null
  ai_rematching_reason?: string | null
  latest_event?: RematchingEventRecord | null
  advisory_warning: string
}

export interface RematchingHistoryResponse {
  track_id: string
  total_events: number
  events: RematchingEventRecord[]
  advisory_warning: string
}

export interface CitizenRematchingHistoryResponse {
  track_id: string
  total_events: number
  events: CitizenRematchingEventRecord[]
  advisory_warning: string
}

export interface ManualRematchRequest {
  reason?: string
  affected_types?: string[]
}

export interface ManualRematchResponse {
  success: boolean
  message: string
  version: number
  event?: RematchingEventRecord | null
  diff_summary?: RematchingDiffSummary | null
  advisory_warning: string
}


export interface SimilarProblemMatch {
  matching_track_id: string
  similarity_score: number
  similarity_level: 'possible similarity' | 'strong similarity' | 'probable duplicate' | string
  category: string
  district: string
  location: string
  title: string
  status: string
}

export interface SimilarProblemsResponse {
  track_id: string
  status: 'completed' | 'no_matches' | 'needs_review' | 'failed' | 'pending' | 'unavailable' | string
  matches: SimilarProblemMatch[]
  model?: string | null
  analyzed_at?: string | null
  disclaimer: string
}

export interface PriorityFactors {
  safety_risk: number
  affected_people: number
  urgency_indicators: number
  infrastructure_impact: number
}

export interface ReportAIPriority {
  track_id: string
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | string | null
  score?: number | null
  factors?: PriorityFactors | null
  reasons: string[]
  status: 'completed' | 'needs_review' | 'failed' | 'skipped' | 'pending' | 'unavailable' | string
  model?: string | null
  analyzed_at?: string | null
}

export interface ReportAIAnalysis {
  track_id: string
  category?: string | null
  subcategory?: string | null
  problem_type?: string | null
  short_summary?: string | null
  confidence_score?: number | null
  analysis_status: 'completed' | 'needs_review' | 'failed' | 'skipped' | 'pending' | string
  model?: string | null
  analyzed_at?: string | null
}

export interface ReportStatusHistoryItem {
  id: number
  report_id: number
  previous_status: string | null
  new_status: string
  changed_by: string | null
  changed_at: string
  remarks: string | null
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

/**
 * Parses and formats error messages returned by the backend (specifically 422 validation errors).
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json()
    if (errorData?.detail) {
      if (Array.isArray(errorData.detail)) {
        const issues = errorData.detail.map((err: { loc?: string[]; msg?: string }) => {
          const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : ''
          return field ? `${field}: ${err.msg}` : (err.msg || 'Invalid field')
        })
        return `Validation Error (422): ${issues.join(' | ')}`
      }
      if (typeof errorData.detail === 'string') {
        return errorData.detail
      }
    }
  } catch {
    // If response is not JSON
  }
  return `Server request failed with status ${response.status} (${response.statusText})`
}

/**
 * Submits a new problem report to the FastAPI backend.
 * Calls POST /api/reports
 */
export async function createReport(payload: BackendReportPayload): Promise<BackendReportResponse> {
  const url = `${API_BASE_URL}/api/reports`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. Ensure the server is running. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Fetches an individual problem report by its backend Track ID.
 * Calls GET /api/reports/{track_id}
 */
export async function getReportByTrackId(trackId: string): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (response.status === 404) {
    throw new Error(`Report with Track ID "${trackId}" not found. Please verify the ID.`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

export interface ReportFilterOptions {
  district?: string
  status?: string
  category?: string
  priority?: string
  target_dashboard?: 'university' | 'partner'
  limit?: number
  skip?: number
}

/**
 * Fetches problem reports from the backend with optional portal filtering.
 * Calls GET /api/reports with limit=1000 by default so all live records are fetched.
 */
export async function getReports(filters?: ReportFilterOptions): Promise<BackendReportResponse[]> {
  const queryParams = new URLSearchParams()
  if (filters) {
    if (filters.district) queryParams.set('district', filters.district)
    if (filters.status) queryParams.set('status', filters.status)
    if (filters.category) queryParams.set('category', filters.category)
    if (filters.priority) queryParams.set('priority', filters.priority)
    if (filters.target_dashboard) queryParams.set('target_dashboard', filters.target_dashboard)
    if (filters.limit) queryParams.set('limit', String(filters.limit))
    if (filters.skip) queryParams.set('skip', String(filters.skip))
  }
  if (!queryParams.has('limit')) {
    queryParams.set('limit', '1000')
  }
  const queryString = queryParams.toString()
  const url = `${API_BASE_URL}/api/reports${queryString ? `?${queryString}` : ''}`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse[]
}

/**
 * Filter strictly to actual problems/reports submitted from the Citizen Portal.
 * Excludes automated test scripts, mock resiliency records, internal synthetic tests,
 * and demo/test entries.
 */
export function isCitizenSubmittedReport(report: BackendReportResponse): boolean {
  const title = (report.problem_title || '').trim().toLowerCase()
  const trackId = (report.track_id || '').trim().toUpperCase()

  const testKeywords = [
    'ai failure resiliency',
    'resiliency test',
    'resilience test',
    'gov user',
    'gov problem',
    'gov hei',
    'citizen own',
    "citizen's own",
    'other citizen',
    'raw test',
    'automated test',
    'synthetic test',
    'demo test',
    'mock report',
    'pending unvalidated',
  ]
  if (
    title.startsWith('test:') ||
    title.startsWith('test -') ||
    title.startsWith('[test]') ||
    testKeywords.some((kw) => title.includes(kw))
  ) {
    return false
  }

  const syntheticTrackIdPatterns = [
    'TEST',
    'NOMUT',
    'STUHEI',
    'STUREC',
    'HEICROSS',
    'FACOTH',
    'FACSELF',
    'GOVREC',
    'MINE',
    'OTHER',
    'MUT-',
    'GOV-',
    'OWN-',
    'DEMO',
  ]
  if (syntheticTrackIdPatterns.some((pattern) => trackId.includes(pattern))) {
    return false
  }

  return true
}

/**
 * Deduplicates an array of reports by normalized problem title, picking the single
 * most authoritative canonical representative (preferring In Progress / Open over
 * Resolved / Rejected, then latest timestamp, then stable Track ID comparison).
 * Underlying citizen reports in the PostgreSQL database are intentionally preserved.
 */
export function deduplicateReports(reports: BackendReportResponse[]): BackendReportResponse[] {
  const getStatusPriority = (status: string | null | undefined): number => {
    const s = (status || '').trim().toLowerCase()
    if (s === 'in progress') return 3
    if (s === 'open' || s === 'under review' || s === 'pending') return 2
    if (s === 'resolved') return 1
    if (s === 'rejected') return 0
    return 2
  }

  const getReportTimestamp = (report: BackendReportResponse): number => {
    const ts = report.updated_at || report.created_at
    if (!ts) return 0
    const time = new Date(ts).getTime()
    return isNaN(time) ? 0 : time
  }

  // Group reports by normalized problem title (trimmed whitespace)
  const titleGroups = new Map<string, BackendReportResponse[]>()
  for (const report of reports) {
    const normalizedKey = (report.problem_title || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (!normalizedKey) continue
    const group = titleGroups.get(normalizedKey)
    if (!group) {
      titleGroups.set(normalizedKey, [report])
    } else {
      group.push(report)
    }
  }

  const representatives: BackendReportResponse[] = []

  for (const items of titleGroups.values()) {
    if (items.length === 1) {
      representatives.push(items[0])
      continue
    }

    // Sort items to pick the single best representative
    const sorted = [...items].sort((a, b) => {
      const priorityDiff = getStatusPriority(b.status) - getStatusPriority(a.status)
      if (priorityDiff !== 0) return priorityDiff

      const timeDiff = getReportTimestamp(b) - getReportTimestamp(a)
      if (timeDiff !== 0) return timeDiff

      return (b.track_id || '').localeCompare(a.track_id || '')
    })

    representatives.push(sorted[0])
  }

  // Sort representatives newest first for dashboard presentation
  representatives.sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a))

  return representatives
}

/**
 * Validates a problem report and triggers the AI decision routing.
 * Calls PATCH /api/reports/{track_id}/verify with verification_status='Verified'
 */
export async function validateAndRouteProblem(
  trackId: string,
  officialRemarks?: string
): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/verify`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        verification_status: 'Verified',
        official_remarks: officialRemarks || 'Problem validated by Jharkhand District Innovation Cell.',
      }),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Triggers or re-evaluates AI routing for a specific report.
 * Calls POST /api/reports/{track_id}/ai-route
 */
export async function triggerAIRouting(trackId: string): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/ai-route`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Updates the resolution status of a problem report in the backend.
 * Calls PATCH /api/reports/{track_id}/status
 */
export async function updateReportStatus(
  trackId: string,
  status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected' | 'Validated',
  remarks?: string
): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/status`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status, remarks }),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Assigns a problem report to an officer, department, HEI, faculty, or partner.
 * Calls PATCH /api/reports/{track_id}/assign
 */
export async function assignReport(
  trackId: string,
  assignedTo: string,
  assignedRole?: string,
  remarks?: string
): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/assign`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        assigned_to: assignedTo,
        assigned_role: assignedRole,
        remarks,
      }),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Updates official remarks for a problem report.
 * Calls PATCH /api/reports/{track_id}/remarks
 */
export async function updateOfficialRemarks(
  trackId: string,
  officialRemarks: string
): Promise<BackendReportResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/remarks`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ official_remarks: officialRemarks }),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as BackendReportResponse
}

/**
 * Fetches status audit history for a problem report.
 * Calls GET /api/reports/{track_id}/history
 */
export async function getReportHistory(trackId: string): Promise<ReportStatusHistoryItem[]> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/history`
  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText)
  }

  return (await response.json()) as ReportStatusHistoryItem[]
}

/**
 * Fetches AI problem categorization analysis for a report.
 * Calls GET /api/reports/{track_id}/ai-analysis
 */
export async function getReportAIAnalysis(
  trackId: string,
  token?: string
): Promise<ReportAIAnalysis> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/ai-analysis`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      // Return a graceful fallback object instead of throwing
      return {
        track_id: trackId,
        category: null,
        subcategory: null,
        problem_type: null,
        short_summary: 'AI analysis is currently unavailable or pending review.',
        confidence_score: null,
        analysis_status: 'unavailable',
        model: null,
        analyzed_at: null,
      }
    }

    return (await response.json()) as ReportAIAnalysis
  } catch (err: unknown) {
    console.warn(`Could not fetch AI analysis for ${trackId}:`, err)
    return {
      track_id: trackId,
      category: null,
      subcategory: null,
      problem_type: null,
      short_summary: 'AI analysis is currently unavailable.',
      confidence_score: null,
      analysis_status: 'unavailable',
      model: null,
      analyzed_at: null,
    }
  }
}

/**
 * Fetches AI-assisted priority and urgency scoring for a report.
 * Calls GET /api/reports/{track_id}/ai-priority
 */
export async function getReportAIPriority(
  trackId: string,
  token?: string
): Promise<ReportAIPriority> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/ai-priority`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      return {
        track_id: trackId,
        priority: null,
        score: null,
        factors: null,
        reasons: [],
        status: 'unavailable',
        model: null,
        analyzed_at: null,
      }
    }

    return (await response.json()) as ReportAIPriority
  } catch (err: unknown) {
    console.warn(`Could not fetch AI priority for ${trackId}:`, err)
    return {
      track_id: trackId,
      priority: null,
      score: null,
      factors: null,
      reasons: [],
      status: 'unavailable',
      model: null,
      analyzed_at: null,
    }
  }
}

/**
 * Fetches AI-detected similar problems for a report.
 * Calls GET /api/reports/{track_id}/similar-problems
 */
export async function getSimilarProblems(
  trackId: string,
  token?: string
): Promise<SimilarProblemsResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/similar-problems`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      return {
        track_id: trackId,
        status: 'unavailable',
        matches: [],
        model: null,
        analyzed_at: null,
        disclaimer: 'Possible similar reports found. Please review before taking action.',
      }
    }

    return (await response.json()) as SimilarProblemsResponse
  } catch (err: unknown) {
    console.warn(`Could not fetch similar problems for ${trackId}:`, err)
    return {
      track_id: trackId,
      status: 'unavailable',
      matches: [],
      model: null,
      analyzed_at: null,
      disclaimer: 'Possible similar reports found. Please review before taking action.',
    }
  }
}

/**
 * Fetches official duplicate analysis for a report (Government & Super Admin only).
 * Calls GET /api/reports/{track_id}/duplicate-analysis
 */
export async function getDuplicateAnalysis(
  trackId: string,
  token?: string
): Promise<DuplicateAnalysisResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/duplicate-analysis`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch duplicate analysis (${response.status})`)
  }

  return (await response.json()) as DuplicateAnalysisResponse
}

/**
 * Submits an official decision on a duplicate candidate (Government & Super Admin only).
 * Calls PATCH /api/reports/{track_id}/duplicate-review
 */
export async function submitDuplicateReview(
  trackId: string,
  payload: DuplicateReviewPayload,
  token?: string
): Promise<DuplicateAnalysisResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/duplicate-review`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to submit duplicate review (${response.status})`)
  }

  return (await response.json()) as DuplicateAnalysisResponse
}

/**
 * Fetches AI capability and resource requirements for a report.
 * Calls GET /api/reports/{track_id}/capabilities
 */
export async function getReportCapabilities(
  trackId: string,
  token?: string
): Promise<CapabilityResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/capabilities`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch capability extraction (${response.status})`)
  }

  return (await response.json()) as CapabilityResponse
}

/**
 * Fetches AI-recommended Higher Education Institutions for a report.
 * Calls GET /api/reports/{track_id}/hei-matches
 */
export async function getHEIMatches(
  trackId: string,
  token?: string
): Promise<HEIMatchingResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/hei-matches`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch HEI matches (${response.status})`)
  }

  return (await response.json()) as HEIMatchingResponse
}

/**
 * Submits an official HEI recommendation (Gov/Admin) or expression of interest (HEI).
 * Calls POST /api/reports/{track_id}/hei-interest
 */
export async function submitHEIInterest(
  trackId: string,
  payload: HEIInterestPayload,
  token?: string
): Promise<HEIInterestResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/hei-interest`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to record HEI interest (${response.status})`)
  }

  return (await response.json()) as HEIInterestResponse
}

/**
 * Fetches AI-recommended Faculty matches for a report.
 * Calls GET /api/reports/{track_id}/faculty-matches
 */
export async function getFacultyMatches(
  trackId: string,
  token?: string
): Promise<FacultyMatchingResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/faculty-matches`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch faculty matches (${response.status})`)
  }

  return (await response.json()) as FacultyMatchingResponse
}

/**
 * Fetches AI-recommended Student matches for a report.
 * Calls GET /api/reports/{track_id}/student-matches
 */
export async function getStudentMatches(
  trackId: string,
  token?: string
): Promise<StudentMatchingResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/student-matches`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch student matches (${response.status})`)
  }

  return (await response.json()) as StudentMatchingResponse
}

/**
 * Submits an official Faculty recommendation (Gov/Admin) or expression of interest (HEI/Faculty).
 * Calls POST /api/reports/{track_id}/faculty-interest
 */
export async function submitFacultyInterest(
  trackId: string,
  payload: FacultyInterestPayload,
  token?: string
): Promise<FacultyInterestResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/faculty-interest`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to submit faculty interest (${response.status})`)
  }

  return (await response.json()) as FacultyInterestResponse
}

/**
 * Submits an official Student recommendation (Gov/Admin) or expression of interest (HEI/Student).
 * Calls POST /api/reports/{track_id}/student-interest
 */
export async function submitStudentInterest(
  trackId: string,
  payload: StudentInterestPayload,
  token?: string
): Promise<StudentInterestResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/student-interest`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to submit student interest (${response.status})`)
  }

  return (await response.json()) as StudentInterestResponse
}

/**
 * Fetches AI capability-gap analysis for a report.
 * Calls GET /api/reports/{track_id}/capability-gaps
 */
export async function getCapabilityGaps(
  trackId: string,
  token?: string
): Promise<CapabilityGapResponse | CitizenCapabilityGapResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/capability-gaps`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch capability gaps (${response.status})`)
  }

  return (await response.json()) as CapabilityGapResponse | CitizenCapabilityGapResponse
}

/**
 * Triggers on-demand AI capability-gap analysis for a report.
 * Calls POST /api/reports/{track_id}/capability-gaps/analyze
 */
export async function triggerCapabilityGapAnalysis(
  trackId: string,
  token?: string
): Promise<CapabilityGapResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/capability-gaps/analyze`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to trigger capability gap analysis (${response.status})`)
  }

  return (await response.json()) as CapabilityGapResponse
}

/**
 * Fetches AI-recommended partner matches for a report.
 * Calls GET /api/reports/{track_id}/partner-matches
 */
export async function getPartnerMatches(
  trackId: string,
  token?: string
): Promise<PartnerMatchingResponse | CitizenPartnerMatchingResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/partner-matches`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch partner matches (${response.status})`)
  }

  return (await response.json()) as PartnerMatchingResponse | CitizenPartnerMatchingResponse
}

/**
 * Submits an expression of partner interest (Partner) or administrative recommendation (Gov/Admin).
 * Calls POST /api/reports/{track_id}/partner-interest
 */
export async function submitPartnerInterest(
  trackId: string,
  payload: PartnerInterestPayload,
  token?: string
): Promise<PartnerInterestActionResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/partner-interest`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to submit partner interest (${response.status})`)
  }

  return (await response.json()) as PartnerInterestActionResponse
}

/**
 * Updates a partner interest proposal (reviewing/approving by Gov/Admin or editing by Partner).
 * Calls PATCH /api/reports/{track_id}/partner-interest/{interest_id}
 */
export async function updatePartnerInterest(
  trackId: string,
  interestId: number,
  payload: PartnerInterestUpdatePayload,
  token?: string
): Promise<PartnerInterestActionResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/partner-interest/${interestId}`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to update partner interest (${response.status})`)
  }

  return (await response.json()) as PartnerInterestActionResponse
}

/**
 * Maps a backend report response into the frontend CitizenProblem format,
 * calculating appropriate 15-stage timeline and location details for UI presentation.
 */
export function mapBackendReportToCitizenProblem(report: BackendReportResponse): CitizenProblem {
  const createdDate = new Date(report.created_at)
  const dateStr = !isNaN(createdDate.getTime())
    ? `${createdDate.getDate()} ${createdDate.toLocaleString('en-US', { month: 'short' })} ${createdDate.getFullYear()}`
    : 'Recent'

  const stages: TrackingStage[] = buildInitialStages(0, dateStr)

  let stageIndex = 1
  if (report.status === 'In Progress') {
    stageIndex = 7
    for (let i = 0; i <= 6; i++) {
      if (stages[i]) {
        stages[i].status = 'Completed'
        stages[i].date = dateStr
      }
    }
    if (stages[7]) {
      stages[7].status = 'In Progress'
      stages[7].date = dateStr
    }
  } else if (report.status === 'Resolved') {
    stageIndex = 14
    for (let i = 0; i < stages.length; i++) {
      stages[i].status = 'Completed'
      stages[i].date = dateStr
    }
  } else if (report.status === 'Validated') {
    stageIndex = 3
    for (let i = 0; i <= 3; i++) {
      if (stages[i]) {
        stages[i].status = 'Completed'
        stages[i].date = dateStr
      }
    }
    if (stages[4]) {
      stages[4].status = 'In Progress'
      stages[4].date = dateStr
    }
  } else if (report.status === 'Rejected') {
    stageIndex = 0
    if (stages[0]) {
      stages[0].status = 'Completed'
      stages[0].date = dateStr
    }
  } else {
    // Open / Submitted: AI Pre-Screening has completed immediately after citizen submission,
    // and the problem is now Pending Government Verification.
    stageIndex = 2
    if (stages[0]) {
      stages[0].status = 'Completed'
      stages[0].date = dateStr
    }
    if (stages[1]) {
      stages[1].status = 'Completed'
      stages[1].date = dateStr
    }
    if (stages[2]) {
      stages[2].status = 'In Progress'
      stages[2].date = dateStr
    }
  }

  const priorityNormalized = (['Low', 'Medium', 'High', 'Critical'].includes(report.priority)
    ? report.priority
    : 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical'

  const preScreening = report.ai_pre_screening || (report.ai_category ? {
    status: report.ai_analysis_status || 'completed',
    category: report.ai_category || report.category,
    subcategory: report.ai_subcategory,
    problem_type: report.ai_problem_type,
    confidence_score: report.ai_confidence_score,
    priority: (report.ai_priority || priorityNormalized) as any,
    priority_score: report.ai_priority_score,
    priority_reasons: report.ai_priority_reasons,
    has_similar_live_problem: (report.ai_similarity_matches && report.ai_similarity_matches.length > 0 && report.ai_similarity_matches[0].similarity_score >= 0.55) || false,
    top_similarity_score: report.ai_similarity_matches?.[0]?.similarity_score,
    top_similar_match: report.ai_similarity_matches?.[0],
    similar_matches: report.ai_similarity_matches,
    similarity_status: report.ai_similarity_status,
    verification_status: report.verification_status || 'Pending Verification',
  } : undefined)

  return {
    id: `report-${report.track_id}`,
    trackId: report.track_id,
    title: report.problem_title,
    description: report.context_and_desired_outcome || 'No description provided.',
    category: report.category,
    location: `${report.district}, Jharkhand${report.locality ? ` (${report.locality})` : ''}`,
    state: report.state || 'Jharkhand',
    district: report.district,
    locality: report.locality || '',
    landmark: report.address_or_landmark || '',
    latitude: report.latitude !== null ? report.latitude : undefined,
    longitude: report.longitude !== null ? report.longitude : undefined,
    status: (report.status === 'Open' ? 'Submitted' : report.status) as CitizenProblemStatus,
    urgency: priorityNormalized,
    affectedPeople: 0,
    submittedAt: dateStr,
    lastUpdated: dateStr,
    currentStageIndex: stageIndex,
    timelineStages: stages,
    ai_pre_screening: preScreening,
    ai_category: report.ai_category,
    ai_subcategory: report.ai_subcategory,
    ai_problem_type: report.ai_problem_type,
    ai_confidence_score: report.ai_confidence_score,
    ai_summary: report.ai_summary,
    ai_priority: report.ai_priority,
    ai_priority_score: report.ai_priority_score,
    ai_priority_reasons: report.ai_priority_reasons,
    ai_similarity_status: report.ai_similarity_status,
    ai_similarity_matches: report.ai_similarity_matches,
    ai_duplicate_candidates: report.ai_duplicate_candidates,
    verification_status: report.verification_status || 'Pending Verification',
    requiredCapabilities: ['Civic assessment', 'Field survey', 'Public consultation'],
    requiredResources: [
      {
        id: `res-${report.track_id}-1`,
        name: 'Technical Assessment',
        category: 'Experts',
        requiredQuantity: '1 Lead Analyst',
        status: report.status === 'In Progress' ? 'Available' : 'Required',
      },
      {
        id: `res-${report.track_id}-2`,
        name: 'Field Survey Verification',
        category: 'Data',
        requiredQuantity: 'District Sample Data',
        status: report.status === 'In Progress' ? 'Partner Identified' : 'Pending',
      },
    ],
  }
}

/**
 * Retrieves current dynamic re-matching status and latest event for a report.
 * Calls GET /api/reports/{track_id}/rematching-status
 */
export async function getRematchingStatus(
  trackId: string,
  token?: string
): Promise<RematchingStatusResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/rematching-status`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch rematching status (${response.status})`)
  }

  return (await response.json()) as RematchingStatusResponse
}

/**
 * Retrieves chronological rematching history with differential snapshots.
 * Calls GET /api/reports/{track_id}/rematching-history
 */
export async function getRematchingHistory(
  trackId: string,
  token?: string
): Promise<RematchingHistoryResponse | CitizenRematchingHistoryResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/rematching-history`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch rematching history (${response.status})`)
  }

  return (await response.json()) as RematchingHistoryResponse | CitizenRematchingHistoryResponse
}

/**
 * Triggers manual dynamic re-matching (Government & Super Admin only).
 * Calls POST /api/reports/{track_id}/rematch
 */
export async function triggerManualRematch(
  trackId: string,
  payload?: ManualRematchRequest,
  token?: string
): Promise<ManualRematchResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/rematch`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  })

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to trigger dynamic rematch (${response.status})`)
  }

  return (await response.json()) as ManualRematchResponse
}

export interface ScoreDetail {
  score: number
  level: 'low' | 'moderate' | 'strong' | 'excellent' | string
  explanation: string
  breakdown: Record<string, any>
}

export interface EstimatedQuantity {
  min_weeks?: number
  max_weeks?: number
  min_budget?: number
  max_budget?: number
  min_reach?: number
  max_reach?: number
  currency?: string
  reach_type?: string
  is_estimate: boolean
  basis: string
}

export interface ProjectAnalyticsDetail {
  feasibility_score: ScoreDetail
  impact_score: ScoreDetail
  readiness_score: ScoreDetail
  risk_score: ScoreDetail
  confidence_score: ScoreDetail
  feasibility_summary: string
  implementation_complexity: 'low' | 'moderate' | 'high' | 'extreme' | string
  estimated_duration_weeks: EstimatedQuantity
  estimated_budget_inr: EstimatedQuantity
  beneficiary_reach: EstimatedQuantity
  social_impact_summary: string
  risk_factors: Array<{
    risk: string
    severity: 'low' | 'moderate' | 'high' | 'critical' | string
    mitigation: string
  }>
  dependency_factors: string[]
  required_institutional_support: string[]
  required_partner_support: string[]
  capability_coverage: {
    overall_coverage_percentage?: number
    gap_severity?: string
    available_skills?: string[]
    missing_skills?: string[]
    missing_equipment?: string[]
  }
  recommended_next_steps: string[]
  transparency: {
    is_estimate: boolean
    input_factors: string[]
    assumptions: string[]
    calculation_explanation: string
    data_limitations: string[]
    advisory_disclaimer: string
  }
}

export interface ProjectAnalyticsResponse {
  track_id: string
  problem_title: string
  status: string
  analytics?: ProjectAnalyticsDetail | null
  analyzed_at?: string | null
  model?: string | null
}

export interface CitizenProjectAnalyticsResponse {
  track_id: string
  problem_title: string
  feasibility_summary: string
  impact_level: string
  estimated_duration_weeks: EstimatedQuantity
  beneficiary_reach: EstimatedQuantity
  social_impact_summary: string
  recommended_next_steps: string[]
  disclaimer: string
}

export interface ImpactSummaryResponse {
  total_reports: number
  analyzed_reports: number
  avg_feasibility_score: number | null
  avg_impact_score: number | null
  avg_readiness_score: number | null
  avg_risk_score: number | null
  total_estimated_beneficiaries: number | null
  high_impact_count: number
  critical_risk_count: number
  insufficient_data: boolean
}

export interface ImpactTrendItem {
  period: string
  report_count: number
  avg_impact_score: number | null
  avg_feasibility_score: number | null
  estimated_beneficiaries: number
}

export interface ImpactTrendsResponse {
  trends: ImpactTrendItem[]
  insufficient_data: boolean
}

export interface DistrictImpactItem {
  district: string
  report_count: number
  avg_impact_score: number | null
  avg_feasibility_score: number | null
  total_beneficiaries: number
  top_category?: string | null
}

export interface DistrictImpactResponse {
  districts: DistrictImpactItem[]
  insufficient_data: boolean
}

export interface CategoryImpactItem {
  category: string
  report_count: number
  avg_impact_score: number | null
  avg_feasibility_score: number | null
  avg_duration_weeks: number | null
  total_beneficiaries: number
}

export interface CategoryImpactResponse {
  categories: CategoryImpactItem[]
  insufficient_data: boolean
}

export interface ResolutionPerformanceCategoryItem {
  category: string
  total_reports: number
  resolved_reports: number
  resolution_rate: number
  avg_days_to_resolve: number | null
}

export interface ResolutionPerformanceDistrictItem {
  district: string
  total_reports: number
  resolved_reports: number
  resolution_rate: number
  avg_days_to_resolve: number | null
}

export interface ResolutionPerformanceResponse {
  total_resolved: number
  overall_avg_days_to_resolve?: number | null
  avg_days_to_resolve?: number
  median_days_to_resolve?: number
  target_compliance_percent?: number
  overall_resolution_rate_percentage?: number
  by_category?: ResolutionPerformanceCategoryItem[]
  by_district?: ResolutionPerformanceDistrictItem[]
  insufficient_data?: boolean
}

/**
 * Retrieves AI Project and Impact Analytics for a report.
 * Calls GET /api/reports/{track_id}/project-analytics
 */
export async function getReportProjectAnalytics(
  trackId: string,
  token?: string
): Promise<ProjectAnalyticsResponse | CitizenProjectAnalyticsResponse> {
  const cleanId = encodeURIComponent(trackId.trim())
  const url = `${API_BASE_URL}/api/reports/${cleanId}/project-analytics`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch project analytics (${response.status})`)
  }
  return (await response.json()) as ProjectAnalyticsResponse | CitizenProjectAnalyticsResponse
}

/**
 * Platform-wide Aggregate Impact Summary
 */
export async function getImpactSummary(token?: string): Promise<ImpactSummaryResponse> {
  const url = `${API_BASE_URL}/api/analytics/impact-summary`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch impact summary (${response.status})`)
  }
  return (await response.json()) as ImpactSummaryResponse
}

/**
 * Platform-wide Aggregate Impact Trends
 */
export async function getImpactTrends(token?: string): Promise<ImpactTrendsResponse> {
  const url = `${API_BASE_URL}/api/analytics/impact-trends`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch impact trends (${response.status})`)
  }
  return (await response.json()) as ImpactTrendsResponse
}

/**
 * District-level Impact & Beneficiary Metrics
 */
export async function getDistrictImpact(token?: string): Promise<DistrictImpactResponse> {
  const url = `${API_BASE_URL}/api/analytics/district-impact`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch district impact (${response.status})`)
  }
  return (await response.json()) as DistrictImpactResponse
}

/**
 * Category-level Impact & Timeline Metrics
 */
export async function getCategoryImpact(token?: string): Promise<CategoryImpactResponse> {
  const url = `${API_BASE_URL}/api/analytics/category-impact`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch category impact (${response.status})`)
  }
  return (await response.json()) as CategoryImpactResponse
}

/**
 * Detailed Turnaround & Resolution Performance Analytics
 */
export async function getResolutionPerformanceAnalytics(token?: string): Promise<ResolutionPerformanceResponse> {
  const url = `${API_BASE_URL}/api/analytics/resolution-performance`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch resolution performance (${response.status})`)
  }
  return (await response.json()) as ResolutionPerformanceResponse
}

/**
 * Fetches platform audit logs from the PostgreSQL backend database.
 * Calls GET /api/audit-logs
 */
export async function getAuditLogs(token?: string): Promise<BackendAuditLog[]> {
  const url = `${API_BASE_URL}/api/audit-logs`
  const authToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('token') || ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(url, { method: 'GET', headers })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    throw new Error(`Unable to connect to audit logs API at ${API_BASE_URL}. (${errorMsg})`)
  }

  if (!response.ok) {
    const errorText = await extractErrorMessage(response)
    throw new Error(errorText || `Failed to fetch audit logs (${response.status})`)
  }
  return (await response.json()) as BackendAuditLog[]
}

export const reportService = {
  getReports,
  getReportByTrackId,
  createReport,
  submitReport: createReport,
  updateReportStatus,
  assignReport,
  updateOfficialRemarks,
  getReportHistory,
  getReportAIAnalysis,
  getReportAIPriority,
  getSimilarProblems,
  getDuplicateAnalysis,
  submitDuplicateReview,
  getReportCapabilities,
  getHEIMatches,
  submitHEIInterest,
  getFacultyMatches,
  getStudentMatches,
  submitFacultyInterest,
  submitStudentInterest,
  getCapabilityGaps,
  triggerCapabilityGapAnalysis,
  getPartnerMatches,
  submitPartnerInterest,
  updatePartnerInterest,
  getRematchingStatus,
  getRematchingHistory,
  triggerManualRematch,
  getReportProjectAnalytics,
  getImpactSummary,
  getImpactTrends,
  getDistrictImpact,
  getCategoryImpact,
  getResolutionPerformanceAnalytics,
  getAuditLogs,
  validateAndRouteProblem,
  triggerAIRouting,
  mapBackendReportToCitizenProblem,
}




