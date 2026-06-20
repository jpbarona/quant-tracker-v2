import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { buildDailyQuestionPlan } from '../domain/dailyPlan'
import { getPhaseForDate } from '../domain/phases'
import { evaluateTopicPromotion, isQualifyingSuccess } from '../domain/progression'
import { dueDateForReviewStep, forwardToNextEligibleDate } from '../domain/reviews'
import { parseQuestionLabel } from '../domain/urlParser'
import { isoDay, plusDaysIso } from '../lib/date'
import { createId } from '../lib/id'
import { createRepository, type AppRepository } from '../persistence/repository'
import type {
  AppSettings,
  AppState,
  Attempt,
  DayLog,
  DayType,
  Difficulty,
  DivergenceReason,
  PersistStatus,
  ReadinessScore,
  ReviewSequence,
  Topic,
} from '../types'

interface AttemptInput {
  date: string
  sourceUrl: string
  mode: 'new' | 'review' | 'mixed'
  reviewSequenceId: string | null
  topicId: string | null
  difficulty: Difficulty
  dayType: DayType
  phase: ReturnType<typeof getPhaseForDate>
  startedAt: string
  completedAt: string
  scheduledSeconds: number
  elapsedSeconds: number
  pausedSeconds: number
  timerExpired: boolean
  abandoned: boolean
  firstTryCorrect: boolean
  usedSolution: boolean
  divergence: DivergenceReason
  cueMissed: string
}

interface AppStoreState {
  appState: AppState | null
}

type Action =
  | { type: 'hydrate'; payload: AppState }
  | { type: 'set'; payload: AppState }

const reducer = (state: AppStoreState, action: Action): AppStoreState => {
  switch (action.type) {
    case 'hydrate':
    case 'set':
      return { appState: action.payload }
    default:
      return state
  }
}

const mustState = (state: AppState | null): AppState => {
  if (!state) {
    throw new Error('App state is not loaded')
  }
  return state
}

const upsertDayLog = (logs: DayLog[], nextLog: DayLog): DayLog[] => {
  const filtered = logs.filter((entry) => entry.date !== nextLog.date)
  return [...filtered, nextLog].sort((a, b) => a.date.localeCompare(b.date))
}

const topicNameById = (topics: Topic[], topicId: string | null): string => {
  if (!topicId) {
    return 'Other'
  }
  return topics.find((topic) => topic.id === topicId)?.name ?? 'Unknown Topic'
}

const dueToday = (state: AppState, dateIso: string): ReviewSequence[] => {
  return state.reviewSequences
    .filter((sequence) => sequence.status === 'active')
    .map((sequence) => {
      const effectiveDueDate = forwardToNextEligibleDate(sequence.dueDate, state.dayLogs)
      return { sequence, effectiveDueDate }
    })
    .filter((entry) => entry.effectiveDueDate <= dateIso)
    .sort((a, b) => a.effectiveDueDate.localeCompare(b.effectiveDueDate))
    .map((entry) => entry.sequence)
}

const countQuestionAttemptsForDate = (attempts: Attempt[], dateIso: string): number => {
  return attempts.filter((attempt) => attempt.date === dateIso && !attempt.abandoned).length
}

const hasMentalMathForDate = (state: AppState, dateIso: string): boolean => {
  return state.mentalMathSessions.some((session) => session.date === dateIso && session.elapsedSeconds > 0)
}

const evaluateProtocolCompletion = (
  state: AppState,
  dateIso: string,
  dayType: DayType,
): boolean => {
  if (dayType === 'off') {
    return true
  }
  if (dayType === 'red') {
    return hasMentalMathForDate(state, dateIso)
  }

  const phase = getPhaseForDate(dateIso)
  const due = dueToday(state, dateIso)
  const plan = buildDailyQuestionPlan(dayType, due, phase)
  const questionAttempts = countQuestionAttemptsForDate(state.attempts, dateIso)
  return hasMentalMathForDate(state, dateIso) && questionAttempts >= plan.totalTasks
}

