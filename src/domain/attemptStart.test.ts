import { describe, expect, it } from 'vitest'
import { getAttemptStartError, validateAttemptStart } from './attemptStart'

const baseInput = {
  sourceUrl: 'https://quantquestions.io/problems/sample-question',
  mode: 'new' as const,
  topicId: 'topic-1',
  scheduledSeconds: 600,
  dueReviewId: null,
  duplicateExists: false,
  duplicateAcknowledged: false,
  topicIds: ['topic-1'],
  attemptAlreadyRunning: false,
}

describe('validateAttemptStart', () => {
  it('accepts a valid new attempt', () => {
    expect(() => validateAttemptStart(baseInput)).not.toThrow()
  })

  it('rejects missing urls', () => {
    expect(() => validateAttemptStart({ ...baseInput, sourceUrl: '   ' })).toThrow(
      'Enter a QuantQuestions URL before starting.',
    )
  })

  it('rejects unknown topics', () => {
    expect(() => validateAttemptStart({ ...baseInput, topicId: 'missing' })).toThrow(
      'Selected topic is no longer available. Choose another topic.',
    )
  })

  it('rejects invalid timer settings', () => {
    expect(() => validateAttemptStart({ ...baseInput, scheduledSeconds: 0 })).toThrow(
      'Timer duration is not configured. Check settings.',
    )
  })
})

describe('getAttemptStartError', () => {
  it('returns null for valid input', () => {
    expect(getAttemptStartError(baseInput)).toBeNull()
  })

  it('returns a message for invalid input', () => {
    expect(getAttemptStartError({ ...baseInput, attemptAlreadyRunning: true })).toBe(
      'A timed attempt is already running.',
    )
  })
})
