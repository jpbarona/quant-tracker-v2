export const DAY_TYPES = ['green', 'yellow', 'red', 'off'] as const
export type DayType = (typeof DAY_TYPES)[number]

export const READINESS_SCALE = [1, 2, 3, 4, 5] as const
export type ReadinessScore = (typeof READINESS_SCALE)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const TOPIC_STAGES = ['easy', 'medium', 'hard', 'mixed_practice'] as const
export type TopicStage = (typeof TOPIC_STAGES)[number]

export type Phase = 'foundations' | 'interview_prep' | 'target_day' | 'after_target'
export type ReviewStep = 0 | 1 | 2 | 3

export const DIVERGENCE_REASONS = [
  'no_divergence',
  'method_not_recognised',
  'incorrect_model_or_setup',
  'wrong_reasoning_path',
  'execution_algebra_arithmetic',
  'misread_condition',
  'time_management',
] as const
export type DivergenceReason = (typeof DIVERGENCE_REASONS)[number]

export interface Topic {
  id: string
  name: string
  orderIndex: number
  stage: TopicStage
  createdAt: string
}

export interface DailyReadiness {
  date: string
  mentalEnergy: ReadinessScore
  stress: ReadinessScore
  sleepQuality: ReadinessScore
}

export interface DayLog {
  date: string
  dayType: DayType
  protocolCompleted: boolean
}

export interface MentalMathSession {
  id: string
  date: string
  dayType: DayType
  scheduledSeconds: number
  elapsedSeconds: number
  completedFullDuration: boolean
  startedAt: string
  completedAt: string
}

export interface Attempt {
  id: string
  date: string
  sourceUrl: string
  parsedQuestionLabel: string
  mode: 'new' | 'review' | 'mixed'
  reviewSequenceId: string | null
  topicId: string | null
  topicLabelSnapshot: string
  difficulty: Difficulty
  dayType: DayType
  phase: Phase
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
  qualifyingSuccess: boolean
}

export interface ReviewSequence {
  id: string
  sourceUrl: string
  parsedQuestionLabel: string
  topicId: string | null
  topicLabelSnapshot: string
  originalDifficulty: Difficulty
  currentStep: ReviewStep
  dueDate: string
  status: 'active' | 'completed'
  historyAttemptIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TopicPromotionEvent {
  id: string
  topicId: string
  fromStage: TopicStage
  toStage: TopicStage
  triggeredByAttemptId: string
  createdAt: string
}

export interface Achievement {
  id: string
  date: string
  type:
    | 'streak_3'
    | 'streak_7'
    | 'streak_14'
    | 'topic_promotion'
    | 'review_sequence_completed'
    | 'mixed_practice_unlocked'
    | 'mental_math_5day'
  title: string
  context: string
}

export interface AppSettings {
  easySeconds: number
  mediumSeconds: number
  hardSeconds: number
  targetDate: string
}

export interface AppState {
  topics: Topic[]
  attempts: Attempt[]
  reviewSequences: ReviewSequence[]
  dayLogs: DayLog[]
  readinessLogs: DailyReadiness[]
  mentalMathSessions: MentalMathSession[]
  promotionEvents: TopicPromotionEvent[]
  achievements: Achievement[]
  settings: AppSettings
}

export interface PersistStatus {
  mode: 'local' | 'supabase'
  cloudAvailable: boolean
  cloudReason?: string
}