const buildAchievementsForStreak = (state: AppState, dateIso: string): AppState => {
  const ordered = [...state.dayLogs].sort((a, b) => a.date.localeCompare(b.date))
  let current = 0
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    if (!ordered[i]?.protocolCompleted) {
      break
    }
    current += 1
  }

  const thresholds: Array<{ value: number; type: 'streak_3' | 'streak_7' | 'streak_14'; title: string }> = [
    { value: 3, type: 'streak_3', title: '3-day adherence streak' },
    { value: 7, type: 'streak_7', title: '7-day adherence streak' },
    { value: 14, type: 'streak_14', title: '14-day adherence streak' },
  ]
  let nextState = state
  for (const threshold of thresholds) {
    if (current < threshold.value) {
      continue
    }
    const exists = nextState.achievements.some((a) => a.type === threshold.type && a.date === dateIso)
    if (!exists) {
      nextState = {
        ...nextState,
        achievements: [
          ...nextState.achievements,
          {
            id: createId('achievement'),
            date: dateIso,
            type: threshold.type,
            title: threshold.title,
            context: 'Protocol adherence',
          },
        ],
      }
    }
  }
  return nextState
}

const createReviewSequence = (
  state: AppState,
  attempt: Attempt,
  nowIso: string,
): ReviewSequence => {
  return {
    id: createId('review'),
    sourceUrl: attempt.sourceUrl,
    parsedQuestionLabel: attempt.parsedQuestionLabel,
    topicId: attempt.topicId,
    topicLabelSnapshot: attempt.topicLabelSnapshot,
    originalDifficulty: attempt.difficulty,
    currentStep: 0,
    dueDate: dueDateForReviewStep(attempt.date, 0, state.dayLogs),
    status: 'active',
    historyAttemptIds: [attempt.id],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

interface AppStoreContextValue {
  state: AppState | null
  loading: boolean
  persistStatus: PersistStatus
  setDayType: (dateIso: string, dayType: DayType) => void
  setReadiness: (
    dateIso: string,
    values: { mentalEnergy: ReadinessScore; stress: ReadinessScore; sleepQuality: ReadinessScore },
  ) => Promise<void>
  logMentalMath: (input: {
    date: string
    dayType: DayType
    scheduledSeconds: number
    elapsedSeconds: number
    completedFullDuration: boolean
    startedAt: string
    completedAt: string
  }) => void
  saveAttempt: (input: AttemptInput) => void
  addTopic: (name: string) => void
  reorderTopics: (topicIdsInOrder: string[]) => void
  updateSettings: (settings: AppSettings) => void
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null)

const useRepository = (): AppRepository => {
  return useMemo(() => createRepository(), [])
}

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const repository = useRepository()
  const [store, dispatch] = useReducer(reducer, { appState: null })
  const [loading, setLoading] = useState(true)
  const [persistStatus] = useState<PersistStatus>(repository.status)

  useEffect(() => {
    void (async () => {
      const loaded = await repository.getState()
      dispatch({ type: 'hydrate', payload: loaded })
      setLoading(false)
    })()
  }, [repository])

  const applyState = useCallback(
    (next: AppState) => {
      dispatch({ type: 'set', payload: next })
      void repository.saveState(next)
    },
    [repository],
  )

  const persistState = useCallback(
    async (next: AppState): Promise<void> => {
      dispatch({ type: 'set', payload: next })
      await repository.saveState(next)
    },
    [repository],
  )

  const setDayType = useCallback(
    (dateIso: string, dayType: DayType) => {
      const current = mustState(store.appState)
      const protocolCompleted = evaluateProtocolCompletion(current, dateIso, dayType)
      const next = {
        ...current,
        dayLogs: upsertDayLog(current.dayLogs, { date: dateIso, dayType, protocolCompleted }),
      }
      applyState(buildAchievementsForStreak(next, dateIso))
    },
    [applyState, store.appState],
  )

  const setReadiness = useCallback(
    async (
      dateIso: string,
      values: { mentalEnergy: ReadinessScore; stress: ReadinessScore; sleepQuality: ReadinessScore },
    ): Promise<void> => {
      const current = mustState(store.appState)
      const withoutDate = current.readinessLogs.filter((entry) => entry.date !== dateIso)
      await persistState({
        ...current,
        readinessLogs: [...withoutDate, { date: dateIso, ...values }].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      })
    },
    [persistState, store.appState],
  )

  const logMentalMath = useCallback(
    (input: {
      date: string
      dayType: DayType
      scheduledSeconds: number
      elapsedSeconds: number
      completedFullDuration: boolean
      startedAt: string
      completedAt: string
    }) => {
      const current = mustState(store.appState)
      const session = {
        id: createId('mental'),
        ...input,
      }
      const nextState: AppState = {
        ...current,
        mentalMathSessions: [...current.mentalMathSessions, session].sort((a, b) =>
          a.completedAt.localeCompare(b.completedAt),
        ),
      }

      const existingDay = nextState.dayLogs.find((entry) => entry.date === input.date)
      if (existingDay) {
        const completed = evaluateProtocolCompletion(nextState, input.date, existingDay.dayType)
        nextState.dayLogs = upsertDayLog(nextState.dayLogs, {
          date: input.date,
          dayType: existingDay.dayType,
          protocolCompleted: completed,
        })
      }

      applyState(buildAchievementsForStreak(nextState, input.date))
    },
    [applyState, store.appState],
  )

  const saveAttempt = useCallback(
    (input: AttemptInput) => {
      const current = mustState(store.appState)
      const nowIso = new Date().toISOString()
      const parsedQuestionLabel = parseQuestionLabel(input.sourceUrl)
      const attempt: Attempt = {
        id: createId('attempt'),
        ...input,
        parsedQuestionLabel,
        topicLabelSnapshot: topicNameById(current.topics, input.topicId),
        qualifyingSuccess: isQualifyingSuccess(input),
      }

      let nextState: AppState = {
        ...current,
        attempts: [...current.attempts, attempt].sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
      }

      const failed = !attempt.firstTryCorrect || attempt.usedSolution || attempt.timerExpired
      if (attempt.mode === 'review') {
        if (!attempt.reviewSequenceId) {
          throw new Error('Review attempt requires reviewSequenceId')
        }
        const sequence = nextState.reviewSequences.find((entry) => entry.id === attempt.reviewSequenceId)
        if (!sequence || sequence.status !== 'active') {
          throw new Error('Review sequence not found or inactive')
        }

        const updatedStep = failed ? 0 : ((Math.min(sequence.currentStep + 1, 3) as number) as 0 | 1 | 2 | 3)
        const status = !failed && sequence.currentStep === 3 ? 'completed' : 'active'
        const dueDate =
          status === 'completed'
            ? sequence.dueDate
            : dueDateForReviewStep(attempt.date, updatedStep, nextState.dayLogs)

        nextState = {
          ...nextState,
          reviewSequences: nextState.reviewSequences.map((entry) =>
            entry.id === sequence.id
              ? {
                  ...entry,
                  currentStep: updatedStep,
                  dueDate,
                  status,
                  historyAttemptIds: [...entry.historyAttemptIds, attempt.id],
                  updatedAt: nowIso,
                }
              : entry,
          ),
        }

        if (status === 'completed') {
          nextState = {
            ...nextState,
            achievements: [
              ...nextState.achievements,
              {
                id: createId('achievement'),
                date: attempt.date,
                type: 'review_sequence_completed',
                title: 'Review sequence completed',
                context: attempt.parsedQuestionLabel,
              },
            ],
          }
        }
      } else if (failed) {
        nextState = {
          ...nextState,
          reviewSequences: [...nextState.reviewSequences, createReviewSequence(nextState, attempt, nowIso)],
        }
      }

      if (attempt.topicId) {
        const topic = nextState.topics.find((entry) => entry.id === attempt.topicId)
        if (!topic) {
          throw new Error(`Topic ${attempt.topicId} not found`)
        }
        const topicAttempts = nextState.attempts.filter((entry) => entry.topicId === attempt.topicId)
        const promotion = evaluateTopicPromotion(topicAttempts, topic.stage)
        if (promotion.shouldPromote && promotion.nextStage) {
          nextState = {
            ...nextState,
            topics: nextState.topics.map((entry) =>
              entry.id === topic.id ? { ...entry, stage: promotion.nextStage as Topic['stage'] } : entry,
            ),
            promotionEvents: [
              ...nextState.promotionEvents,
              {
                id: createId('promotion'),
                topicId: topic.id,
                fromStage: topic.stage,
                toStage: promotion.nextStage,
                triggeredByAttemptId: attempt.id,
                createdAt: nowIso,
              },
            ],
            achievements: [
              ...nextState.achievements,
              {
                id: createId('achievement'),
                date: attempt.date,
                type: promotion.nextStage === 'mixed_practice' ? 'mixed_practice_unlocked' : 'topic_promotion',
                title:
                  promotion.nextStage === 'mixed_practice'
                    ? `${topic.name} unlocked mixed practice`
                    : `${topic.name} promoted to ${promotion.nextStage}`,
                context: topic.name,
              },
            ],
          }
        }
      }

      const existingDay = nextState.dayLogs.find((entry) => entry.date === attempt.date)
      if (existingDay) {
        const completed = evaluateProtocolCompletion(nextState, attempt.date, existingDay.dayType)
        nextState.dayLogs = upsertDayLog(nextState.dayLogs, {
          date: attempt.date,
          dayType: existingDay.dayType,
          protocolCompleted: completed,
        })
      }

      applyState(buildAchievementsForStreak(nextState, attempt.date))
    },
    [applyState, store.appState],
  )

  const addTopic = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (trimmed.length === 0) {
        throw new Error('Topic name cannot be empty')
      }
      const current = mustState(store.appState)
      const exists = current.topics.some((topic) => topic.name.toLowerCase() === trimmed.toLowerCase())
      if (exists) {
        throw new Error('Topic already exists')
      }
      const nextOrder = current.topics.length
      applyState({
        ...current,
        topics: [
          ...current.topics,
          {
            id: createId('topic'),
            name: trimmed,
            orderIndex: nextOrder,
            stage: 'easy',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    },
    [applyState, store.appState],
  )

  const reorderTopics = useCallback(
    (topicIdsInOrder: string[]) => {
      const current = mustState(store.appState)
      if (topicIdsInOrder.length !== current.topics.length) {
        throw new Error('Topic reorder payload size mismatch')
      }
      const map = new Map(current.topics.map((topic) => [topic.id, topic]))
      const reordered = topicIdsInOrder.map((id, index) => {
        const topic = map.get(id)
        if (!topic) {
          throw new Error(`Unknown topic id in reorder: ${id}`)
        }
        return { ...topic, orderIndex: index }
      })
      applyState({ ...current, topics: reordered })
    },
    [applyState, store.appState],
  )

  const updateSettings = useCallback(
    (settings: AppSettings) => {
      if (
        settings.easySeconds <= 0 ||
        settings.mediumSeconds <= 0 ||
        settings.hardSeconds <= 0 ||
        !Number.isInteger(settings.easySeconds) ||
        !Number.isInteger(settings.mediumSeconds) ||
        !Number.isInteger(settings.hardSeconds)
      ) {
        throw new Error('Timer settings must be positive integers')
      }
      const current = mustState(store.appState)
      applyState({ ...current, settings })
    },
    [applyState, store.appState],
  )

  const value = useMemo<AppStoreContextValue>(
    () => ({
      state: store.appState,
      loading,
      persistStatus,
      setDayType,
      setReadiness,
      logMentalMath,
      saveAttempt,
      addTopic,
      reorderTopics,
      updateSettings,
    }),
    [
      loading,
      logMentalMath,
      persistStatus,
      reorderTopics,
      saveAttempt,
      setDayType,
      setReadiness,
      store.appState,
      addTopic,
      updateSettings,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export const useAppStore = (): AppStoreContextValue => {
  const value = useContext(AppStoreContext)
  if (!value) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return value
}

export const useTodayDate = (): string => {
  return isoDay(new Date())
}

export const getTodaySummary = (state: AppState, dateIso: string) => {
  const dayType = state.dayLogs.find((entry) => entry.date === dateIso)?.dayType ?? 'green'
  const phase = getPhaseForDate(dateIso)
  const dueReviews = dueToday(state, dateIso)
  const plan = buildDailyQuestionPlan(dayType, dueReviews, phase)
  const completedAttempts = state.attempts.filter((attempt) => attempt.date === dateIso && !attempt.abandoned)
  const readiness = state.readinessLogs.find((entry) => entry.date === dateIso) ?? null
  const mentalMathSessions = state.mentalMathSessions.filter((session) => session.date === dateIso)
  const daysToTarget = Math.max(0, Math.ceil((new Date(state.settings.targetDate).getTime() - new Date(dateIso).getTime()) / (24 * 3600 * 1000)))

  const recommendation = (() => {
    const orderedTopics = [...state.topics].sort((a, b) => a.orderIndex - b.orderIndex)
    const topicForPromotion = orderedTopics.find((topic) => {
      const attempts = state.attempts.filter((attempt) => attempt.topicId === topic.id)
      const promotion = evaluateTopicPromotion(attempts, topic.stage)
      return !promotion.shouldPromote && promotion.progress.sampleSize >= 4 && promotion.progress.recentQualifyingSuccesses >= 3
    })
    if (topicForPromotion) {
      return `${topicForPromotion.name} — ${topicForPromotion.stage}`
    }
    const firstUnfinished = orderedTopics.find((topic) => topic.stage !== 'mixed_practice')
    if (!firstUnfinished) {
      return 'Mixed Practice — choose an unseen problem'
    }
    return `${firstUnfinished.name} — ${firstUnfinished.stage}`
  })()

  return {
    dayType,
    phase,
    dueReviews,
    plan,
    completedAttempts,
    readiness,
    mentalMathSessions,
    recommendation,
    daysToTarget,
    protocolCompleted:
      state.dayLogs.find((entry) => entry.date === dateIso)?.protocolCompleted ??
      evaluateProtocolCompletion(state, dateIso, dayType),
  }
}

export const getCalendarDays = (state: AppState, monthIso: string) => {
  const first = new Date(`${monthIso}-01T00:00:00.000Z`)
  if (Number.isNaN(first.getTime())) {
    throw new Error('Invalid month ISO for calendar')
  }
  const month = first.getUTCMonth()
  const days: string[] = []
  let cursor = isoDay(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)))
  while (new Date(`${cursor}T00:00:00.000Z`).getUTCMonth() === month) {
    days.push(cursor)
    cursor = plusDaysIso(cursor, 1)
  }
  return days.map((date) => {
    const dayLog = state.dayLogs.find((entry) => entry.date === date) ?? null
    const attemptCount = state.attempts.filter((attempt) => attempt.date === date && !attempt.abandoned).length
    const reviewCount = state.attempts.filter(
      (attempt) => attempt.date === date && attempt.mode === 'review' && !attempt.abandoned,
    ).length
    const mentalMath = state.mentalMathSessions.find((session) => session.date === date) ?? null
    return {
      date,
      dayType: dayLog?.dayType ?? null,
      protocolCompleted: dayLog?.protocolCompleted ?? false,
      attemptCount,
      reviewCount,
      readiness: state.readinessLogs.find((entry) => entry.date === date) ?? null,
      mentalMath,
    }
  })
}

