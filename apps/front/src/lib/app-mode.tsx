import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useSession } from "@/lib/auth-client"
import { useDriverProfile } from "@/hooks/use-driver-profile-gate"

export type AppMode = "client" | "driver"

type ModeSelection = {
  userId: string
  mode: AppMode
}

type AppModeContextValue = {
  mode: AppMode
  setMode: (mode: AppMode, userId?: string) => void
  clearMode: (userId?: string) => void
  hasSelectedMode: boolean
  hasDriverProfile: boolean
  isPending: boolean
}

const AppModeContext = createContext<AppModeContextValue | null>(null)

function modeStorageKey(userId: string) {
  return `gonexo:mode:${userId}`
}

export function getStoredAppMode(userId: string): AppMode | null {
  const value = sessionStorage.getItem(modeStorageKey(userId))
  return value === "client" || value === "driver" ? value : null
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession()
  const driverProfile = useDriverProfile()
  const [selection, setSelection] = useState<ModeSelection | null>(null)
  const userId = session?.user.id
  const selectedMode = selection && selection.userId === userId ? selection.mode : null
  const storedMode = userId ? getStoredAppMode(userId) : null
  const mode = selectedMode ?? storedMode ?? "client"

  const setMode = useCallback((nextMode: AppMode, accountId = userId) => {
    if (!accountId) return
    sessionStorage.setItem(modeStorageKey(accountId), nextMode)
    setSelection({ userId: accountId, mode: nextMode })
  }, [userId])

  const clearMode = useCallback((accountId = userId) => {
    if (!accountId) return
    sessionStorage.removeItem(modeStorageKey(accountId))
    setSelection((current) => current?.userId === accountId ? null : current)
  }, [userId])

  const contextValue = useMemo<AppModeContextValue>(() => ({
    mode,
    setMode,
    clearMode,
    hasSelectedMode: !!(selectedMode ?? storedMode),
    hasDriverProfile: !!driverProfile.data,
    isPending: sessionPending || (!!userId && driverProfile.isPending),
  }), [
    clearMode,
    driverProfile.data,
    driverProfile.isPending,
    mode,
    selectedMode,
    sessionPending,
    setMode,
    storedMode,
    userId,
  ])

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode() {
  const context = useContext(AppModeContext)
  if (!context) throw new Error("useAppMode must be used within AppModeProvider")
  return context
}
