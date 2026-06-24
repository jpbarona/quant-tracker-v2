import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestAppState, TEST_TODAY } from '../test/fixtures/appState'
import { createDeferred } from '../test/deferred'

const { mockGetState, mockSaveState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  mockSaveState: vi.fn(),
}))

vi.mock('../persistence/repository', () => ({
  createRepository: () => ({
    getState: mockGetState,
    saveState: mockSaveState,
    status: { mode: 'supabase', cloudAvailable: true },
  }),
}))

import { AppStoreProvider, useAppStore } from './AppStore'

const baseAttemptInput = {
  date: TEST_TODAY,
  sourceUrl: '  https://quantquestions.io/problems/sample-question  ',
  mode: 'new' as const,
  reviewSequenceId: null,
  topicId: 'topic-1',
  difficulty: 'easy' as const,
  dayType: 'green' as const,
  phase: 'foundations' as const,
  startedAt: '2026-06-24T10:00:00.000Z',
  completedAt: '2026-06-24T10:05:00.000Z',
  scheduledSeconds: 300,
  elapsedSeconds: 240,
  pausedSeconds: 0,
  timerExpired: false,
  abandoned: false,
  firstTryCorrect: true,
  usedSolution: false,
  divergence: 'no_divergence' as const,
  cueMissed: '',
}

const SaveAttemptHarness = () => {
  const { state, saveAttempt, loading } = useAppStore()
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (loading || !state) {
    return <div data-testid="loading">loading</div>
  }

  const runSave = async () => {
    setStatus('saving')
    setError(null)
    try {
      await saveAttempt(baseAttemptInput)
      setStatus('success')
    } catch (saveError) {
      setStatus('error')
      setError(saveError instanceof Error ? saveError.message : 'Save failed')
    }
  }

  return (
    <div>
      <div data-testid="attempt-count">{state.attempts.length}</div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{error}</div>
      <button type="button" onClick={() => void runSave()}>
        save attempt
      </button>
    </div>
  )
}

describe('AppStore saveAttempt', () => {
  beforeEach(() => {
    mockGetState.mockResolvedValue(createTestAppState())
    mockSaveState.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('waits for repository.saveState before resolving', async () => {
    const deferred = createDeferred<void>()
    mockSaveState.mockReturnValue(deferred.promise)
    const user = userEvent.setup()

    render(
      <AppStoreProvider>
        <SaveAttemptHarness />
      </AppStoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('attempt-count')).toHaveTextContent('0')
    })

    await user.click(screen.getByRole('button', { name: 'save attempt' }))

    expect(screen.getByTestId('status')).toHaveTextContent('saving')
    expect(mockSaveState).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('status')).toHaveTextContent('saving')

    deferred.resolve()
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('success')
    })
    expect(screen.getByTestId('attempt-count')).toHaveTextContent('1')
  })

  it('persists normalized attempt data to the repository', async () => {
    const user = userEvent.setup()

    render(
      <AppStoreProvider>
        <SaveAttemptHarness />
      </AppStoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('attempt-count')).toHaveTextContent('0')
    })

    await user.click(screen.getByRole('button', { name: 'save attempt' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('success')
    })

    const persisted = mockSaveState.mock.calls[0]?.[0]
    expect(persisted?.attempts).toHaveLength(1)
    expect(persisted?.attempts[0]?.sourceUrl).toBe('https://quantquestions.io/problems/sample-question')
    expect(persisted?.attempts[0]?.topicId).toBe('topic-1')
    expect(persisted?.attempts[0]?.qualifyingSuccess).toBe(true)
  })

  it('rejects when repository.saveState fails', async () => {
    mockSaveState.mockRejectedValue(new Error('Cloud save failed'))
    const user = userEvent.setup()

    render(
      <AppStoreProvider>
        <SaveAttemptHarness />
      </AppStoreProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('attempt-count')).toHaveTextContent('0')
    })

    await user.click(screen.getByRole('button', { name: 'save attempt' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    })
    expect(screen.getByTestId('error')).toHaveTextContent('Cloud save failed')
  })
})
