import type { AppState } from '../types'

export const isLocalDummySeedEnabled = (): boolean =>
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_DUMMY_DATA === '1'

export const getLocalDummySessionId = (): string | null =>
  import.meta.env.VITE_LOCAL_DUMMY_SESSION?.trim() || null

export const isLocalDummyAppState = (state: AppState): boolean =>
  state.topics.some((topic) => topic.id.startsWith('local-dummy-topic-'))

export const shouldReseedLocalDummyState = (
  state: AppState,
  storedSessionId: string | null,
): boolean => {
  if (!isLocalDummySeedEnabled()) {
    return false
  }
  if (!isLocalDummyAppState(state)) {
    return true
  }
  const currentSession = getLocalDummySessionId()
  if (!currentSession) {
    return false
  }
  return storedSessionId !== currentSession
}
