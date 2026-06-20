import { REVIEW_INTERVALS } from '../constants'
import { plusDaysIso } from '../lib/date'
import type { DayLog, DayType, ReviewStep } from '../types'

export const isReviewEligibleDayType = (dayType: DayType): boolean => {
  return dayType === 'green' || dayType === 'yellow'
}

const dayTypeForDate = (logs: DayLog[], dateIso: string): DayType | null => {
  return logs.find((entry) => entry.date === dateIso)?.dayType ?? null
}

export const forwardToNextEligibleDate = (baseDateIso: string, dayLogs: DayLog[]): string => {
  let candidate = baseDateIso
  for (let i = 0; i < 366; i += 1) {
    const dayType = dayTypeForDate(dayLogs, candidate)
    if (!dayType || isReviewEligibleDayType(dayType)) {
      return candidate
    }
    candidate = plusDaysIso(candidate, 1)
  }
  throw new Error('Unable to forward review date into an eligible day')
}

export const dueDateForReviewStep = (
  completedDateIso: string,
  step: ReviewStep,
  dayLogs: DayLog[],
): string => {
  const interval = REVIEW_INTERVALS[step]
  if (interval === undefined) {
    throw new Error(`Invalid review step: ${step}`)
  }
  return forwardToNextEligibleDate(plusDaysIso(completedDateIso, interval), dayLogs)
}

