import {
  FOUNDATIONS_END,
  FOUNDATIONS_START,
  INTERVIEW_PREP_END,
  INTERVIEW_PREP_START,
  TARGET_DATE,
} from '../constants'
import { compareIsoDates, isDateBetweenInclusive } from '../lib/date'
import type { Phase } from '../types'

export const getPhaseForDate = (dateIso: string): Phase => {
  if (isDateBetweenInclusive(dateIso, FOUNDATIONS_START, FOUNDATIONS_END)) {
    return 'foundations'
  }
  if (isDateBetweenInclusive(dateIso, INTERVIEW_PREP_START, INTERVIEW_PREP_END)) {
    return 'interview_prep'
  }
  if (dateIso === TARGET_DATE) {
    return 'target_day'
  }
  if (compareIsoDates(dateIso, TARGET_DATE) > 0) {
    return 'after_target'
  }
  throw new Error(`Date ${dateIso} is before configured plan start`)
}

