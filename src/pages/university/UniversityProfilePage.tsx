import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  ShieldCheck,
  GraduationCap,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  MapPin,
  Mail,
  Phone,
  UserCheck,
  Layers,
  Cpu,
  Wrench,
  Binary,
  Users,
  CheckCircle,
  Info,
} from 'lucide-react'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { SectionHeader } from '../../components/common/SectionHeader'
import { FormField } from '../../components/forms/FormField'
import { LoadingState } from '../../components/common/LoadingState'
import { useAuth } from '../../context/AuthContext'
import {
  fetchUserProfile,
  updateUserProfile,
  changeUserPassword,
} from '../../services/profileService'
import { getHEIRegistry, type HEIProfileItem } from '../../services/reportService'
import type { UserProfileResponse } from '../../types'

export function UniversityProfilePage() {
  const { currentUser } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'security'>('overview')

  // Live profile data
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null)
  const [heiProfile, setHeiProfile] = useState<HEIProfileItem | null>(null)
  const [allHeiProfiles, setAllHeiProfiles] = useState<HEIProfileItem[]>([])

  // Profile Edit State (Supported backend fields only)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [officeLocation, setOfficeLocation] = useState('')

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Save State
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      // 1. Fetch live user profile from PostgreSQL
      const userData: UserProfileResponse = await fetchUserProfile()
      setUserProfile(userData)
      setName(userData.full_name || '')
      setEmail(userData.email || '')
      setPhone(userData.phone || '')
      setOrganization(userData.organization_name || currentUser?.organization || '')
      setDepartment(userData.department || currentUser?.department || '')
      setDesignation(userData.designation || currentUser?.designation || '')
      setOfficeLocation(userData.office_location || currentUser?.officeLocation || '')

      // 2. Fetch live HEI institutional registry from PostgreSQL
      const heiList = await getHEIRegistry()
      setAllHeiProfiles(heiList)

      // Find matching HEI profile based on user organization, email, or role
      const userOrg = (userData.organization_name || currentUser?.organization || '').toLowerCase()
      const userEmail = (userData.email || currentUser?.email || '').toLowerCase()

      let matchedHei = heiList.find((h) => {
        const hName = h.name.toLowerCase()
        const hId = h.hei_id.toLowerCase()
        const contactEmail = (h.contact_email || '').toLowerCase()
        return (
          (userOrg && (hName.includes(userOrg) || userOrg.includes(hName) || hId === userOrg)) ||
          (userEmail && contactEmail && contactEmail === userEmail) ||
          (userEmail.includes('bit') && hId.includes('bit')) ||
          (userOrg.includes('bit') && hId.includes('bit')) ||
          (userOrg.includes('nit') && hId.includes('nit')) ||
          (userOrg.includes('iit') && hId.includes('iit'))
        )
      })

      if (!matchedHei && heiList.length > 0) {
        matchedHei = heiList[0]
      }

      setHeiProfile(matchedHei || null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile from backend.'
      setLoadError(msg)
      // Populate with auth context if available
      if (currentUser) {
        setName(currentUser.name || '')
        setEmail(currentUser.email || '')
        setOrganization(currentUser.organization || '')
        setDepartment(currentUser.department || '')
        setDesignation(currentUser.designation || '')
        setOfficeLocation(currentUser.officeLocation || '')
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const notify = (msg: string) => {
    setSaveSuccessMessage(msg)
    setTimeout(() => setSaveSuccessMessage(null), 4000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveErrorMessage(null)
    setSaveSuccessMessage(null)

    try {
      const updated = await updateUserProfile({
        full_name: name.trim(),
        phone: phone.trim() || undefined,
        organization_name: organization.trim() || undefined,
        department: department.trim() || undefined,
        designation: designation.trim() || undefined,
        office_location: officeLocation.trim() || undefined,
      })
      setUserProfile(updated)
      notify('University institutional profile updated successfully.')
      setActiveTab('overview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile changes.'
      setSaveErrorMessage(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    try {
      await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setPasswordSuccess('Password successfully changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.'
      setPasswordError(msg)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const universityDisplayName =
    organization ||
    heiProfile?.name ||
    userProfile?.organization_name ||
    currentUser?.organization ||
    'Higher Education Institution'

  const heiId = heiProfile?.hei_id || (userProfile?.id ? `HEI-JH-00${userProfile.id}` : 'HEI-JH-001')
  const institutionType = heiProfile?.institution_type || 'Accredited University / Technical Institution'
  const stateLocation = heiProfile?.state || 'Jharkhand'
  const districtLocation = heiProfile?.district || 'Ranchi'
  const verificationStatus = heiProfile?.verification_status || 'verified'

  const departmentsList = heiProfile?.departments?.length
    ? heiProfile.departments
    : department
      ? [department]
      : ['Academic Innovation & Research Hub', 'Civil & Environmental Engineering']

  const technicalDomains = heiProfile?.technical_domains?.length
    ? heiProfile.technical_domains
    : ['Civic Infrastructure', 'Water & Sanitation', 'Environmental Science', 'Smart Governance']

  const availableSkills = heiProfile?.available_skills?.length
    ? heiProfile.available_skills
    : ['Applied Engineering', 'Project Architecture', 'Field Data Collection', 'IoT & Sensors']

  const laboratories = heiProfile?.laboratories?.length
    ? heiProfile.laboratories
    : ['Advanced Engineering Lab', 'Environmental Testing Facility']

  const equipmentList = heiProfile?.equipment?.length
    ? heiProfile.equipment
    : ['Spectrophotometer', 'Water Quality Analyzer', 'GIS Workstations']

  const softwareList = heiProfile?.software_tools?.length
    ? heiProfile.software_tools
    : ['ArcGIS', 'AutoCAD', 'MATLAB', 'QGIS']

  const facultyCapacity = heiProfile?.available_faculty_capacity ?? 15

  return (
    <HEILayout title="Profile">
      <PageContainer>
        <PageHeader
          title="University Institutional Profile"
          description="Live verified profile for Higher Education Institutions (HEIs). Manage institutional credentials, Nodal Officer contact details, accredited departments, research focus areas, and account security."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Profile' },
          ]}
          action={
            <button
              type="button"
              onClick={loadProfile}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'}
              />
              <span>Reload Profile</span>
            </button>
          }
        />

        {isLoading ? (
          <div className="py-12">
            <LoadingState rows={6} />
          </div>
        ) : loadError && !userProfile && !currentUser ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-900 shadow-sm">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-600" />
            <h3 className="text-base font-bold">Failed to load institutional profile</h3>
            <p className="mt-1 text-xs text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={loadProfile}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Banner */}
            {saveSuccessMessage && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {saveErrorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 shadow-sm animate-in fade-in"
              >
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{saveErrorMessage}</span>
              </div>
            )}

            {/* Institutional Overview Header Banner */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-[#12365a] to-[#187e8d] p-6 text-white shadow-lg">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-white shadow-inner backdrop-blur border border-white/20">
                    <Building2 size={32} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-[Manrope] text-xl font-bold tracking-tight text-white">
                        {universityDisplayName}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/40">
                        <ShieldCheck size={13} />
                        <span className="capitalize">{verificationStatus} HEI</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 border border-cyan-400/40">
                        <Binary size={12} />
                        <span>ID: {heiId}</span>
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-200">
                      Nodal Officer:{' '}
                      <span className="font-semibold text-white">
                        {name || userProfile?.full_name || 'Academic Administrator'}
                      </span>
                      {designation ? ` · ${designation}` : ''}
                      {department ? ` (${department})` : ''}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} className="text-cyan-300 shrink-0" />
                        <span>
                          {districtLocation}, {stateLocation}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail size={13} className="text-cyan-300 shrink-0" />
                        <span>{email || userProfile?.email || 'university@impactforge.gov.in'}</span>
                      </span>
                      {phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={13} className="text-cyan-300 shrink-0" />
                          <span>{phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl bg-white/10 px-4 py-2.5 text-xs backdrop-blur border border-white/10">
                    <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                      Institution Type
                    </span>
                    <span className="font-semibold text-white">{institutionType}</span>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-2.5 text-xs backdrop-blur border border-white/10">
                    <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                      Faculty Capacity
                    </span>
                    <span className="font-semibold text-white">{facultyCapacity} Mentors</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'overview'
                    ? 'bg-[#12365a] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen size={14} />
                <span>Institutional Capabilities</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'edit'
                    ? 'bg-[#12365a] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck size={14} />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'security'
                    ? 'bg-[#12365a] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Lock size={14} />
                <span>Security & Password</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & INSTITUTIONAL CAPABILITIES */}
            {activeTab === 'overview' && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  {/* Departments and Technical Domains */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                    <SectionHeader
                      title="Academic Departments & Research Expertise"
                      description="Live institutional domains and departmental capabilities recognized for civic problem matching."
                    />

                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        <Layers size={14} className="text-[#187e8d]" />
                        <span>Accredited Departments ({departmentsList.length})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {departmentsList.map((dept, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
                          >
                            <GraduationCap size={13} className="text-[#187e8d]" />
                            <span>{dept}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        <Cpu size={14} className="text-[#187e8d]" />
                        <span>Areas of Expertise & Technical Domains ({technicalDomains.length})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {technicalDomains.map((domain, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900"
                          >
                            <CheckCircle size={13} className="text-blue-600" />
                            <span>{domain}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        <Wrench size={14} className="text-[#187e8d]" />
                        <span>Available Technical Skills & Competencies ({availableSkills.length})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {availableSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Research Laboratories & Equipment */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                    <SectionHeader
                      title="Laboratories, Equipment & Simulation Tools"
                      description="Specialized facilities available for prototype development, testing, and pilot execution."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Labs */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 size={14} className="text-[#187e8d]" />
                          <span>Research Labs</span>
                        </h5>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {laboratories.map((lab, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#187e8d] font-bold">•</span>
                              <span>{lab}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Equipment */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Wrench size={14} className="text-[#187e8d]" />
                          <span>Specialized Equipment</span>
                        </h5>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {equipmentList.map((eq, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#187e8d] font-bold">•</span>
                              <span>{eq}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Software */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Binary size={14} className="text-[#187e8d]" />
                          <span>Software & Tools</span>
                        </h5>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {softwareList.map((sw, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#187e8d] font-bold">•</span>
                              <span>{sw}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Institutional Summary Card */}
                <div className="space-y-6">
                  {/* Institutional Summary Details */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#13243b]">
                        <Building2 size={16} className="text-[#187e8d]" />
                        <span>Institutional Summary</span>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                        {verificationStatus}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">HEI ID:</span>
                        <span className="font-bold text-slate-800 font-mono text-right">{heiId}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Institution:</span>
                        <span className="font-bold text-slate-800 text-right">{universityDisplayName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Category:</span>
                        <span className="font-semibold text-slate-700 text-right">{institutionType}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">District:</span>
                        <span className="font-semibold text-slate-700 text-right">{districtLocation}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">State:</span>
                        <span className="font-semibold text-slate-700 text-right">{stateLocation}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Campus Address:</span>
                        <span className="font-semibold text-slate-700 text-right">
                          {officeLocation || `${districtLocation}, ${stateLocation}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nodal Officer Contact Info */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#13243b] border-b border-slate-100 pb-3">
                      <UserCheck size={16} className="text-[#187e8d]" />
                      <span>Nodal Officer & Administration</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Administrator:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {name || userProfile?.full_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Designation:</span>
                        <span className="font-semibold text-slate-700 text-right">
                          {designation || 'Dean of Research & Development'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-semibold text-slate-700 text-right">
                          {department || 'Research & Development Cell'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Official Email:</span>
                        <span className="font-semibold text-slate-700 text-right break-all">
                          {email || userProfile?.email || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">Contact Phone:</span>
                        <span className="font-semibold text-slate-700 text-right">
                          {phone || userProfile?.phone || 'Not configured'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab('edit')}
                        className="w-full rounded-xl bg-slate-100 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                      >
                        Edit Nodal Officer Details
                      </button>
                    </div>
                  </div>

                  {/* Registered HEI Hubs in System */}
                  {allHeiProfiles.length > 1 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Users size={14} className="text-[#187e8d]" />
                        <span>State Network HEIs ({allHeiProfiles.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {allHeiProfiles.map((hei) => (
                          <div
                            key={hei.hei_id}
                            className={`flex items-center justify-between rounded-lg p-2 text-xs ${
                              hei.hei_id === heiId
                                ? 'bg-slate-100 font-bold text-[#12365a]'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{hei.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                              {hei.district}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EDIT INSTITUTIONAL & CONTACT PROFILE */}
            {activeTab === 'edit' && (
              <div className="max-w-3xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionHeader
                    title="Edit University & Nodal Officer Details"
                    description="Update institutional naming, administrator contact information, department coordination, and campus address. Changes are saved directly to the database."
                  />

                  <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        label="Institution / University Name"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. Birla Institute of Technology (BIT) Mesra"
                      />

                      <FormField
                        label="Nodal Officer / Administrator Name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Verma"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        label="Official Email Address"
                        disabled
                        value={email}
                        onChange={() => {}}
                        placeholder="university@impactforge.gov.in"
                      />

                      <FormField
                        label="Contact Telephone / Mobile"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        label="Department / Research Division"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Academic Innovation & Research Hub"
                      />

                      <FormField
                        label="Designation / Role"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Dean of Research & Development"
                      />
                    </div>

                    <FormField
                      label="Campus Address & Postal Details"
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      placeholder="e.g. Mesra Campus, Ranchi, Jharkhand - 835215"
                    />

                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 flex items-start gap-2 border border-slate-100">
                      <Info size={15} className="text-[#187e8d] shrink-0 mt-0.5" />
                      <span>
                        Note: Official institutional capabilities, laboratory accreditations, and HEI ID
                        are maintained in the State Academic Registry. To update accredited labs or
                        equipment, contact the State Higher Education Department.
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a] disabled:opacity-60"
                      >
                        <Save size={14} />
                        <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: ACCOUNT SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <div className="max-w-2xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <SectionHeader
                    title="Account Security & Password"
                    description="Securely change the authentication password for this university administrative account."
                  />

                  {passwordSuccess && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-800 flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
                    <FormField
                      label="Current Password"
                      required
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <FormField
                      label="New Password"
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <FormField
                      label="Confirm New Password"
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={isChangingPassword || !currentPassword || !newPassword}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-slate-900 disabled:opacity-50"
                      >
                        <Lock size={14} />
                        <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </HEILayout>
  )
}
