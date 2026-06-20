import type { DayLog } from '../types'

export const computeCurrentStreak = (dayLogs: DayLog[]): number => {
  const ordered = [...dayLogs].sort((a, b) => a.date.localeCompare(b.date))
  let streak = 0
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const entry = ordered[index]
    if (!entry?.protocolCompleted) {
      break
    }
    streak += 1
  }
  return streak
}

export const computeLongestStreak = (dayLogs: DayLog[]): number => {
  const ordered = [...dayLogs].sort((a, b) => a.date.localeCompare(b.date))
  let current = 0
  let longest = 0
  for (const entry of ordered) {
    if (entry.protocolCompleted) {
      current += 1
      longest = Math.max(longest, current)
      continue
    }
    current = 0
  }
  return longest
}
