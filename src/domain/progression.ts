import type { Attempt, Difficulty, TopicStage } from '../types'

const stageToDifficulty: Record<Exclude<TopicStage, 'mixed_practice'>, Difficulty> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
}

const nextStage: Record<TopicStage, TopicStage | null> = {
  easy: 'medium',
  medium: 'hard',
  hard: 'mixed_practice',
  mixed_practice: null,
}

export const isQualifyingSuccess = (
  attempt: Pick<Attempt, 'firstTryCorrect' | 'usedSolution' | 'timerExpired'>,
): boolean => {
  return attempt.firstTryCorrect && !attempt.usedSolution && !attempt.timerExpired
}

export interface PromotionProgress {
  sampleSize: number
  recentQualifyingSuccesses: number
  qualifyingDistinctDays: number
  requiredSampleSizeMet: boolean
  requiredSuccessRateMet: boolean
  requiredDistinctDaysMet: boolean
}

export interface PromotionDecision {
  shouldPromote: boolean
  nextStage: TopicStage | null
  progress: PromotionProgress
}

export const evaluateTopicPromotion = (
  topicAttempts: Attempt[],
  currentStage: TopicStage,
): PromotionDecision => {
  const target = nextStage[currentStage]
  if (!target || currentStage === 'mixed_practice') {
    return {
      shouldPromote: false,
      nextStage: null,
      progress: {
        sampleSize: topicAttempts.length,
        recentQualifyingSuccesses: 0,
        qualifyingDistinctDays: 0,
        requiredSampleSizeMet: false,
        requiredSuccessRateMet: false,
        requiredDistinctDaysMet: false,
      },
    }
  }

  const requiredDifficulty = stageToDifficulty[currentStage]
  const stageAttempts = topicAttempts.filter((attempt) => attempt.difficulty === requiredDifficulty)
  const recentFive = stageAttempts.slice(-5)
  const qualifying = recentFive.filter((attempt) => attempt.qualifyingSuccess)
  const qualifyingDistinctDays = new Set(qualifying.map((attempt) => attempt.date)).size

  const requiredSampleSizeMet = stageAttempts.length >= 5
  const requiredSuccessRateMet = qualifying.length >= 4
  const requiredDistinctDaysMet = qualifyingDistinctDays >= 2
  const shouldPromote = requiredSampleSizeMet && requiredSuccessRateMet && requiredDistinctDaysMet

  return {
    shouldPromote,
    nextStage: target,
    progress: {
      sampleSize: stageAttempts.length,
      recentQualifyingSuccesses: qualifying.length,
      qualifyingDistinctDays,
      requiredSampleSizeMet,
      requiredSuccessRateMet,
      requiredDistinctDaysMet,
    },
  }
}
