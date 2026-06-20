import { compareIsoDates } from '../lib/date'

export const sortByIsoDateAsc = <T extends { date: string }>(items: T[]): T[] => {
  return [...items].sort((left, right) => compareIsoDates(left.date, right.date))
}
