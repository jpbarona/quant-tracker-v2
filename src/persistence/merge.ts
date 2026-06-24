import type { AppState } from '../types'

const mergeById = <T extends { id: string }>(
  remote: T[],
  local: T[],
  timestamp: (item: T) => string,
): T[] => {
  const merged = new Map<string, T>()

  for (const item of remote) {
    merged.set(item.id, item)
  }

  for (const item of local) {
    const existing = merged.get(item.id)
    if (!existing) {
      merged.set(item.id, item)
      continue
    }
    if (timestamp(item) >= timestamp(existing)) {
      merged.set(item.id, item)
    }
  }

  return Array.from(merged.values())
}

const mergeByDate = <T extends { date: string }>(remote: T[], local: T[]): T[] => {
  const merged = new Map<string, T>()

  for (const item of remote) {
    merged.set(item.date, item)
  }

  for (const item of local) {
    merged.set(item.date, item)
  }

  return Array.from(merged.values())
}

export const mergeAppState = (remote: AppState, local: AppState): AppState => {
  return {
    topics: mergeById(remote.topics, local.topics, (topic) => topic.createdAt).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    ),
    attempts: mergeById(remote.attempts, local.attempts, (attempt) => attempt.completedAt).sort(
      (a, b) => a.completedAt.localeCompare(b.completedAt),
    ),
    reviewSequences: mergeById(remote.reviewSequences, local.reviewSequences, (sequence) => sequence.updatedAt).sort(
      (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    ),
    dayLogs: mergeByDate(remote.dayLogs, local.dayLogs).sort((a, b) => a.date.localeCompare(b.date)),
    readinessLogs: mergeByDate(remote.readinessLogs, local.readinessLogs).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    mentalMathSessions: mergeById(remote.mentalMathSessions, local.mentalMathSessions, (session) => session.completedAt).sort(
      (a, b) => a.completedAt.localeCompare(b.completedAt),
    ),
    promotionEvents: mergeById(remote.promotionEvents, local.promotionEvents, (event) => event.createdAt).sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    ),
    achievements: mergeById(remote.achievements, local.achievements, (achievement) => achievement.date).sort(
      (a, b) => a.date.localeCompare(b.date),
    ),
    settings: local.settings,
  }
}

export const mergedHasMoreDataThanCloud = (merged: AppState, cloud: AppState): boolean => {
  return (
    merged.attempts.length > cloud.attempts.length ||
    merged.reviewSequences.length > cloud.reviewSequences.length ||
    merged.dayLogs.length > cloud.dayLogs.length
  )
}
