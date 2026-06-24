import type { AppState } from '../types'
import { appStateSchema } from './schemas'

export const LOCAL_STORAGE_KEY = 'quant-tracker-v2-state'

const parseOrThrow = (candidate: unknown): AppState => {
  const parsed = appStateSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(`Invalid persisted app state: ${parsed.error.message}`)
  }
  return parsed.data
}

export const readLocalState = (): AppState | null => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsedJson: unknown = JSON.parse(raw)
    return parseOrThrow(parsedJson)
  } catch {
    return null
  }
}

export const writeLocalState = (state: AppState): void => {
  parseOrThrow(state)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
}
