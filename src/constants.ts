import type { AppSettings, DayType } from './types'

export const TARGET_DATE = '2026-07-26'
export const FOUNDATIONS_START = '2026-06-20'
export const FOUNDATIONS_END = '2026-07-10'
export const INTERVIEW_PREP_START = '2026-07-11'
export const INTERVIEW_PREP_END = '2026-07-25'

export const REVIEW_INTERVALS = [1, 3, 7, 21] as const

export interface DayProtocol {
  questionCount: number
  reviewCountTarget: number
  mentalMathSeconds: number
  label: string
}

export const DAY_PROTOCOLS: Record<DayType, DayProtocol> = {
  green: {
    questionCount: 2,
    reviewCountTarget: 1,
    mentalMathSeconds: 10 * 60,
    label: 'Green',
  },
  yellow: {
    questionCount: 1,
    reviewCountTarget: 1,
    mentalMathSeconds: 10 * 60,
    label: 'Yellow',
  },
  red: {
    questionCount: 0,
    reviewCountTarget: 0,
    mentalMathSeconds: 5 * 60,
    label: 'Red',
  },
  off: {
    questionCount: 0,
    reviewCountTarget: 0,
    mentalMathSeconds: 0,
    label: 'Off',
  },
}

export const DEFAULT_TOPICS = [
  'Combinatorics and counting',
  'Probability fundamentals',
  "Conditional probability, Bayes' rule, and independence",
  'Random variables and probability distributions',
  'Expected value and indicator variables',
  'Variance and covariance',
  'Stochastic processes',
  'Games, stopping problems, and miscellaneous probability puzzles',
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  easySeconds: 5 * 60,
  mediumSeconds: 10 * 60,
  hardSeconds: 15 * 60,
  targetDate: TARGET_DATE,
}
