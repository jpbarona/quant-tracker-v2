import { plusDaysIso } from '../lib/date'
import type { DayLog, ReviewSequence } from '../types'
import { dueDateForReviewStep, forwardToNextEligibleDate } from './reviews'

export const advanceReviewAfterSuccess = (
  sequence: ReviewSequence,
  completedDateIso: string,
  dayLogs: DayLog[],
  nowIso: string,
): ReviewSequence => {
  if (sequence.status !== 'active') {
    throw new Error('Review sequence is not active')
  }

  const updatedStep = Math.min(sequence.currentStep + 1, 3) as ReviewSequence['currentStep']
  const status = sequence.currentStep === 3 ? 'completed' : 'active'
  const dueDate =
    status === 'completed'
      ? sequence.dueDate
      : dueDateForReviewStep(completedDateIso, updatedStep, dayLogs)

  return {
    ...sequence,
    currentStep: updatedStep,
    status,
    dueDate,
    updatedAt: nowIso,
  }
}

export const postponeReviewToTomorrow = (
  sequence: ReviewSequence,
  todayIso: string,
  dayLogs: DayLog[],
  nowIso: string,
): ReviewSequence => {
  if (sequence.status !== 'active') {
    throw new Error('Review sequence is not active')
  }

  return {
    ...sequence,
    dueDate: forwardToNextEligibleDate(plusDaysIso(todayIso, 1), dayLogs),
    updatedAt: nowIso,
  }
}
