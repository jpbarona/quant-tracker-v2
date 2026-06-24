import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import { createLocalRepository } from './repository'
import type { AppState } from '../types'

const LOCAL_STORAGE_KEY = 'quant-tracker-v2-state'
const LOCAL_DUMMY_SESSION_KEY = 'quant-tracker-v2-local-dummy-session'

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

const storedState = (): AppState => ({
  topics: [
    {
      id: 'stored-topic-0',
      name: 'Stored topic',
      orderIndex: 0,
      stage: 'easy',
      createdAt: '2026-06-20T00:00:00.000Z',
    },
  ],
  attempts: [],
  reviewSequences: [],
  dayLogs: [],
  readinessLogs: [],
  mentalMathSessions: [],
  promotionEvents: [],
  achievements: [],
  settings: DEFAULT_SETTINGS,
})

describe('createLocalRepository local seed', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('seeds dummy data when enabled and storage is empty', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')

    const state = await createLocalRepository().getState()

    expect(state.attempts.length).toBeGreaterThan(0)
    expect(state.topics.some((topic) => topic.id.startsWith('local-dummy-topic-'))).toBe(true)
    expect(localStorage.getItem(LOCAL_DUMMY_SESSION_KEY)).toBe('session-a')
  })

  it('seeds default state when disabled and storage is empty', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '')

    const state = await createLocalRepository().getState()

    expect(state.attempts).toEqual([])
    expect(state.topics.length).toBeGreaterThan(0)
    expect(state.topics.every((topic) => !topic.id.startsWith('local-dummy-topic-'))).toBe(true)
  })

  it('replaces non-dummy stored state when dummy seed is enabled', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storedState()))

    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')

    const state = await createLocalRepository().getState()

    expect(state.topics.some((topic) => topic.id.startsWith('local-dummy-topic-'))).toBe(true)
    expect(state.attempts.length).toBeGreaterThan(0)
  })

  it('re-seeds dummy state when local session changes', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')

    const initial = await createLocalRepository().getState()
    const mutated = { ...initial, attempts: [] }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mutated))

    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-b')

    const reset = await createLocalRepository().getState()

    expect(reset.attempts.length).toBeGreaterThan(0)
    expect(localStorage.getItem(LOCAL_DUMMY_SESSION_KEY)).toBe('session-b')
  })

  it('keeps dummy state within the same local session', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')

    const initial = await createLocalRepository().getState()
    const mutated = { ...initial, attempts: [] }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mutated))

    const reloaded = await createLocalRepository().getState()

    expect(reloaded.attempts).toEqual([])
  })
})
