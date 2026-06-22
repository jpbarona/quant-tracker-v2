import { dateFromIso } from '../lib/date'
import type { DayType } from '../types'

export interface MentalMathLogInput {
  date: string
  dayType: DayType
  scheduledSeconds: number
  elapsedSeconds: number
  completedFullDuration: boolean
  startedAt: string
  completedAt: string
}

export const validateMentalMathLog = (input: MentalMathLogInput): void => {
  dateFromIso(input.date)
  if (!Number.isFinite(input.scheduledSeconds) || input.scheduledSeconds < 0) {
    throw new Error('Mental maths scheduled duration must be a non-negative number')
  }
  if (!Number.isFinite(input.elapsedSeconds) || input.elapsedSeconds < 0) {
    throw new Error('Mental maths elapsed duration must be a non-negative number')
  }
  if (input.elapsedSeconds > input.scheduledSeconds) {
    throw new Error('Mental maths elapsed duration cannot exceed the scheduled duration')
  }
  if (!input.startedAt.trim()) {
    throw new Error('Mental maths start time is required')
  }
  if (!input.completedAt.trim()) {
    throw new Error('Mental maths completion time is required')
  }
  if (Number.isNaN(new Date(input.startedAt).getTime())) {
    throw new Error('Mental maths start time is invalid')
  }
  if (Number.isNaN(new Date(input.completedAt).getTime())) {
    throw new Error('Mental maths completion time is invalid')
  }
}
