import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import type { CitizenFeedback, CitizenProblem, JharkhandLanguage, TrackingStage } from '../types'
import {
  buildInitialStages,
  JHARKHAND_LANGUAGES,
  type LanguageDictionary,
} from '../data/jharkhandData'
import {
  getReports,
  isCitizenSubmittedReport,
  mapBackendReportToCitizenProblem,
} from '../services/reportService'
import { useAuth } from './AuthContext'

const PROBLEMS_STORAGE_KEY = 'impactforge.jharkhand.problems.v1'
const LANGUAGE_STORAGE_KEY = 'impactforge.citizen.language'

interface ProblemContextValue {
  problems: CitizenProblem[]
  citizenProblems: CitizenProblem[]
  isLoading: boolean
  error: string | null
  reloadProblems: () => Promise<void>
  language: JharkhandLanguage
  setLanguage: (lang: JharkhandLanguage) => void
  dict: LanguageDictionary
  getProblemByTrackId: (trackId: string) => CitizenProblem | undefined
  getProblemById: (id: string) => CitizenProblem | undefined
  reportProblem: (
    input: Omit<
      CitizenProblem,
      | 'id'
      | 'trackId'
      | 'status'
      | 'submittedAt'
      | 'lastUpdated'
      | 'timelineStages'
      | 'requiredResources'
      | 'citizenFeedback'
    > & {
      requiredResources?: CitizenProblem['requiredResources']
    }
  ) => Promise<CitizenProblem>
  updateProblemStatus: (
    id: string,
    status: CitizenProblem['status'],
    stageIndex?: number,
    comment?: string
  ) => void
  submitCitizenFeedback: (trackId: string, feedback: CitizenFeedback) => void
  addBackendProblem: (problem: CitizenProblem) => void
}

const ProblemContext = createContext<ProblemContextValue | undefined>(undefined)

function loadStoredProblems(): CitizenProblem[] {
  try {
    const raw = localStorage.getItem(PROBLEMS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // fallback
  }
  return []
}

function loadStoredLanguage(): JharkhandLanguage {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (raw && raw in JHARKHAND_LANGUAGES) {
      return raw as JharkhandLanguage
    }
  } catch {
    // fallback
  }
  return 'en'
}

