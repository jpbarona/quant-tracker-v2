import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import {
  getLocalDummySessionId,
  isLocalDummyAppState,
  isLocalDummySeedEnabled,
  shouldReseedLocalDummyState,
} from './localSeedConfig'
import type { AppState } from '../types'

const dummyState = (): AppState => ({
  topics: [
    {
      id: 'local-dummy-topic-0',
      name: 'Combinatorics and counting',
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

describe('isLocalDummySeedEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false in production even when flag is set', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    expect(isLocalDummySeedEnabled()).toBe(false)
  })

  it('returns false in dev when flag is missing', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '')
    expect(isLocalDummySeedEnabled()).toBe(false)
  })

  it('returns false in dev when flag is not 1', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', 'true')
    expect(isLocalDummySeedEnabled()).toBe(false)
  })

  it('returns true only in dev with VITE_LOCAL_DUMMY_DATA=1', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    expect(isLocalDummySeedEnabled()).toBe(true)
  })
})

describe('shouldReseedLocalDummyState', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when dummy seed is disabled', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '')
    expect(shouldReseedLocalDummyState(dummyState(), 'session-a')).toBe(false)
  })

  it('returns true when stored state is not dummy', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')
    const nonDummy = { ...dummyState(), topics: [{ ...dummyState().topics[0]!, id: 'topic-real' }] }
    expect(shouldReseedLocalDummyState(nonDummy, null)).toBe(true)
  })

  it('returns true when dummy session changed', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-b')
    expect(shouldReseedLocalDummyState(dummyState(), 'session-a')).toBe(true)
  })

  it('returns false when dummy session matches', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_LOCAL_DUMMY_DATA', '1')
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', 'session-a')
    expect(shouldReseedLocalDummyState(dummyState(), 'session-a')).toBe(false)
  })

  it('returns null session id when env is unset', () => {
    vi.stubEnv('VITE_LOCAL_DUMMY_SESSION', '')
    expect(getLocalDummySessionId()).toBeNull()
  })

  it('detects dummy app state by topic id prefix', () => {
    expect(isLocalDummyAppState(dummyState())).toBe(true)
    expect(
      isLocalDummyAppState({
        ...dummyState(),
        topics: [{ ...dummyState().topics[0]!, id: 'topic-real' }],
      }),
    ).toBe(false)
  })
})
