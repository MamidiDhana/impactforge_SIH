import { useState, useEffect, type FormEvent } from 'react'
import {
  CheckCircle2,
  LockKeyhole,
  UserRound,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import { GovPage } from './GovernmentShared'
import { FormField } from '../../components/forms/FormField'
import { useAuth } from '../../context/AuthContext'
import {
  fetchUserProfile,
  updateUserProfile,
  changeUserPassword,
} from '../../services/profileService'
import type { UserProfileResponse } from '../../types'

export function GovernmentProfilePage() {
  const { currentUser, updateUser } = useAuth()

  // Profile data state
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Form edit state
  const [editing, setEditing] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form input fields
  const [fullName, setFullName] = useState<string>('')
  const [department, setDepartment] = useState<string>('')
  const [designation, setDesignation] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [officeLocation, setOfficeLocation] = useState<string>('')

  // Change password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false)
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false)
  const [showNewPw, setShowNewPw] = useState<boolean>(false)
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)

  // Fetch live profile from backend
  const loadProfileData = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await fetchUserProfile()
      setProfile(data)
      setFullName(data.full_name || '')
      setDepartment(data.department || '')
      setDesignation(data.designation || '')
      setPhone(data.phone || '')
      setOfficeLocation(data.office_location || '')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile data from backend.'
      setFetchError(msg)
      // Fallback from auth context if network fails
      if (currentUser) {
        setFullName(currentUser.name || '')
        setDepartment(currentUser.department || 'District Innovation Cell')
        setDesignation(currentUser.designation || 'Government Validator')
        setPhone(currentUser.phone || '+91 94311 00001')
        setOfficeLocation(currentUser.officeLocation || 'Ranchi, Jharkhand')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfileData()
  }, [currentUser?.email])

  // Reset editable inputs when canceling edit mode
  const handleCancelEditing = () => {
    if (profile) {
      setFullName(profile.full_name || '')
      setDepartment(profile.department || '')
      setDesignation(profile.designation || '')
      setPhone(profile.phone || '')
      setOfficeLocation(profile.office_location || '')
    }
    setSaveError(null)
    setEditing(false)
  }

  // Handle profile form save
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setSaveError('Officer name must be at least 2 characters long.')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateUserProfile({
        full_name: fullName.trim(),
        department: department.trim() || undefined,
        designation: designation.trim() || undefined,
        phone: phone.trim() || undefined,
        office_location: officeLocation.trim() || undefined,
      })

      setProfile(updated)
      setFullName(updated.full_name)
      setDepartment(updated.department || '')
      setDesignation(updated.designation || '')
      setPhone(updated.phone || '')
      setOfficeLocation(updated.office_location || '')

      // Synchronize updated profile with global AuthContext
      updateUser({
        name: updated.full_name,
        department: updated.department || undefined,
        designation: updated.designation || undefined,
        phone: updated.phone || undefined,
        officeLocation: updated.office_location || undefined,
        organization: updated.organization_name || updated.department || 'District Innovation Cell',
      })

      setEditing(false)
      setSaveSuccess('Profile information updated successfully in the shared database.')

      // Clear success banner after 6 seconds
      setTimeout(() => {
        setSaveSuccess(null)
      }, 6000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setSaveError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle password change modal submit
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.')
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setPasswordSuccess(res.message || 'Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Close modal automatically after brief success indication
      setTimeout(() => {
        setPasswordModalOpen(false)
        setPasswordSuccess(null)
      }, 1800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.'
      setPasswordError(msg)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const closePasswordModal = () => {
    setPasswordModalOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  if (!currentUser) return null

  return (
    <GovernmentLayout title="Profile">
      <GovPage
        title="Profile"
        description="Manage your profile information."
        breadcrumbs={[{ label: 'Government', href: '/government/dashboard' }, { label: 'Profile' }]}
        action={
          !loading && !fetchError ? (
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  handleCancelEditing()
                } else {
                  setEditing(true)
                  setSaveSuccess(null)
                  setSaveError(null)
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e2b48] transition shadow-xs"
            >
              {editing ? 'Cancel editing' : 'Edit profile'}
            </button>
          ) : null
        }
      >
        {/* Loading state skeleton */}
        {loading && (
          <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6 animate-pulse">
              <div className="size-14 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-5 w-48 rounded bg-slate-200" />
                <div className="h-4 w-72 rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2 animate-pulse">
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-[#187e8d]" />
              <span>Fetching live officer profile from central database...</span>
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {!loading && fetchError && (
          <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800">Unable to load live profile</h3>
                <p className="mt-1 text-xs text-red-700">{fetchError}</p>
                <button
                  type="button"
                  onClick={loadProfileData}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
                >
                  <RefreshCw size={12} />
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live profile form */}
        {!loading && (
          <form
            onSubmit={handleProfileSubmit}
            className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Header: Officer details & badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#d9eeee] text-[#12365a] shadow-xs ring-2 ring-[#187e8d]/20">
                  <UserRound size={26} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-[Manrope] text-xl font-bold text-[#13243b]">
                      {fullName || profile?.full_name || currentUser.name}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {department || profile?.department || 'District Innovation Cell'} ·{' '}
                    {designation || profile?.designation || 'Government Validator'}
                  </p>
                </div>
              </div>

              {/* Status and Verification Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 shadow-xs">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Verified Officer</span>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <MapPin size={12} className="text-[#187e8d]" />
                  <span>{officeLocation || profile?.office_location || 'Ranchi, Jharkhand'}</span>
                </span>
              </div>
            </div>

            {/* Profile fields grid */}
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FormField
                label="Officer name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!editing}
                required
              />
              <FormField
                label="Department"
                name="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!editing}
                placeholder="e.g. District Innovation Cell"
              />
              <FormField
                label="Designation"
                name="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={!editing}
                placeholder="e.g. Government Validator"
              />
              <div>
                <FormField
                  label="Official email"
                  name="email"
                  value={profile?.email || currentUser.email}
                  disabled
                />
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <LockKeyhole size={11} className="shrink-0" />
                  <span>Official email is linked to government credentials and is read-only.</span>
                </p>
              </div>
              <FormField
                label="Phone number"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editing}
                placeholder="+91 94311 00001"
              />
              <FormField
                label="Office location"
                name="office_location"
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
                disabled={!editing}
                placeholder="Ranchi, Jharkhand"
              />
            </div>

            {/* Success notification banner */}
            {saveSuccess && (
              <div
                role="status"
                className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 shadow-xs"
              >
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* Error notification banner */}
            {saveError && (
              <div
                role="alert"
                className="mt-5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 shadow-xs"
              >
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Actions: Save changes and Change password */}
            <div className="mt-7 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={!editing || isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0e2b48] disabled:cursor-not-allowed disabled:opacity-50 transition shadow-xs"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                <span>{isSaving ? 'Saving changes...' : 'Save changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordError(null)
                  setPasswordSuccess(null)
                  setPasswordModalOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs"
              >
                <LockKeyhole size={16} className="text-slate-500" />
                <span>Change password</span>
              </button>
            </div>
          </form>
        )}

        {/* Change Password Modal */}
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-[#e8f5f5] text-[#12365a]">
                    <LockKeyhole size={18} />
                  </span>
                  <div>
                    <h3 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                      Change Password
                    </h3>
                    <p className="text-xs text-slate-500">Update your officer account credentials</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={isChangingPassword}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-current-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Current password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-current-password"
                      type={showCurrentPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter current password"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-[#187e8d] focus:ring-2 focus:ring-[#187e8d]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                      aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-new-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    New password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      type={showNewPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-[#187e8d] focus:ring-2 focus:ring-[#187e8d]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                      aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-confirm-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Confirm new password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-confirm-password"
                      type={showConfirmPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Confirm new password"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-[#187e8d] focus:ring-2 focus:ring-[#187e8d]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password modal error */}
                {passwordError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700"
                  >
                    <AlertCircle size={15} className="text-red-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Password modal success */}
                {passwordSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800"
                  >
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    disabled={isChangingPassword}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white hover:bg-[#0e2b48] disabled:opacity-60 transition shadow-xs"
                  >
                    {isChangingPassword && <Loader2 size={14} className="animate-spin" />}
                    <span>{isChangingPassword ? 'Updating...' : 'Update password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </GovPage>
    </GovernmentLayout>
  )
}