export function ProblemProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [problems, setProblems] = useState<CitizenProblem[]>(loadStoredProblems)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguageState] = useState<JharkhandLanguage>(loadStoredLanguage)

  // Load live citizen problems from existing PostgreSQL/Supabase database on mount
  const loadLiveProblems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getReports()
      const citizenReports = data.filter(isCitizenSubmittedReport)
      const mapped = citizenReports.map(mapBackendReportToCitizenProblem)
      setProblems(mapped)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLiveProblems()
  }, [loadLiveProblems])

  // Persist problems to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(problems))
    } catch {
      // ignore
    }
  }, [problems])

  const setLanguage = (lang: JharkhandLanguage) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }

  const dict = useMemo(() => JHARKHAND_LANGUAGES[language].dict, [language])

  // Filter problems for currently logged in citizen
  const citizenProblems = useMemo(() => {
    const currentCitizenId = currentUser?.id || 'mock-citizen'
    return problems.filter(
      (p) => !p.citizenId || p.citizenId === currentCitizenId || p.citizenId === 'mock-citizen'
    )
  }, [problems, currentUser])

  const getProblemByTrackId = (trackId: string) => {
    const normalized = trackId.trim().toUpperCase()
    return problems.find((p) => p.trackId?.toUpperCase() === normalized)
  }

  const getProblemById = (id: string) => {
    return problems.find((p) => p.id === id)
  }

  const generateNextTrackId = (allProblems: CitizenProblem[]): string => {
    let maxNum = 0
    allProblems.forEach((p) => {
      const match = p.trackId?.match(/IF-JH-2026-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    })
    const nextNum = maxNum + 1
    return `IF-JH-2026-${String(nextNum).padStart(4, '0')}`
  }

  const reportProblem = async (
    input: Omit<
      CitizenProblem,
      | 'id'
      | 'trackId'
      | 'status'
      | 'submittedAt'
      | 'lastUpdated'
      | 'timelineStages'
      | 'requiredResources'
      | 'citizenFeedback'
    > & {
      requiredResources?: CitizenProblem['requiredResources']
    }
  ): Promise<CitizenProblem> => {
    const newTrackId = generateNextTrackId(problems)
    const newId = `jh-problem-${Date.now()}`
    const now = new Date()
    const dateStr = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`

    const stages = buildInitialStages(0, dateStr)
    // Mark stage 0 completed and stage 1 in progress
    if (stages[0]) {
      stages[0].status = 'Completed'
      stages[0].date = dateStr
    }
    if (stages[1]) {
      stages[1].status = 'In Progress'
      stages[1].date = dateStr
    }

    const defaultResources = input.requiredResources || [
      { id: `r-${Date.now()}-1`, name: 'Technical Assessment', category: 'Experts', requiredQuantity: '1 Lead Analyst', status: 'Required' },
      { id: `r-${Date.now()}-2`, name: 'Local Baseline Survey', category: 'Data', requiredQuantity: 'District Sample Data', status: 'Pending' },
      { id: `r-${Date.now()}-3`, name: 'Pilot Grant / Materials', category: 'Funding', requiredQuantity: 'Estimated ₹1,50,000', status: 'Required' },
    ]

    const newProblem: CitizenProblem = {
      ...input,
      id: newId,
      trackId: newTrackId,
      citizenId: currentUser?.id || 'mock-citizen',
      status: 'Submitted',
      submittedAt: dateStr,
      lastUpdated: dateStr,
      currentStageIndex: 1,
      timelineStages: stages,
      requiredResources: defaultResources,
    }

    setProblems((prev) => [newProblem, ...prev])
    return newProblem
  }

  const updateProblemStatus = useCallback((
    id: string,
    status: CitizenProblem['status'],
    stageIndex?: number,
    comment?: string
  ) => {
    const clean = id.startsWith('report-') ? id.replace('report-', '') : id
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id !== id && p.trackId !== id && p.id !== clean && p.trackId !== clean) return p

        const effectiveStageIndex =
          stageIndex !== undefined
            ? stageIndex
            : status === 'Validated'
            ? 3 // Government Accepted
            : status === 'Under Review'
            ? 2 // Government Review
            : status === 'Converted to Project'
            ? 6 // Student Team Formed
            : p.currentStageIndex ?? 1

        const updatedStages = (p.timelineStages || buildInitialStages(effectiveStageIndex)).map(
          (st, idx) => {
            const now = new Date()
            const dateStr = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`
            if (idx < effectiveStageIndex) {
              return { ...st, status: 'Completed' as const, date: st.date || dateStr }
            }
            if (idx === effectiveStageIndex) {
              return { ...st, status: 'In Progress' as const, date: dateStr }
            }
            return { ...st, status: 'Pending' as const }
          }
        )

        return {
          ...p,
          status,
          currentStageIndex: effectiveStageIndex,
          timelineStages: updatedStages as TrackingStage[],
          governmentComment: comment !== undefined ? comment : p.governmentComment,
          lastUpdated: 'Just now',
        }
      })
    )
  }, [])

  const submitCitizenFeedback = (trackId: string, feedback: CitizenFeedback) => {
    setProblems((prev) =>
      prev.map((p) => {
        if (!p.trackId || p.trackId.toUpperCase() !== trackId.toUpperCase()) return p
        const updatedStages = (p.timelineStages || []).map((stage) => {
          if (stage.id === 15) {
            return {
              ...stage,
              status: 'Completed' as const,
              date: feedback.submittedAt,
            }
          }
          return stage
        })
        return {
          ...p,
          citizenFeedback: feedback,
          timelineStages: updatedStages,
          lastUpdated: 'Just now',
        }
      })
    )
  }

  const addBackendProblem = (problem: CitizenProblem) => {
    setProblems((prev) => {
      const existingIndex = prev.findIndex((p) => p.trackId === problem.trackId || p.id === problem.id)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = { ...next[existingIndex], ...problem }
        return next
      }
      return [problem, ...prev]
    })
  }

  return (
    <ProblemContext.Provider
      value={{
        problems,
        citizenProblems,
        isLoading,
        error,
        reloadProblems: loadLiveProblems,
        language,
        setLanguage,
        dict,
        getProblemByTrackId,
        getProblemById,
        reportProblem,
        updateProblemStatus,
        submitCitizenFeedback,
        addBackendProblem,
      }}
    >
      {children}
    </ProblemContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProblems() {
  const context = useContext(ProblemContext)
  if (!context) {
    throw new Error('useProblems must be used within a ProblemProvider')
  }
  return context
}
