import { z } from 'zod'

export const dayTypeSchema = z.enum(['green', 'yellow', 'red', 'off'])
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const topicStageSchema = z.enum(['easy', 'medium', 'hard', 'mixed_practice'])
export const divergenceSchema = z.enum([
  'no_divergence',
  'method_not_recognised',
  'incorrect_model_or_setup',
  'wrong_reasoning_path',
  'execution_algebra_arithmetic',
  'misread_condition',
  'time_management',
])
export const phaseSchema = z.enum(['foundations', 'interview_prep', 'target_day', 'after_target'])

export const topicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orderIndex: z.number().int().nonnegative(),
  stage: topicStageSchema,
  createdAt: z.string().datetime(),
})

export const attemptSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedAt: z.string().datetime(),
  mode: z.enum(['new', 'review', 'mixed']),
  reviewSequenceId: z.string().nullable(),
  topicId: z.string().nullable(),
  topicLabelSnapshot: z.string().min(1),
  difficulty: difficultySchema,
  sourceUrl: z.string().url(),
  parsedQuestionLabel: z.string().min(1),
  dayType: dayTypeSchema,
  phase: phaseSchema,
  startedAt: z.string().datetime(),
  scheduledSeconds: z.number().int().positive(),
  elapsedSeconds: z.number().int().nonnegative(),
  pausedSeconds: z.number().int().nonnegative(),
  timerExpired: z.boolean(),
  abandoned: z.boolean(),
  firstTryCorrect: z.boolean(),
  usedSolution: z.boolean(),
  divergence: divergenceSchema,
  cueMissed: z.string(),
  qualifyingSuccess: z.boolean(),
})

export const reviewSequenceSchema = z.object({
  id: z.string().min(1),
  sourceUrl: z.string().url(),
  parsedQuestionLabel: z.string().min(1),
  topicId: z.string().nullable(),
  topicLabelSnapshot: z.string().min(1),
  originalDifficulty: difficultySchema,
  currentStep: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'completed']),
  historyAttemptIds: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const dayLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayType: dayTypeSchema,
  protocolCompleted: z.boolean(),
})

export const readinessLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mentalEnergy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  stress: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  sleepQuality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
})

export const mentalMathSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayType: dayTypeSchema,
  scheduledSeconds: z.number().int().nonnegative(),
  elapsedSeconds: z.number().int().nonnegative(),
  completedFullDuration: z.boolean(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
})

export const promotionEventSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  fromStage: topicStageSchema,
  toStage: topicStageSchema,
  triggeredByAttemptId: z.string().min(1),
  createdAt: z.string().datetime(),
})

export const achievementSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum([
    'streak_3',
    'streak_7',
    'streak_14',
    'topic_promotion',
    'review_sequence_completed',
    'mixed_practice_unlocked',
    'mental_math_5day',
  ]),
  title: z.string().min(1),
  context: z.string().min(1),
})

export const settingsSchema = z.object({
  easySeconds: z.number().int().positive(),
  mediumSeconds: z.number().int().positive(),
  hardSeconds: z.number().int().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const appStateSchema = z.object({
  topics: z.array(topicSchema),
  attempts: z.array(attemptSchema),
  reviewSequences: z.array(reviewSequenceSchema),
  dayLogs: z.array(dayLogSchema),
  readinessLogs: z.array(readinessLogSchema),
  mentalMathSessions: z.array(mentalMathSchema),
  promotionEvents: z.array(promotionEventSchema),
  achievements: z.array(achievementSchema),
  settings: settingsSchema,
})
