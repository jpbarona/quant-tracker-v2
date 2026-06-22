import { dateFromIso } from '../lib/date'
import { assertHttpUrl } from '../lib/url'
import { forwardToNextEligibleDate } from './reviews'
import type { DayLog, ReviewSequence } from '../types'

export interface PendingReviewEntry {
  sequence: ReviewSequence
  effectiveDueDate: string
}

export interface GroupedPendingReviews {
  overdue: PendingReviewEntry[]
  dueToday: PendingReviewEntry[]
  skipped: Array<{ sequenceId: string; reason: string }>
}

const assertReviewSequence = (sequence: ReviewSequence): void => {
  if (!sequence.id?.trim()) {
    throw new Error('Review sequence is missing an id')
  }
  if (sequence.status !== 'active') {
    throw new Error(`Review sequence ${sequence.id} is not active`)
  }
  dateFromIso(sequence.dueDate)
  assertHttpUrl(sequence.sourceUrl, 'Review question URL')
  if (!sequence.parsedQuestionLabel?.trim()) {
    throw new Error(`Review sequence ${sequence.id} is missing a question label`)
  }
}

export const groupPendingReviews = (
  sequences: ReviewSequence[],
  dayLogs: DayLog[],
  todayIso: string,
): GroupedPendingReviews => {
  if (!Array.isArray(sequences)) {
    throw new TypeError('Review sequences must be an array')
  }
  if (!Array.isArray(dayLogs)) {
    throw new TypeError('Day logs must be an array')
  }
  dateFromIso(todayIso)

  const entries: PendingReviewEntry[] = []
  const skipped: GroupedPendingReviews['skipped'] = []

  for (const sequence of sequences) {
    try {
      assertReviewSequence(sequence)
      const effectiveDueDate = forwardToNextEligibleDate(sequence.dueDate, dayLogs)
      dateFromIso(effectiveDueDate)
      if (effectiveDueDate > todayIso) {
        continue
      }
      entries.push({ sequence, effectiveDueDate })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown review data error'
      skipped.push({ sequenceId: sequence.id || 'unknown', reason })
    }
  }

  entries.sort((left, right) => left.effectiveDueDate.localeCompare(right.effectiveDueDate))

  return {
    overdue: entries.filter((entry) => entry.effectiveDueDate < todayIso),
    dueToday: entries.filter((entry) => entry.effectiveDueDate === todayIso),
    skipped,
  }
}
