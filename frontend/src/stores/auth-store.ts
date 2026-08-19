import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Staff } from '@/types/user'

interface AuthState {
  user: User | null
  staff: Staff | null
  token: string | null
  isLoading: boolean
  isHydrated: boolean
  setAuth: (user: User, token: string, staff?: Staff) => void
  clearAuth: () => void
  setLoading: (isLoading: boolean) => void
  setHydrated: (isHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      staff: null,
      token: null,
      isLoading: false,
      isHydrated: false,

      setAuth: (user, token, staff) => {
        console.log('🟢 [AuthStore] setAuth called:', { user: user.email, hasToken: !!token })
        set({ user, token, staff, isLoading: false })
      },

      clearAuth: () => {
        console.log('🔴 [AuthStore] clearAuth called')
        set({ user: null, token: null, staff: null, isLoading: false })
      },

      setLoading: (isLoading) => {
        console.log('⏳ [AuthStore] setLoading:', isLoading)
        set({ isLoading })
      },

      setHydrated: (isHydrated) => {
        console.log('💧 [AuthStore] setHydrated:', isHydrated)
        set({ isHydrated })
      },
    }),
    {
      name: 'art-studio-auth',
      partialize: (state) => ({
        user: state.user,
        staff: state.staff,
        token: state.token,
      }),
      onRehydrateStorage: () => {
        console.log('💧 [AuthStore] Starting rehydration...')
        return (state) => {
          console.log('💧 [AuthStore] Rehydration complete:', {
            hasUser: !!state?.user,
            hasToken: !!state?.token,
            userEmail: state?.user?.email
          })
          // Mark hydration as complete
          if (state) {
            state.isHydrated = true
          }
        }
      },
    }
  )
)
