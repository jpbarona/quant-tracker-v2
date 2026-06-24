import { describe, expect, it } from 'vitest'
import { mergeAppState, mergedHasMoreDataThanCloud } from './merge'
import type { AppState } from '../types'

const baseSettings = {
  easySeconds: 600,
  mediumSeconds: 900,
  hardSeconds: 1200,
  targetDate: '2026-07-26',
}

const emptyState = (): AppState => ({
  topics: [],
  attempts: [],
  reviewSequences: [],
  dayLogs: [],
  readinessLogs: [],
  mentalMathSessions: [],
  promotionEvents: [],
  achievements: [],
  settings: baseSettings,
})

describe('mergeAppState', () => {
  it('keeps records unique to each side', () => {
    const remote = emptyState()
    remote.attempts = [
      {
        id: 'attempt-remote',
        date: '2026-06-20',
        sourceUrl: 'https://quantquestions.io/problems/remote',
        parsedQuestionLabel: 'Remote',
        mode: 'new',
        reviewSequenceId: null,
        topicId: null,
        topicLabelSnapshot: 'Other',
        difficulty: 'easy',
        dayType: 'green',
        phase: 'foundations',
        startedAt: '2026-06-20T10:00:00.000Z',
        completedAt: '2026-06-20T10:05:00.000Z',
        scheduledSeconds: 600,
        elapsedSeconds: 300,
        pausedSeconds: 0,
        timerExpired: false,
        abandoned: false,
        firstTryCorrect: true,
        usedSolution: false,
        divergence: 'no_divergence',
        cueMissed: '',
        qualifyingSuccess: true,
      },
    ]

    const local = emptyState()
    local.attempts = [
      {
        id: 'attempt-local',
        date: '2026-06-21',
        sourceUrl: 'https://quantquestions.io/problems/local',
        parsedQuestionLabel: 'Local',
        mode: 'new',
        reviewSequenceId: null,
        topicId: null,
        topicLabelSnapshot: 'Other',
        difficulty: 'medium',
        dayType: 'green',
        phase: 'foundations',
        startedAt: '2026-06-21T10:00:00.000Z',
        completedAt: '2026-06-21T10:05:00.000Z',
        scheduledSeconds: 900,
        elapsedSeconds: 400,
        pausedSeconds: 0,
        timerExpired: false,
        abandoned: false,
        firstTryCorrect: true,
        usedSolution: false,
        divergence: 'no_divergence',
        cueMissed: '',
        qualifyingSuccess: true,
      },
    ]

    const merged = mergeAppState(remote, local)
    expect(merged.attempts.map((attempt) => attempt.id).sort()).toEqual(['attempt-local', 'attempt-remote'])
  })

  it('prefers newer attempt on id conflict', () => {
    const remote = emptyState()
    const local = emptyState()
    const shared = {
      id: 'attempt-1',
      date: '2026-06-20',
      sourceUrl: 'https://quantquestions.io/problems/shared',
      parsedQuestionLabel: 'Shared',
      mode: 'new' as const,
      reviewSequenceId: null,
      topicId: null,
      topicLabelSnapshot: 'Other',
      difficulty: 'easy' as const,
      dayType: 'green' as const,
      phase: 'foundations' as const,
      startedAt: '2026-06-20T10:00:00.000Z',
      completedAt: '2026-06-20T10:05:00.000Z',
      scheduledSeconds: 600,
      elapsedSeconds: 300,
      pausedSeconds: 0,
      timerExpired: false,
      abandoned: false,
      firstTryCorrect: true,
      usedSolution: false,
      divergence: 'no_divergence' as const,
      cueMissed: '',
      qualifyingSuccess: true,
    }

    remote.attempts = [{ ...shared, completedAt: '2026-06-20T10:05:00.000Z' }]
    local.attempts = [{ ...shared, completedAt: '2026-06-20T11:00:00.000Z', firstTryCorrect: false }]

    const merged = mergeAppState(remote, local)
    expect(merged.attempts).toHaveLength(1)
    expect(merged.attempts[0]?.completedAt).toBe('2026-06-20T11:00:00.000Z')
    expect(merged.attempts[0]?.firstTryCorrect).toBe(false)
  })

  it('prefers local on timestamp tie', () => {
    const remote = emptyState()
    const local = emptyState()
    remote.dayLogs = [{ date: '2026-06-20', dayType: 'green', protocolCompleted: false }]
    local.dayLogs = [{ date: '2026-06-20', dayType: 'red', protocolCompleted: true }]

    const merged = mergeAppState(remote, local)
    expect(merged.dayLogs).toEqual([{ date: '2026-06-20', dayType: 'red', protocolCompleted: true }])
  })

  it('uses local settings', () => {
    const remote = emptyState()
    remote.settings = { ...baseSettings, easySeconds: 500 }
    const local = emptyState()
    local.settings = { ...baseSettings, easySeconds: 700 }

    const merged = mergeAppState(remote, local)
    expect(merged.settings.easySeconds).toBe(700)
  })
})

describe('mergedHasMoreDataThanCloud', () => {
  it('detects when merged state has more tracked records', () => {
    const cloud = emptyState()
    const merged = emptyState()
    merged.attempts = [
      {
        id: 'attempt-1',
        date: '2026-06-20',
        sourceUrl: 'https://quantquestions.io/problems/a',
        parsedQuestionLabel: 'A',
        mode: 'new',
        reviewSequenceId: null,
        topicId: null,
        topicLabelSnapshot: 'Other',
        difficulty: 'easy',
        dayType: 'green',
        phase: 'foundations',
        startedAt: '2026-06-20T10:00:00.000Z',
        completedAt: '2026-06-20T10:05:00.000Z',
        scheduledSeconds: 600,
        elapsedSeconds: 300,
        pausedSeconds: 0,
        timerExpired: false,
        abandoned: false,
        firstTryCorrect: true,
        usedSolution: false,
        divergence: 'no_divergence',
        cueMissed: '',
        qualifyingSuccess: true,
      },
    ]

    expect(mergedHasMoreDataThanCloud(merged, cloud)).toBe(true)
    expect(mergedHasMoreDataThanCloud(cloud, merged)).toBe(false)
  })
})
