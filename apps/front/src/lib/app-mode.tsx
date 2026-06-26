import { createContext, useContext, useState, useCallback } from "react"
import type { ReactNode } from "react"

export type AppMode = "client" | "driver"

function parseAppMode(value: string | null): AppMode {
  return value === "driver" ? "driver" : "client"
}

const AppModeContext = createContext<{
  mode: AppMode
  setMode: (m: AppMode) => void
}>({ mode: "client", setMode: () => {} })

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === "undefined") return "client"
    return parseAppMode(localStorage.getItem("gonexo:mode"))
  })

  const setMode = useCallback((m: AppMode) => {
    localStorage.setItem("gonexo:mode", m)
    setModeState(m)
  }, [])

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode() {
  return useContext(AppModeContext)
}
