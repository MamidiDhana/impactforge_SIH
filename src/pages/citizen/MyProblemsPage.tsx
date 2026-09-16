import { useMemo, useState } from 'react'
import { Search, ExternalLink, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CitizenLayout } from '../../layouts/CitizenLayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { FilterBar } from '../../components/forms/FilterBar'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { CitizenStatusBadge } from '../../components/citizen/CitizenStatusBadge'
import { useProblems } from '../../context/ProblemContext'

const statuses = [
  'All statuses',
  'Draft',
  'Submitted',
  'Under Review',
  'More Information Required',
  'Validated',
  'Rejected',
  'Redirected',
  'Converted to Project',
]

export function MyProblemsPage() {
  const { citizenProblems } = useProblems()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [category, setCategory] = useState('All categories')
  const [sort, setSort] = useState('recent')
  const [isLoading] = useState(false)

  const categories = useMemo(() => {
    return ['All categories', ...Array.from(new Set(citizenProblems.map((problem) => problem.category)))]
  }, [citizenProblems])

  const problems = useMemo(() => {
    return citizenProblems
      .filter((problem) => {
        const query = search.toLowerCase()
        const matchesSearch =
          problem.title.toLowerCase().includes(query) ||
          problem.description.toLowerCase().includes(query) ||
          problem.location.toLowerCase().includes(query) ||
          (problem.trackId && problem.trackId.toLowerCase().includes(query))

        const matchesStatus = status === 'All statuses' || problem.status === status
        const matchesCategory = category === 'All categories' || problem.category === category

        return matchesSearch && matchesStatus && matchesCategory
      })
      .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : 0))
  }, [category, search, sort, status, citizenProblems])

  const reset = () => {
    setSearch('')
    setStatus('All statuses')
    setCategory('All categories')
    setSort('recent')
  }

  return (
    <CitizenLayout title="Track Problem">
      <PageContainer>
        <PageHeader
          title="Track Problem"
          description="Review your reported problems in Jharkhand and track real-time resolution progress using your permanent Track ID."
          breadcrumbs={[
            { label: 'Citizen', href: '/citizen/dashboard' },
            { label: 'Track Problem' },
          ]}
          action={
            <Link
              to="/citizen/submit-problem"
              className="rounded-lg bg-[#12365a] px-4 py-2 text-sm font-bold text-white shadow hover:bg-[#1a4a7a]"
            >
              Report a Problem
            </Link>
          }
        />

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by Track ID, title, or Jharkhand district..."
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: status,
              options: statuses.map((value) => ({ label: value, value })),
              onChange: setStatus,
            },
            {
              id: 'category',
              label: 'Category',
              value: category,
              options: categories.map((value) => ({ label: value, value })),
              onChange: setCategory,
            },
          ]}
          onReset={reset}
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-[#13243b]">Reported Problems</h2>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>
              <strong className="text-slate-700">{problems.length}</strong> reported challenges
            </span>
            <label className="text-sm text-slate-500">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700"
              >
                <option value="recent">Recent</option>
                <option value="title">Title</option>
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5">
            <LoadingState rows={4} />
          </div>
        ) : problems.length ? (
          <div className="mt-5 grid gap-4">
            {problems.map((problem) => (
              <article
                key={problem.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#12365a] px-2 py-0.5 font-mono text-xs font-bold text-white tracking-wide">
                        {problem.trackId}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} className="text-[#187e8d]" />
                        {problem.district}, Jharkhand
                      </span>
                    </div>

                    <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                      {problem.title}
                    </h2>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                      {problem.description}
                    </p>
                    <p className="text-xs text-slate-400 pt-1">
                      {problem.category} · Submitted {problem.submittedAt} · Last Updated {problem.lastUpdated}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <CitizenStatusBadge status={problem.status} />
                    {(!problem.verification_status || problem.verification_status === 'Pending Verification') && problem.status === 'Submitted' && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-300 shadow-sm">
                        Pending Gov Verification
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                  <Link
                    to={`/citizen/problems/${problem.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
                  >
                    <ExternalLink size={14} />
                    <span>Track Status & Details</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={Search}
              title="No reported problems found"
              description="Try a different search or register a new community challenge in Jharkhand."
              action={
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg bg-[#12365a] px-4 py-2 text-sm font-semibold text-white"
                >
                  Reset filters
                </button>
              }
            />
          </div>
        )}
      </PageContainer>
    </CitizenLayout>
  )
}