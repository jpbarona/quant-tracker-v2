import { evaluateTopicPromotion } from '../domain/progression'
import { useAppStore } from '../state/AppStore'

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

        return (
          <section key={topic.id} className="card">
            <div className="row between">
              <h3>{topic.name}</h3>
              <span className="stage">{topic.stage.replace('_', ' ')}</span>
            </div>
            <p className="hint">Order position: {topic.orderIndex + 1}</p>
            <p className="hint">
              Promotion progress: {promotion.progress.recentQualifyingSuccesses}/4 qualifying in recent 5,
              {` `}
              {promotion.progress.qualifyingDistinctDays}/2 days
            </p>
            <p className="hint">Attempts — Easy {easyCount}, Medium {mediumCount}, Hard {hardCount}</p>
            <p className="hint">Review scheduled: {hasReview ? 'Yes' : 'No'}</p>
          </section>
        )
      })}
    </div>
  )
}

