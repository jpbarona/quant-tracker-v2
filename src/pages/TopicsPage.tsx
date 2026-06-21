import { evaluateTopicPromotion } from '../domain/progression'
import { useAppStore } from '../state/AppStore'

const stageClass = (stage: string): string => {
  if (stage === 'easy' || stage === 'medium' || stage === 'hard' || stage === 'mixed_practice') {
    return `stage stage--${stage}`
  }
  return 'stage'
}

export const TopicsPage = () => {
  const { state } = useAppStore()
  if (!state) {
    throw new Error('State unavailable')
  }

  const topics = [...state.topics].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="page">
      {topics.map((topic) => {
        const attempts = state.attempts.filter((attempt) => attempt.topicId === topic.id)
        const promotion = evaluateTopicPromotion(attempts, topic.stage)
        const easyCount = attempts.filter((attempt) => attempt.difficulty === 'easy').length
        const mediumCount = attempts.filter((attempt) => attempt.difficulty === 'medium').length
        const hardCount = attempts.filter((attempt) => attempt.difficulty === 'hard').length
        const hasReview = state.reviewSequences.some(
          (sequence) => sequence.status === 'active' && sequence.topicId === topic.id,
        )

        const successPct = Math.round((promotion.progress.recentQualifyingSuccesses / 4) * 100)
        const daysPct = Math.round((promotion.progress.qualifyingDistinctDays / 2) * 100)
        const promotionPct = Math.min(100, Math.round((successPct + daysPct) / 2))

        return (
          <section key={topic.id} className="card">
            <div className="row between">
              <h3>{topic.name}</h3>
              <span className={stageClass(topic.stage)}>{topic.stage.replace('_', ' ')}</span>
            </div>
            <p className="hint">Order position: {topic.orderIndex + 1}</p>

            <p className="section-label">Promotion progress</p>
            <p className="hint">
              {promotion.progress.recentQualifyingSuccesses}/4 qualifying in recent 5,{' '}
              {promotion.progress.qualifyingDistinctDays}/2 days
            </p>
            <div className="progress-bar" role="progressbar" aria-valuenow={promotionPct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`progress-fill ${promotionPct >= 100 ? 'progress-fill--success' : promotionPct >= 50 ? 'progress-fill--partial' : ''}`}
                style={{ width: `${promotionPct}%` }}
              />
            </div>

            <div className="attempt-pills">
              <span className="attempt-pill attempt-pill--easy">E {easyCount}</span>
              <span className="attempt-pill attempt-pill--medium">M {mediumCount}</span>
              <span className="attempt-pill attempt-pill--hard">H {hardCount}</span>
            </div>

            <p className="hint">Review scheduled: {hasReview ? 'Yes' : 'No'}</p>
          </section>
        )
      })}
    </div>
  )
}
