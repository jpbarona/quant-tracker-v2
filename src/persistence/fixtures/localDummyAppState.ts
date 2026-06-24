import { DEFAULT_SETTINGS, DEFAULT_TOPICS } from '../../constants'
import { getPhaseForDate } from '../../domain/phases'
import { isoDay, plusDaysIso } from '../../lib/date'
import type {
  Achievement,
  AppState,
  Attempt,
  DailyReadiness,
  DayLog,
  MentalMathSession,
  ReviewSequence,
  Topic,
  TopicPromotionEvent,
  TopicStage,
} from '../../types'
import { appStateSchema } from '../schemas'

export const LOCAL_DUMMY_SEED_MARKER = 'qt-local-dummy-seed-v1'

const topicStages: TopicStage[] = [
  'easy',
  'easy',
  'medium',
  'medium',
  'hard',
  'hard',
  'mixed_practice',
  'mixed_practice',
]

const atUtc = (dateIso: string, hour: number, minute = 0): string =>
  `${dateIso}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`

const buildTopics = (createdAt: string): Topic[] =>
  DEFAULT_TOPICS.map((name, index) => ({
    id: `local-dummy-topic-${index}`,
    name,
    orderIndex: index,
    stage: topicStages[index] ?? 'easy',
    createdAt,
  }))

const buildAttempts = (todayIso: string, topics: Topic[]): Attempt[] => {
  const attemptSpecs: Array<{
    id: string
    dateOffset: number
    topicIndex: number
    difficulty: Attempt['difficulty']
    mode: Attempt['mode']
    reviewSequenceId: string | null
    label: string
    slug: string
    dayType: Attempt['dayType']
    firstTryCorrect: boolean
    qualifyingSuccess: boolean
    divergence: Attempt['divergence']
  }> = [
    {
      id: 'local-dummy-attempt-0',
      dateOffset: -4,
      topicIndex: 0,
      difficulty: 'easy',
      mode: 'new',
      reviewSequenceId: null,
      label: 'Balls in bins',
      slug: 'balls-in-bins',
      dayType: 'green',
      firstTryCorrect: true,
      qualifyingSuccess: true,
      divergence: 'no_divergence',
    },
    {
      id: 'local-dummy-attempt-1',
      dateOffset: -4,
      topicIndex: 1,
      difficulty: 'easy',
      mode: 'new',
      reviewSequenceId: null,
      label: 'Coin flips until HTH',
      slug: 'coin-flips-hth',
      dayType: 'green',
      firstTryCorrect: true,
      qualifyingSuccess: true,
      divergence: 'no_divergence',
    },
    {
      id: 'local-dummy-attempt-2',
      dateOffset: -3,
      topicIndex: 2,
      difficulty: 'medium',
      mode: 'new',
      reviewSequenceId: null,
      label: 'Bayes disease test',
      slug: 'bayes-disease-test',
      dayType: 'yellow',
      firstTryCorrect: false,
      qualifyingSuccess: false,
      divergence: 'incorrect_model_or_setup',
    },
    {
      id: 'local-dummy-attempt-3',
      dateOffset: -3,
      topicIndex: 3,
      difficulty: 'medium',
      mode: 'new',
      reviewSequenceId: null,
      label: 'Geometric distribution',
      slug: 'geometric-distribution',
      dayType: 'green',
      firstTryCorrect: true,
      qualifyingSuccess: true,
      divergence: 'no_divergence',
    },
    {
      id: 'local-dummy-attempt-4',
      dateOffset: -2,
      topicIndex: 4,
      difficulty: 'hard',
      mode: 'review',
      reviewSequenceId: 'local-dummy-review-1',
      label: 'Expected cards drawn',
      slug: 'expected-cards-drawn',
      dayType: 'green',
      firstTryCorrect: true,
      qualifyingSuccess: true,
      divergence: 'no_divergence',
    },
    {
      id: 'local-dummy-attempt-5',
      dateOffset: -1,
      topicIndex: 5,
      difficulty: 'hard',
      mode: 'new',
      reviewSequenceId: null,
      label: 'Variance of sum',
      slug: 'variance-of-sum',
      dayType: 'yellow',
      firstTryCorrect: false,
      qualifyingSuccess: false,
      divergence: 'execution_algebra_arithmetic',
    },
    {
      id: 'local-dummy-attempt-6',
      dateOffset: 0,
      topicIndex: 6,
      difficulty: 'medium',
      mode: 'mixed',
      reviewSequenceId: null,
      label: 'Random walk hitting time',
      slug: 'random-walk-hitting-time',
      dayType: 'green',
      firstTryCorrect: true,
      qualifyingSuccess: true,
      divergence: 'no_divergence',
    },
  ]

  return attemptSpecs.map((spec) => {
    const date = plusDaysIso(todayIso, spec.dateOffset)
    const topic = topics[spec.topicIndex]!
    const scheduledSeconds =
      spec.difficulty === 'easy'
        ? DEFAULT_SETTINGS.easySeconds
        : spec.difficulty === 'medium'
          ? DEFAULT_SETTINGS.mediumSeconds
          : DEFAULT_SETTINGS.hardSeconds

    return {
      id: spec.id,
      date,
      sourceUrl: `https://quantquestions.io/problems/${spec.slug}`,
      parsedQuestionLabel: spec.label,
      mode: spec.mode,
      reviewSequenceId: spec.reviewSequenceId,
      topicId: topic.id,
      topicLabelSnapshot: topic.name,
      difficulty: spec.difficulty,
      dayType: spec.dayType,
      phase: getPhaseForDate(date),
      startedAt: atUtc(date, 9, 30),
      completedAt: atUtc(date, 9, 45),
      scheduledSeconds,
      elapsedSeconds: scheduledSeconds - 60,
      pausedSeconds: 0,
      timerExpired: false,
      abandoned: false,
      firstTryCorrect: spec.firstTryCorrect,
      usedSolution: !spec.firstTryCorrect,
      divergence: spec.divergence,
      cueMissed: spec.firstTryCorrect ? '' : 'Set up indicator variables first',
      qualifyingSuccess: spec.qualifyingSuccess,
    }
  })
}

