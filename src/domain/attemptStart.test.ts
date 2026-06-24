import { describe, expect, it } from 'vitest'
import { attemptSchema } from '../persistence/schemas'
import { getAttemptStartError, normalizeAttemptSourceUrl, validateAttemptStart } from './attemptStart'

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

  it('rejects urls without a protocol', () => {
    expect(() =>
      validateAttemptStart({
        ...baseInput,
        sourceUrl: 'quantquestions.io/problems/sample-question',
      }),
    ).toThrow('Question URL is invalid')
  })

  it('rejects non-http urls', () => {
    expect(() => validateAttemptStart({ ...baseInput, sourceUrl: 'ftp://quantquestions.io/problems/x' })).toThrow(
      'Question URL must use http or https',
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

describe('normalizeAttemptSourceUrl', () => {
  it('returns a trimmed https url', () => {
    expect(normalizeAttemptSourceUrl('  https://quantquestions.io/problems/sample  ')).toBe(
      'https://quantquestions.io/problems/sample',
    )
  })

  it('produces urls that pass persistence validation', () => {
    const sourceUrl = normalizeAttemptSourceUrl('https://quantquestions.io/problems/sample-question')
    expect(() =>
      attemptSchema.parse({
        id: 'attempt-1',
        date: '2026-06-24',
        sourceUrl,
        parsedQuestionLabel: 'Sample Question',
        mode: 'new',
        reviewSequenceId: null,
        topicId: 'topic-1',
        topicLabelSnapshot: 'Probability',
        difficulty: 'easy',
        dayType: 'green',
        phase: 'foundations',
        startedAt: '2026-06-24T09:00:00.000Z',
        completedAt: '2026-06-24T09:05:00.000Z',
        scheduledSeconds: 600,
        elapsedSeconds: 300,
        pausedSeconds: 0,
        timerExpired: false,
        abandoned: false,
        firstTryCorrect: true,
        usedSolution: false,
        divergence: 'no_divergence',
        cueMissed: '',
        qualifyingSuccess: true,
      }),
    ).not.toThrow()
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
