import { describe, expect, it } from 'vitest'
import { groupPendingReviews } from './pendingReviews'
import type { DayLog, ReviewSequence } from '../types'

const baseSequence = (overrides: Partial<ReviewSequence> = {}): ReviewSequence => ({
  id: 'review-1',
  sourceUrl: 'https://quantquestions.io/problems/sample-question',
  parsedQuestionLabel: 'Sample Question',
  topicId: 'topic-1',
  topicLabelSnapshot: 'Probability',
  originalDifficulty: 'easy',
  currentStep: 0,
  dueDate: '2026-06-20',
  status: 'active',
  historyAttemptIds: [],
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
  ...overrides,
})

describe('groupPendingReviews', () => {
  it('splits overdue and due-today reviews', () => {
    const grouped = groupPendingReviews(
      [
        baseSequence({ id: 'overdue', dueDate: '2026-06-18' }),
        baseSequence({
          id: 'today',
          dueDate: '2026-06-22',
          sourceUrl: 'https://quantquestions.io/problems/today-question',
        }),
      ],
      [],
      '2026-06-22',
    )

    expect(grouped.overdue).toHaveLength(1)
    expect(grouped.overdue[0]?.sequence.id).toBe('overdue')
    expect(grouped.dueToday).toHaveLength(1)
    expect(grouped.dueToday[0]?.sequence.id).toBe('today')
    expect(grouped.skipped).toHaveLength(0)
  })

  it('skips invalid review sequences instead of failing the whole list', () => {
    const grouped = groupPendingReviews(
      [baseSequence({ sourceUrl: 'not-a-url' }), baseSequence({ id: 'valid', dueDate: '2026-06-22' })],
      [],
      '2026-06-22',
    )

    expect(grouped.dueToday).toHaveLength(1)
    expect(grouped.skipped).toHaveLength(1)
    expect(grouped.skipped[0]?.sequenceId).toBe('review-1')
  })

  it('rejects invalid today date input', () => {
    expect(() => groupPendingReviews([], [] as DayLog[], 'invalid-date')).toThrow('Invalid ISO date')
  })
})
