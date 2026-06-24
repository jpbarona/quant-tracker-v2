import { DEFAULT_SETTINGS, DEFAULT_TOPICS } from '../constants'
import { createId } from '../lib/id'
import type { AppState, PersistStatus, Topic } from '../types'
import { assertCloudEnvConfigured, isCloudRequired } from './cloudConfig'
import {
  getLocalDummySessionId,
  isLocalDummySeedEnabled,
  shouldReseedLocalDummyState,
} from './localSeedConfig'
import { appStateSchema } from './schemas'
import { createSupabaseRepository } from './supabase'

const LOCAL_STORAGE_KEY = 'quant-tracker-v2-state'
const LOCAL_DUMMY_SESSION_KEY = 'quant-tracker-v2-local-dummy-session'

const defaultState = (): AppState => {
  const nowIso = new Date().toISOString()
  const topics: Topic[] = DEFAULT_TOPICS.map((name, index) => ({
    id: createId('topic'),
    name,
    orderIndex: index,
    stage: 'easy',
    createdAt: nowIso,
  }))

  return {
    topics,
    attempts: [],
    reviewSequences: [],
    dayLogs: [],
    readinessLogs: [],
    mentalMathSessions: [],
    promotionEvents: [],
    achievements: [],
    settings: DEFAULT_SETTINGS,
  }
}

const parseOrThrow = (candidate: unknown): AppState => {
  const parsed = appStateSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(`Invalid persisted app state: ${parsed.error.message}`)
  }
  return parsed.data
}

const seedLocalDummyState = async (): Promise<AppState> => {
  const { createLocalDummyAppState } = await import('./fixtures/localDummyAppState')
  const seed = createLocalDummyAppState()
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed))
  const sessionId = getLocalDummySessionId()
  if (sessionId) {
    localStorage.setItem(LOCAL_DUMMY_SESSION_KEY, sessionId)
  }
  return seed
}

export interface AppRepository {
  getState: () => Promise<AppState>
  saveState: (state: AppState) => Promise<void>
  status: PersistStatus
}

export const createLocalRepository = (): AppRepository => {
  const getState = async (): Promise<AppState> => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      if (isLocalDummySeedEnabled()) {
        return seedLocalDummyState()
      }
      const seed = defaultState()
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed))
      return seed
    }

    const parsedJson: unknown = JSON.parse(raw)
    const state = parseOrThrow(parsedJson)
    const storedSessionId = localStorage.getItem(LOCAL_DUMMY_SESSION_KEY)

    if (shouldReseedLocalDummyState(state, storedSessionId)) {
      return seedLocalDummyState()
    }

    return state
  }

  const saveState = async (state: AppState): Promise<void> => {
    parseOrThrow(state)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  }

  return {
    getState,
    saveState,
    status: {
      mode: 'local',
      cloudAvailable: false,
      cloudReason: 'Missing Supabase env vars. Running local-only persistence.',
    },
  }
}

export const createRepository = (): AppRepository => {
  const cloudRequired = isCloudRequired()

  if (cloudRequired) {
    const { url, anonKey } = assertCloudEnvConfigured()
    return createSupabaseRepository(url, anonKey, {
      fallback: createLocalRepository,
      defaultState,
      validateState: parseOrThrow,
      allowLocalFallback: false,
    })
  }

  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url || !anonKey) {
    return createLocalRepository()
  }

  return createSupabaseRepository(url, anonKey, {
    fallback: createLocalRepository,
    defaultState,
    validateState: parseOrThrow,
    allowLocalFallback: true,
  })
}
