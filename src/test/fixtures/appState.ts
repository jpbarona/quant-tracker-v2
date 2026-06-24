import { DEFAULT_SETTINGS } from '../../constants'
import type { AppState } from '../../types'

export const TEST_TODAY = '2026-06-24'

export const createTestAppState = (): AppState => ({
  topics: [
    {
      id: 'topic-1',
      name: 'Probability fundamentals',
      orderIndex: 0,
      stage: 'easy',
      createdAt: '2026-06-20T00:00:00.000Z',
    },
  ],
  attempts: [],
  reviewSequences: [],
  dayLogs: [{ date: TEST_TODAY, dayType: 'green', protocolCompleted: false }],
  readinessLogs: [],
  mentalMathSessions: [],
  promotionEvents: [],
  achievements: [],
  settings: DEFAULT_SETTINGS,
})
