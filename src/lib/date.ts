import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

export const isoDay = (value: Date): string => format(startOfDay(value), 'yyyy-MM-dd')

export const dateFromIso = (value: string): Date => {
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date: ${value}`)
  }
  return startOfDay(parsed)
}

export const isDateBetweenInclusive = (
  dateIso: string,
  startIso: string,
  endIso: string,
): boolean => {
  const day = dateFromIso(dateIso)
  const start = dateFromIso(startIso)
  const end = dateFromIso(endIso)
  return !isBefore(day, start) && !isAfter(day, end)
}

export const plusDaysIso = (dateIso: string, days: number): string => {
  return isoDay(addDays(dateFromIso(dateIso), days))
}

export const compareIsoDates = (left: string, right: string): number => {
  return dateFromIso(left).getTime() - dateFromIso(right).getTime()
}
