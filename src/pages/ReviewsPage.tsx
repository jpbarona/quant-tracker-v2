import { useMemo } from 'react'
import { forwardToNextEligibleDate } from '../domain/reviews'
import { useAppStore, useTodayDate } from '../state/AppStore'

const ReviewStepIndicator = ({ currentStep }: { currentStep: number }) => (
  <span className="review-step">
    <span className="review-step__dots" aria-hidden="true">
      {[0, 1, 2, 3].map((step) => (
        <span key={step} className={`review-step__dot ${step <= currentStep ? 'review-step__dot--filled' : ''}`} />
      ))}
    </span>
    Step {currentStep + 1} of 4
  </span>
)

export const ReviewsPage = () => {
  const { state } = useAppStore()
  const today = useTodayDate()
  if (!state) {
    throw new Error('State unavailable')
  }

  const due = useMemo(
    () =>
      state.reviewSequences
        .filter((sequence) => sequence.status === 'active')
        .map((sequence) => ({
          sequence,
          effectiveDueDate: forwardToNextEligibleDate(sequence.dueDate, state.dayLogs),
        }))
        .filter((entry) => entry.effectiveDueDate <= today)
        .sort((a, b) => a.effectiveDueDate.localeCompare(b.effectiveDueDate)),
    [state.dayLogs, state.reviewSequences, today],
  )

  const upcoming = useMemo(
    () =>
      state.reviewSequences
        .filter((sequence) => sequence.status === 'active')
        .map((sequence) => ({
          sequence,
          effectiveDueDate: forwardToNextEligibleDate(sequence.dueDate, state.dayLogs),
        }))
        .filter((entry) => entry.effectiveDueDate > today)
        .sort((a, b) => a.effectiveDueDate.localeCompare(b.effectiveDueDate)),
    [state.dayLogs, state.reviewSequences, today],
  )

  const completed = state.reviewSequences
    .filter((sequence) => sequence.status === 'completed')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10)

  const nextDue = due[0] ?? null

  return (
    <div className="page">
      <section className={`card card--hero ${nextDue ? 'card--urgent' : ''}`}>
        <p className="section-label">Next due review</p>
        {nextDue ? (
          <div>
            <span className="urgency-badge urgency-badge--due">Due now</span>
            <h3>{nextDue.sequence.parsedQuestionLabel}</h3>
            <p className="hint">
              {nextDue.sequence.topicLabelSnapshot} · {nextDue.sequence.originalDifficulty} · due{' '}
              {nextDue.effectiveDueDate}
            </p>
            <ReviewStepIndicator currentStep={nextDue.sequence.currentStep} />
          </div>
        ) : (
          <p className="empty-state">No review due today.</p>
        )}
      </section>

      <section className="card">
        <p className="section-label">Due today</p>
        {due.length === 0 && <p className="empty-state">None</p>}
        {due.map((entry) => (
          <div key={entry.sequence.id} className="list-item">
            <div className="row between gap">
              <strong>{entry.sequence.parsedQuestionLabel}</strong>
              <span className="urgency-badge urgency-badge--due">Due</span>
            </div>
            <span className="muted">{entry.sequence.topicLabelSnapshot}</span>
            <ReviewStepIndicator currentStep={entry.sequence.currentStep} />
          </div>
        ))}
      </section>

      <section className="card">
        <p className="section-label">Upcoming</p>
        {upcoming.length === 0 && <p className="empty-state">None</p>}
        {upcoming.slice(0, 20).map((entry) => (
          <div key={entry.sequence.id} className="list-item">
            <div className="row between gap">
              <strong>{entry.sequence.parsedQuestionLabel}</strong>
              <span className="urgency-badge urgency-badge--upcoming">{entry.effectiveDueDate}</span>
            </div>
            <span className="muted">{entry.sequence.topicLabelSnapshot}</span>
            <ReviewStepIndicator currentStep={entry.sequence.currentStep} />
          </div>
        ))}
      </section>

      <section className="card">
        <p className="section-label">Completed sequences</p>
        {completed.length === 0 && <p className="empty-state">None yet</p>}
        {completed.map((sequence) => (
          <div key={sequence.id} className="list-item">
            <strong>{sequence.parsedQuestionLabel}</strong>
            <span className="muted">{sequence.topicLabelSnapshot}</span>
            <span className="review-step">Completed</span>
          </div>
        ))}
      </section>
    </div>
  )
}