const buildReviewSequences = (todayIso: string, topics: Topic[]): ReviewSequence[] => {
  const createdAt = atUtc(plusDaysIso(todayIso, -8), 8, 0)

  return [
    {
      id: 'local-dummy-review-0',
      sourceUrl: 'https://quantquestions.io/problems/poker-full-house',
      parsedQuestionLabel: 'Poker full house probability',
      topicId: topics[0]!.id,
      topicLabelSnapshot: topics[0]!.name,
      originalDifficulty: 'easy',
      currentStep: 1,
      dueDate: todayIso,
      status: 'active',
      historyAttemptIds: ['local-dummy-attempt-0'],
      createdAt,
      updatedAt: atUtc(plusDaysIso(todayIso, -1), 10, 0),
    },
    {
      id: 'local-dummy-review-1',
      sourceUrl: 'https://quantquestions.io/problems/expected-cards-drawn',
      parsedQuestionLabel: 'Expected cards drawn',
      topicId: topics[4]!.id,
      topicLabelSnapshot: topics[4]!.name,
      originalDifficulty: 'hard',
      currentStep: 2,
      dueDate: plusDaysIso(todayIso, -3),
      status: 'active',
      historyAttemptIds: ['local-dummy-attempt-4'],
      createdAt,
      updatedAt: atUtc(plusDaysIso(todayIso, -2), 11, 0),
    },
    {
      id: 'local-dummy-review-2',
      sourceUrl: 'https://quantquestions.io/problems/markov-chain-steady-state',
      parsedQuestionLabel: 'Markov chain steady state',
      topicId: topics[6]!.id,
      topicLabelSnapshot: topics[6]!.name,
      originalDifficulty: 'medium',
      currentStep: 0,
      dueDate: plusDaysIso(todayIso, 2),
      status: 'active',
      historyAttemptIds: [],
      createdAt,
      updatedAt: atUtc(plusDaysIso(todayIso, -1), 14, 0),
    },
  ]
}

const buildDayLogs = (todayIso: string): DayLog[] => [
  { date: plusDaysIso(todayIso, -2), dayType: 'green', protocolCompleted: true },
  { date: plusDaysIso(todayIso, -1), dayType: 'yellow', protocolCompleted: true },
  { date: todayIso, dayType: 'green', protocolCompleted: false },
]

const buildReadinessLogs = (todayIso: string): DailyReadiness[] => [
  {
    date: plusDaysIso(todayIso, -1),
    mentalEnergy: 4,
    stress: 2,
    sleepQuality: 4,
  },
  {
    date: todayIso,
    mentalEnergy: 3,
    stress: 3,
    sleepQuality: 3,
  },
]

const buildMentalMathSessions = (todayIso: string): MentalMathSession[] => [
  {
    id: 'local-dummy-mental-math-0',
    date: plusDaysIso(todayIso, -1),
    dayType: 'yellow',
    scheduledSeconds: 600,
    elapsedSeconds: 600,
    completedFullDuration: true,
    startedAt: atUtc(plusDaysIso(todayIso, -1), 8, 0),
    completedAt: atUtc(plusDaysIso(todayIso, -1), 8, 10),
  },
  {
    id: 'local-dummy-mental-math-1',
    date: todayIso,
    dayType: 'green',
    scheduledSeconds: 600,
    elapsedSeconds: 420,
    completedFullDuration: false,
    startedAt: atUtc(todayIso, 8, 0),
    completedAt: atUtc(todayIso, 8, 7),
  },
]

const buildPromotionEvents = (todayIso: string, topics: Topic[]): TopicPromotionEvent[] => [
  {
    id: 'local-dummy-promotion-0',
    topicId: topics[1]!.id,
    fromStage: 'easy',
    toStage: 'medium',
    triggeredByAttemptId: 'local-dummy-attempt-1',
    createdAt: atUtc(plusDaysIso(todayIso, -4), 9, 46),
  },
]

const buildAchievements = (todayIso: string, topics: Topic[]): Achievement[] => [
  {
    id: 'local-dummy-achievement-0',
    date: plusDaysIso(todayIso, -2),
    type: 'streak_3',
    title: '3-day adherence streak',
    context: LOCAL_DUMMY_SEED_MARKER,
  },
  {
    id: 'local-dummy-achievement-1',
    date: plusDaysIso(todayIso, -4),
    type: 'topic_promotion',
    title: `${topics[1]!.name} promoted to medium`,
    context: topics[1]!.name,
  },
]

export const createLocalDummyAppState = (todayIso?: string): AppState => {
  const today = todayIso ?? isoDay(new Date())
  const createdAt = atUtc(plusDaysIso(today, -10), 12, 0)
  const topics = buildTopics(createdAt)
  const attempts = buildAttempts(today, topics)

  const state: AppState = {
    topics,
    attempts,
    reviewSequences: buildReviewSequences(today, topics),
    dayLogs: buildDayLogs(today),
    readinessLogs: buildReadinessLogs(today),
    mentalMathSessions: buildMentalMathSessions(today),
    promotionEvents: buildPromotionEvents(today, topics),
    achievements: buildAchievements(today, topics),
    settings: DEFAULT_SETTINGS,
  }

  return appStateSchema.parse(state)
}
