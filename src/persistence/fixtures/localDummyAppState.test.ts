import { describe, expect, it } from 'vitest'
import { appStateSchema } from '../schemas'
import { createLocalDummyAppState } from './localDummyAppState'

describe('createLocalDummyAppState', () => {
  it('parses via appStateSchema', () => {
    const state = createLocalDummyAppState('2026-06-24')
    expect(() => appStateSchema.parse(state)).not.toThrow()
  })

  it('includes attempts, reviews, and topics', () => {
    const state = createLocalDummyAppState('2026-06-24')
    expect(state.topics.length).toBeGreaterThan(0)
    expect(state.attempts.length).toBeGreaterThanOrEqual(5)
    expect(state.reviewSequences.length).toBeGreaterThanOrEqual(2)
  })

  it('has a review due today and one overdue for fixed todayIso', () => {
    const state = createLocalDummyAppState('2026-06-24')
    const activeReviews = state.reviewSequences.filter((review) => review.status === 'active')
    expect(activeReviews.some((review) => review.dueDate === '2026-06-24')).toBe(true)
    expect(activeReviews.some((review) => review.dueDate < '2026-06-24')).toBe(true)
  })
})
