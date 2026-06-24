import { describe, expect, it } from 'vitest'
import { advanceReviewAfterSuccess, postponeReviewToTomorrow } from './reviewActions'
import type { DayLog, ReviewSequence } from '../types'

const sequence = (overrides: Partial<ReviewSequence> = {}): ReviewSequence => ({
  id: 'review_1',
  sourceUrl: 'https://quantquestions.io/problems/p1',
  parsedQuestionLabel: 'Problem 1',
  topicId: 'topic_1',
  topicLabelSnapshot: 'Probability',
  originalDifficulty: 'easy',
  currentStep: 0,
  dueDate: '2026-06-23',
  status: 'active',
  historyAttemptIds: [],
  createdAt: '2026-06-22T00:00:00.000Z',
  updatedAt: '2026-06-22T00:00:00.000Z',
  ...overrides,
})

describe('advanceReviewAfterSuccess', () => {
  it('advances step and schedules the next interval from today', () => {
    const next = advanceReviewAfterSuccess(sequence(), '2026-06-23', [], '2026-06-23T12:00:00.000Z')
    expect(next.currentStep).toBe(1)
    expect(next.status).toBe('active')
    expect(next.dueDate).toBe('2026-06-26')
  })

  it('completes the sequence on step 3', () => {
    const next = advanceReviewAfterSuccess(
      sequence({ currentStep: 3, dueDate: '2026-06-23' }),
      '2026-06-23',
      [],
      '2026-06-23T12:00:00.000Z',
    )
    expect(next.currentStep).toBe(3)
    expect(next.status).toBe('completed')
    expect(next.dueDate).toBe('2026-06-23')
  })
})

describe('postponeReviewToTomorrow', () => {
  it('moves due date to tomorrow without changing step', () => {
    const dayLogs: DayLog[] = [{ date: '2026-06-23', dayType: 'green', protocolCompleted: false }]
    const next = postponeReviewToTomorrow(sequence(), '2026-06-23', dayLogs, '2026-06-23T12:00:00.000Z')
    expect(next.currentStep).toBe(0)
    expect(next.dueDate).toBe('2026-06-24')
  })

  it('skips to the next eligible day when tomorrow is not a review day', () => {
    const dayLogs: DayLog[] = [
      { date: '2026-06-23', dayType: 'green', protocolCompleted: false },
      { date: '2026-06-24', dayType: 'red', protocolCompleted: false },
    ]
    const next = postponeReviewToTomorrow(sequence(), '2026-06-23', dayLogs, '2026-06-23T12:00:00.000Z')
    expect(next.dueDate).toBe('2026-06-25')
  })
})
