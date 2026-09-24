import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, UserRole } from '../types'

export interface RegisterInput { name: string; email: string; role: UserRole; organization?: string; phone?: string }
interface LoginInput { email: string; password: string; role: UserRole; rememberMe?: boolean }
interface AuthContextValue { isAuthenticated: boolean; isInitialized: boolean; currentUser: User | null; selectedRole: UserRole | null; login: (input: LoginInput) => Promise<User>; logout: () => void; register: (input: RegisterInput) => Promise<User>; updateUser: (updates: Partial<User>) => void }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const SESSION_KEY = 'impactforge.mock.auth'
const demoNames: Record<UserRole, string> = { citizen: 'Asha Rao', government: 'Vikram Singh', hei: 'Dr. Meera Nair', faculty: 'Dr. Arjun Menon', partner: 'Karan Patel', admin: 'ImpactForge Admin' }
const demoOrganizations: Record<UserRole, string> = { citizen: 'Community member', government: 'District Innovation Cell', hei: 'Birla Institute of Technology (BIT) Mesra', faculty: 'Tata Institute of Social Sciences', partner: 'CivicGrid Technologies', admin: 'ImpactForge' }

function makeUser(input: { name: string; email: string; role: UserRole; organization?: string }): User { return { id: `mock-${input.role}`, name: input.name, email: input.email, role: input.role, organization: input.organization || demoOrganizations[input.role], isVerified: true } }
function readStoredUser(): User | null { try { const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); if (!raw) return null; const user = JSON.parse(raw) as User; if ((user.role as string) === 'student') { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); return null } return user } catch { return null } }

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(readStoredUser)
  const isInitialized = true
  const persist = (user: User, rememberMe = false) => { const storage = rememberMe ? localStorage : sessionStorage; storage.setItem(SESSION_KEY, JSON.stringify(user)); setCurrentUser(user) }
  const login = async ({ email, password, role, rememberMe = false }: LoginInput) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      if (res.ok) {
        const authData = await res.json()
        if (authData.access_token) {
          sessionStorage.setItem('access_token', authData.access_token)
          localStorage.setItem('access_token', authData.access_token)
        }
        const user: User = authData.user
          ? {
              id: String(authData.user.id),
              name: authData.user.full_name,
              email: authData.user.email,
              role: authData.user.role as UserRole,
              organization: authData.user.organization_name || demoOrganizations[role],
              department: authData.user.department || undefined,
              designation: authData.user.designation || undefined,
              phone: authData.user.phone || undefined,
              officeLocation: authData.user.office_location || undefined,
              avatar: authData.user.avatar_url || undefined,
              avatarUrl: authData.user.avatar_url || undefined,
              isVerified: true,
            }
          : makeUser({ name: demoNames[role], email, role })
        persist(user, rememberMe)
        return user
      }
    } catch {
      // Backend unavailable; fallback to offline session
    }
    const user = makeUser({ name: demoNames[role], email, role })
    persist(user, rememberMe)
    return user
  }
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('access_token')
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('token')
    setCurrentUser(null)
  }
  const register = async (input: RegisterInput) => makeUser(input)
  const updateUser = (updates: Partial<User>) =>
    setCurrentUser((user) => {
      if (!user) return user
      const updated = { ...user, ...updates }
      const isRemembered = Boolean(localStorage.getItem(SESSION_KEY))
      const storage = isRemembered ? localStorage : sessionStorage
      storage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  return <AuthContext.Provider value={{ isAuthenticated: Boolean(currentUser), isInitialized, currentUser, selectedRole: currentUser?.role ?? null, login, logout, register, updateUser }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }