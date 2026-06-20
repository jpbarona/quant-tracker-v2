import { useMemo } from 'react'
import { forwardToNextEligibleDate } from '../domain/reviews'
import { useAppStore, useTodayDate } from '../state/AppStore'

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

  return (
    <div className="page">
      <section className="card">
        <p className="muted">Next due review</p>
        {due[0] ? (
          <div>
            <h3>{due[0].sequence.parsedQuestionLabel}</h3>
            <p className="hint">
              {due[0].sequence.topicLabelSnapshot} · {due[0].sequence.originalDifficulty} · due {due[0].effectiveDueDate}
            </p>
          </div>
        ) : (
          <p>No review due today.</p>
        )}
      </section>

      <section className="card">
        <p className="muted">Due today</p>
        {due.length === 0 && <p>None</p>}
        {due.map((entry) => (
          <div key={entry.sequence.id} className="list-item">
            <strong>{entry.sequence.parsedQuestionLabel}</strong>
            <span>{entry.sequence.topicLabelSnapshot}</span>
            <span>Step {entry.sequence.currentStep + 1} of 4</span>
          </div>
        ))}
      </section>

      <section className="card">
        <p className="muted">Upcoming</p>
        {upcoming.length === 0 && <p>None</p>}
        {upcoming.slice(0, 20).map((entry) => (
          <div key={entry.sequence.id} className="list-item">
            <strong>{entry.sequence.parsedQuestionLabel}</strong>
            <span>{entry.sequence.topicLabelSnapshot}</span>
            <span>{entry.effectiveDueDate}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <p className="muted">Completed sequences</p>
        {completed.length === 0 && <p>None yet</p>}
        {completed.map((sequence) => (
          <div key={sequence.id} className="list-item">
            <strong>{sequence.parsedQuestionLabel}</strong>
            <span>{sequence.topicLabelSnapshot}</span>
            <span>Completed</span>
          </div>
        ))}
      </section>
    </div>
  )
}

