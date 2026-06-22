import { parseQuestionLabel } from './urlParser'
import { DIFFICULTIES, type Difficulty } from '../types'

export type AttemptMode = 'new' | 'review' | 'mixed'

export interface AttemptStartInput {
  sourceUrl: string
  mode: AttemptMode
  topicId: string | null
  scheduledSeconds: number
  dueReviewId: string | null
  duplicateExists: boolean
  duplicateAcknowledged: boolean
  topicIds: string[]
  attemptAlreadyRunning: boolean
}

export const isDifficulty = (value: string): value is Difficulty => {
  return (DIFFICULTIES as readonly string[]).includes(value)
}

export const isAttemptMode = (value: string): value is AttemptMode => {
  return value === 'new' || value === 'review' || value === 'mixed'
}

export const validateAttemptStart = (input: AttemptStartInput): void => {
  if (input.attemptAlreadyRunning) {
    throw new Error('A timed attempt is already running.')
  }

  const trimmedUrl = input.sourceUrl.trim()
  if (trimmedUrl.length === 0) {
    throw new Error('Enter a QuantQuestions URL before starting.')
  }

  parseQuestionLabel(trimmedUrl)

  if (!isAttemptMode(input.mode)) {
    throw new Error('Attempt mode is invalid.')
  }

  if (input.mode === 'review' && !input.dueReviewId) {
    throw new Error('No review is due today. Switch to New or Mixed mode.')
  }

  if (input.duplicateExists && !input.duplicateAcknowledged) {
    throw new Error('This URL was attempted before. Confirm re-attempt below.')
  }

  if (input.mode !== 'mixed') {
    if (!input.topicId) {
      throw new Error('Select a topic before starting.')
    }
    if (!input.topicIds.includes(input.topicId)) {
      throw new Error('Selected topic is no longer available. Choose another topic.')
    }
  }

  if (!Number.isFinite(input.scheduledSeconds) || input.scheduledSeconds <= 0) {
    throw new Error('Timer duration is not configured. Check settings.')
  }
}

export const getAttemptStartError = (input: AttemptStartInput): string | null => {
  try {
    validateAttemptStart(input)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Cannot start attempt.'
  }
}
