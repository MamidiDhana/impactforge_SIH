import { useState } from 'react'
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { CitizenLayout } from '../../layouts/CitizenLayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { TextAreaField } from '../../components/forms/TextAreaField'
import { JharkhandMapPicker } from '../../components/citizen/JharkhandMapPicker'
import { TrackIdConfirmationModal } from '../../components/citizen/TrackIdConfirmationModal'
import { useAuth } from '../../context/AuthContext'
import { useProblems } from '../../context/ProblemContext'
import { useNotifications } from '../../context/NotificationContext'
import { JHARKHAND_DISTRICTS, REPORT_PROBLEM_TRANSLATIONS } from '../../data/jharkhandData'
import { createReport, mapBackendReportToCitizenProblem, type BackendReportPayload, type BackendReportResponse } from '../../services/reportService'
import type { CitizenProblem } from '../../types'



const validDistrictNames = JHARKHAND_DISTRICTS.map((d) => d.name)

const schema = z.object({
  title: z.string().trim().min(1, 'Problem title is required'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  district: z
    .string()
    .refine((val) => validDistrictNames.includes(val), {
      message: 'Please select a location within Jharkhand.',
    }),
  locality: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  affectedPeople: z.number().min(0, 'Enter zero or a positive number'),
  existingEfforts: z.string().optional(),
  expectedOutcome: z.string().optional(),
  consent: z.boolean().refine(Boolean, 'Consent is required'),
})

type Values = z.infer<typeof schema>

export function SubmitProblemPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addBackendProblem, language } = useProblems()
  const { notify } = useNotifications()

  const t = REPORT_PROBLEM_TRANSLATIONS[language] || REPORT_PROBLEM_TRANSLATIONS.en

  const [files, setFiles] = useState<string[]>([])
  const [createdProblem, setCreatedProblem] = useState<CitizenProblem | null>(null)
  const [submittedReport, setSubmittedReport] = useState<BackendReportResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      affectedPeople: 0,
      consent: false,
      description: '',
      district: '',
      locality: '',
      landmark: '',
      existingEfforts: '',
      expectedOutcome: '',
    },
  })

  const description = useWatch({ control, name: 'description', defaultValue: '' })
  const selectedDistrict = useWatch({ control, name: 'district', defaultValue: '' })
  const selectedLocality = useWatch({ control, name: 'locality', defaultValue: '' }) || ''
  const selectedLandmark = useWatch({ control, name: 'landmark', defaultValue: '' }) || ''

  // Null when user has not explicitly clicked on the map location
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const handleDistrictSelect = (districtName: string) => {
    setValue('district', districtName, { shouldValidate: true })
  }

  const submit = async (values: Values) => {
    setApiError(null)

    // Build payload with exact backend field names - category and priority are omitted so AI pre-screening determines them
    const payload: BackendReportPayload = {
      problem_title: values.title.trim(),
      context_and_desired_outcome: values.description.trim() || null,
      existing_efforts: values.existingEfforts?.trim() || null,
      expected_outcome: values.expectedOutcome?.trim() || null,
      state: 'Jharkhand',
      district: values.district,
      locality: values.locality?.trim() || values.district,
      address_or_landmark: values.landmark?.trim() || values.locality?.trim() || `${values.district}, Jharkhand`,
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null,
    }

    try {
      // Call POST /api/reports - backend generates track_id and completes AI Pre-Screening
      const backendReport = await createReport(payload)
      const mappedProblem = mapBackendReportToCitizenProblem(backendReport)
      addBackendProblem(mappedProblem)
      setSubmittedReport(backendReport)
      setCreatedProblem(mappedProblem)

      // Emit notification for citizen and administration
      notify({
        type: 'report_submitted',
        title: 'Report Registered & Pre-Screened',
        message: `Problem "${backendReport.problem_title}" registered (Track ID: ${backendReport.track_id}) and pre-screened.`,
        targetRole: ['citizen', 'government', 'admin'],
        relatedTrackId: backendReport.track_id,
        priority: (backendReport.priority as any) || 'Normal',
        source: 'Citizen Portal',
        actionUrl: `/citizen/problems/${backendReport.track_id}`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while submitting.'
      setApiError(message)
    }
  }

  return (
    <CitizenLayout title="Report Problem">
      <PageContainer>
        <PageHeader
          title="Report Problem"
          description="Report a verified community challenge in Jharkhand so the right authorities, universities, and partners can collaborate on a deployed solution."
          breadcrumbs={[
            { label: 'Citizen', href: '/citizen/dashboard' },
            { label: 'Report Problem' },
          ]}
        />

        {createdProblem && (
          <TrackIdConfirmationModal
            problem={createdProblem}
            backendReport={submittedReport}
            onClose={() => {
              setCreatedProblem(null)
              setSubmittedReport(null)
            }}
            translations={t}
          />
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
          {/* Problem Details Section */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
              {t.problemDetailsSectionTitle}
            </h2>
            <div className="mt-5 grid gap-5">
              <FormField
                label={t.problemTitleLabel}
                placeholder={t.problemTitlePlaceholder}
                {...register('title')}
                error={errors.title ? t.problemTitleError : undefined}
                required
              />

              <TextAreaField
                label={t.descriptionLabel}
                placeholder={t.descriptionPlaceholder}
                maxLength={2000}
                {...register('description')}
                error={
                  errors.description
                    ? description.length > 2000
                      ? t.descriptionMaxError
                      : t.descriptionError
                    : undefined
                }
                required
              />
              <p className="-mt-3 text-right text-xs text-slate-400">
                {description.length}/2000 {t.descriptionCharCount}
              </p>

              <FormField
                label={t.affectedPeopleLabel}
                type="number"
                min="0"
                placeholder={t.affectedPeoplePlaceholder}
                {...register('affectedPeople', { valueAsNumber: true })}
                error={errors.affectedPeople ? t.affectedPeopleError : undefined}
                required
              />
            </div>
          </section>

          {/* Section: Jharkhand Location Restriction & Map Picker */}
          <section>
            <JharkhandMapPicker
              selectedDistrict={selectedDistrict}
              selectedLocality={selectedLocality}
              selectedLandmark={selectedLandmark}
              latitude={coords?.lat}
              longitude={coords?.lng}
              onDistrictChange={handleDistrictSelect}
              onLocalityChange={(val) => setValue('locality', val)}
              onLandmarkChange={(val) => setValue('landmark', val)}
              onCoordinatesChange={(lat, lng) => setCoords({ lat, lng })}
              error={errors.district ? t.districtError : undefined}
              sectionTitle={t.locationSectionTitle}
              sectionSubtitle={t.locationSectionSubtitle}
              restrictedBadge={t.restrictedJharkhandBadge}
              stateLabel={t.stateLabel}
              districtLabel={t.districtLabel}
              districtPrompt={t.districtSelectPrompt}
              localityLabel={t.localityLabel}
              localityPlaceholder={t.localityPlaceholder}
              landmarkLabel={t.landmarkLabel}
              landmarkPlaceholder={t.landmarkPlaceholder}
              mapTitle={t.mapPrototypeTitle}
              mapHint={t.mapClickHint}
              coordinatesLabel={t.selectedCoordinatesLabel}
            />
          </section>

          {/* Context and Desired Outcome Section */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
              {t.contextSectionTitle}
            </h2>
            <div className="mt-5 grid gap-5">
              <TextAreaField
                label={t.existingEffortsLabel}
                placeholder={t.existingEffortsPlaceholder}
                {...register('existingEfforts')}
              />
              <TextAreaField
                label={t.expectedOutcomeLabel}
                placeholder={t.expectedOutcomePlaceholder}
                {...register('expectedOutcome')}
              />
            </div>
          </section>

          {/* Supporting Files Upload */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
              {t.supportingDocsSectionTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t.supportingDocsSubtitle}
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-5 py-8 text-center transition hover:border-[#187e8d]">
              <UploadCloud className="text-[#187e8d]" size={28} />
              <span className="mt-2 text-sm font-semibold text-slate-700">
                {t.chooseFilesText}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                {t.uploadHint}
              </span>
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(event) =>
                  setFiles(Array.from(event.target.files ?? []).map((file) => file.name))
                }
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 text-xs text-slate-600 space-y-1">
                {files.map((file) => (
                  <li key={file} className="flex items-center gap-1.5 font-medium">
                    <span>📄</span> {file}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 text-xs text-slate-600">
            <input
              type="checkbox"
              {...register('consent')}
              className="mt-0.5 size-4 rounded accent-[#12365a]"
            />
            <span>
              {t.consentText}{' '}
              <span className="text-red-600 font-bold">*</span>
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-red-600 font-medium">{t.consentError}</p>
          )}

          {/* Backend API Error Banner */}
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs font-semibold text-red-800 shadow-sm animate-in fade-in"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-red-900">Unable to Submit Report</p>
                <p className="font-normal text-red-700 leading-relaxed whitespace-pre-wrap">{apiError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/citizen/dashboard')}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t.cancelButton}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#12365a] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#1a4a7a] disabled:opacity-60 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t.submittingButton}</span>
                </>
              ) : (
                <span>{t.submitButton}</span>
              )}
            </button>
          </div>
          <p className="text-right text-xs text-slate-400">
            {t.reportingAsFooter} {currentUser?.name} · Jharkhand State Innovation System
          </p>
        </form>
      </PageContainer>
    </CitizenLayout>
  )
}

