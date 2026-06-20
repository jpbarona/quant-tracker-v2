import { DAY_PROTOCOLS, TARGET_DATE } from '../constants'
import type { DayType, Phase, ReviewSequence } from '../types'

export interface DailyQuestionPlan {
  totalTasks: number
  newQuestions: number
  reviews: ReviewSequence[]
}

const oldestFirst = (reviews: ReviewSequence[]): ReviewSequence[] => {
  return [...reviews].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export const getDayTypeOptions = (dateIso: string): DayType[] => {
  if (dateIso === TARGET_DATE) {
    return ['yellow', 'red', 'off', 'green']
  }
  return ['green', 'yellow', 'red', 'off']
}

export const getMentalMathSecondsForDayType = (dayType: DayType): number => {
  return DAY_PROTOCOLS[dayType].mentalMathSeconds
}

export const buildDailyQuestionPlan = (
  dayType: DayType,
  dueReviews: ReviewSequence[],
  phase: Phase,
): DailyQuestionPlan => {
  void phase
  const orderedDue = oldestFirst(dueReviews)

  if (dayType === 'red' || dayType === 'off') {
    return { totalTasks: 0, newQuestions: 0, reviews: [] }
  }

  if (dayType === 'yellow') {
    const review = orderedDue[0]
    if (!review) {
      return { totalTasks: 1, newQuestions: 1, reviews: [] }
    }
    return { totalTasks: 2, newQuestions: 1, reviews: [review] }
  }

  const review = orderedDue[0]
  if (!review) {
    return { totalTasks: 2, newQuestions: 2, reviews: [] }
  }
  return { totalTasks: 2, newQuestions: 1, reviews: [review] }
}

