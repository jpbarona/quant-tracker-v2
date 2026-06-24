import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
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

import { AppStoreProvider, useAppStore } from '../state/AppStore'
import { TodayPage } from './TodayPage'

const ReadyGate = ({ children }: { children: ReactNode }) => {
  const { loading, state } = useAppStore()
  if (loading || !state) {
    return <div data-testid="app-loading">loading</div>
  }
  return children
}

const SAMPLE_URL = 'https://quantquestions.io/problems/sample-question'

const renderTodayPage = async () => {
  render(
    <AppStoreProvider>
      <ReadyGate>
        <TodayPage />
      </ReadyGate>
    </AppStoreProvider>,
  )

  await waitFor(() => {
    expect(screen.queryByTestId('app-loading')).not.toBeInTheDocument()
  })
}

const completePostmortemFlow = async (user: ReturnType<typeof userEvent.setup>) => {
  const urlInput = await screen.findByPlaceholderText('https://quantquestions.io/problems/...')
  await user.clear(urlInput)
  await user.type(urlInput, SAMPLE_URL)
  await user.click(screen.getByRole('button', { name: 'Start timed attempt' }))
  await user.click(screen.getByRole('button', { name: 'Finish attempt' }))
  await screen.findByRole('button', { name: 'Save attempt' })
}

describe('TodayPage postmortem save', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(`${TEST_TODAY}T12:00:00.000Z`))
    mockGetState.mockResolvedValue(createTestAppState())
    mockSaveState.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows saving state until persistence completes, then success feedback', async () => {
    const deferred = createDeferred<void>()
    mockSaveState.mockReturnValue(deferred.promise)
    const user = userEvent.setup()

    await renderTodayPage()
    await completePostmortemFlow(user)

    const saveButton = screen.getByRole('button', { name: 'Save attempt' })
    await user.click(saveButton)

    expect(saveButton).toHaveTextContent('Saving attempt...')
    expect(saveButton).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    deferred.resolve()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Save attempt' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Attempt saved.')
    expect(mockSaveState).toHaveBeenCalledTimes(1)
    expect(mockSaveState.mock.calls[0]?.[0]?.attempts).toHaveLength(1)
    expect(mockSaveState.mock.calls[0]?.[0]?.attempts[0]?.sourceUrl).toBe(SAMPLE_URL)
  })

  it('keeps the postmortem form open and shows an error when persistence fails', async () => {
    mockSaveState.mockRejectedValue(new Error('Cloud save failed'))
    const user = userEvent.setup()

    await renderTodayPage()
    await completePostmortemFlow(user)

    await user.click(screen.getByRole('button', { name: 'Save attempt' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Cloud save failed')
    })
    expect(screen.getByRole('button', { name: 'Save attempt' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('clears the success message when attempt inputs change', async () => {
    const user = userEvent.setup()

    await renderTodayPage()
    await completePostmortemFlow(user)
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Attempt saved.')
    })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Difficulty' }), 'medium')

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})
