import { useEffect, useMemo, useState } from 'react'
import { DAY_PROTOCOLS, TARGET_DATE } from '../constants'
import { getAttemptStartError, isDifficulty, validateAttemptStart } from '../domain/attemptStart'
import { getMentalMathSecondsForDayType } from '../domain/dailyPlan'
import { validateMentalMathLog, type MentalMathLogInput } from '../domain/mentalMathSession'
import { groupPendingReviews } from '../domain/pendingReviews'
import { safeTitleCaseLabel } from '../lib/labels'
import {
  computeActiveElapsedSeconds,
  computePauseIncrementSeconds,
  computeRemainingSeconds,
  formatClock,
} from '../lib/timers'
import {
  getTodaySummary,
  useAppStore,
  useTodayDate,
} from '../state/AppStore'
import type { Difficulty, DivergenceReason, ReadinessScore } from '../types'

const scoreValues: ReadinessScore[] = [1, 2, 3, 4, 5]
const divergenceOptions: Array<{ key: DivergenceReason; label: string }> = [
  { key: 'no_divergence', label: 'No divergence — solved correctly' },
  { key: 'method_not_recognised', label: 'Did not recognise the method' },
  { key: 'incorrect_model_or_setup', label: 'Incorrect model or setup' },
  { key: 'wrong_reasoning_path', label: 'Correct setup, wrong reasoning path' },
  { key: 'execution_algebra_arithmetic', label: 'Execution, algebra, or arithmetic' },
  { key: 'misread_condition', label: 'Misread or missed a condition' },
  { key: 'time_management', label: 'Time management' },
]

const nowMs = (): number => new Date().getTime()

interface MentalTimer {
  startedAtMs: number
  startedAtIso: string
  pausedSeconds: number
  pauseStartedAtMs: number | null
}

interface RunningTimer {
  startedAtMs: number
  startedAtIso: string
  scheduledSeconds: number
  elapsedSeconds: number
  pausedSeconds: number
  pauseStartedAtMs: number | null
  mode: 'new' | 'review' | 'mixed'
  sourceUrl: string
  topicId: string | null
  difficulty: Difficulty
  reviewSequenceId: string | null
}

interface PendingPostmortem {
  timer: RunningTimer
  completedAtIso: string
  elapsedSeconds: number
  pausedSeconds: number
  timerExpired: boolean
  abandoned: boolean
}

export const TodayPage = () => {
  const today = useTodayDate()
  const { state, setDayType, setReadiness, logMentalMath, saveAttempt } = useAppStore()
  if (!state) {
    throw new Error('State unavailable')
  }

  const summary = getTodaySummary(state, today)

  const [mentalTimer, setMentalTimer] = useState<MentalTimer | null>(null)
  const [attemptTimer, setAttemptTimer] = useState<RunningTimer | null>(null)
  const [postmortem, setPostmortem] = useState<PendingPostmortem | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [topicId, setTopicId] = useState<string | null>(state.topics[0]?.id ?? null)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [attemptMode, setAttemptMode] = useState<'new' | 'review' | 'mixed'>('new')
  const [nowEpochMs, setNowEpochMs] = useState(() => nowMs())
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false)
  const [firstTryCorrect, setFirstTryCorrect] = useState(true)
  const [usedSolution, setUsedSolution] = useState(false)
  const [divergence, setDivergence] = useState<DivergenceReason>('no_divergence')
  const [cueMissed, setCueMissed] = useState('')

  const [energy, setEnergy] = useState<ReadinessScore>(summary.readiness?.mentalEnergy ?? 3)
  const [stress, setStress] = useState<ReadinessScore>(summary.readiness?.stress ?? 3)
  const [sleepQuality, setSleepQuality] = useState<ReadinessScore>(summary.readiness?.sleepQuality ?? 3)
  const [readinessSaveState, setReadinessSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [readinessFeedback, setReadinessFeedback] = useState<string | null>(null)
  const [attemptError, setAttemptError] = useState<string | null>(null)
  const [mentalMathError, setMentalMathError] = useState<string | null>(null)
  const [postmortemError, setPostmortemError] = useState<string | null>(null)

  const dayType = summary.dayType
  const dayProtocol = DAY_PROTOCOLS[dayType]

  const dueReview = summary.plan.reviews[0] ?? null
  const topicIds = useMemo(() => state.topics.map((topic) => topic.id), [state.topics])

  const pendingReviews = useMemo(() => {
    try {
      return {
        ok: true as const,
        grouped: groupPendingReviews(state.reviewSequences, state.dayLogs, today),
      }
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : 'Could not load pending reviews.',
      }
    }
  }, [state.dayLogs, state.reviewSequences, today])

  const overdueReviews = pendingReviews.ok ? pendingReviews.grouped.overdue : []
  const dueTodayReviews = pendingReviews.ok ? pendingReviews.grouped.dueToday : []
  const reviewsWarning = (() => {
    if (!pendingReviews.ok) {
      return pendingReviews.message
    }
    if (pendingReviews.grouped.skipped.length === 0) {
      return null
    }
    return `${pendingReviews.grouped.skipped.length} review(s) could not be loaded. Open the Reviews tab or check your data.`
  })()

  const duplicateExists = useMemo(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      return false
    }
    return state.attempts.some((attempt) => attempt.sourceUrl.trim() === trimmed)
  }, [state.attempts, urlInput])

  const expectedTimerSeconds = (() => {
    if (difficulty === 'easy') {
      return state.settings.easySeconds
    }
    if (difficulty === 'medium') {
      return state.settings.mediumSeconds
    }
    return state.settings.hardSeconds
  })()

  const recordMentalMath = (input: MentalMathLogInput) => {
    try {
      validateMentalMathLog(input)
      logMentalMath(input)
      setMentalMathError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save mental maths session.'
      setMentalMathError(message)
    }
  }

  const mentalScheduledSeconds = getMentalMathSecondsForDayType(dayType)
  const mentalRemaining = (() => {
    if (!mentalTimer) {
      return mentalScheduledSeconds
    }
    try {
      return computeRemainingSeconds(mentalScheduledSeconds, mentalTimer, nowEpochMs)
    } catch {
      return 0
    }
  })()

  const attemptRemaining = (() => {
    if (!attemptTimer) {
      return 0
    }
    try {
      return computeRemainingSeconds(attemptTimer.scheduledSeconds, attemptTimer, nowEpochMs)
    } catch {
      return 0
    }
  })()

  useEffect(() => {
    if (!mentalTimer && !attemptTimer) {
      return
    }
    const handle = window.setInterval(() => {
      setNowEpochMs(nowMs())
    }, 250)
    return () => window.clearInterval(handle)
  }, [attemptTimer, mentalTimer])

  useEffect(() => {
    if (!mentalTimer || mentalTimer.pauseStartedAtMs) {
      return
    }
    try {
      const elapsed = computeActiveElapsedSeconds(mentalTimer, nowEpochMs)
      if (elapsed >= mentalScheduledSeconds) {
        const completedAt = new Date().toISOString()
        recordMentalMath({
          date: today,
          dayType,
          scheduledSeconds: mentalScheduledSeconds,
          elapsedSeconds: mentalScheduledSeconds,
          completedFullDuration: true,
          startedAt: mentalTimer.startedAtIso,
          completedAt,
        })
        setMentalTimer(null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mental maths timer is in an invalid state.'
      setMentalMathError(message)
      setMentalTimer(null)
    }
  }, [dayType, logMentalMath, mentalTimer, mentalScheduledSeconds, nowEpochMs, today])

  useEffect(() => {
    if (!attemptTimer || attemptTimer.pauseStartedAtMs) {
      return
    }
    try {
      const elapsed = computeActiveElapsedSeconds(attemptTimer, nowEpochMs)
      if (elapsed >= attemptTimer.scheduledSeconds) {
        setPostmortem({
          timer: attemptTimer,
          completedAtIso: new Date().toISOString(),
          elapsedSeconds: attemptTimer.scheduledSeconds,
          pausedSeconds: attemptTimer.pausedSeconds,
          timerExpired: true,
          abandoned: false,
        })
        setAttemptTimer(null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attempt timer is in an invalid state.'
      setAttemptError(message)
      setAttemptTimer(null)
    }
  }, [attemptTimer, nowEpochMs])

  useEffect(() => {
    setReadinessSaveState('idle')
    setReadinessFeedback(null)
  }, [energy, stress, sleepQuality])

  useEffect(() => {
    setAttemptError(null)
  }, [urlInput, attemptMode, duplicateAcknowledged, topicId, difficulty])

  useEffect(() => {
    setPostmortemError(null)
  }, [firstTryCorrect, usedSolution, divergence, cueMissed, topicId])

  const handleSaveReadiness = () => {
    setReadinessSaveState('saving')
    setReadinessFeedback('Saving readiness...')
    try {
      setReadiness(today, { mentalEnergy: energy, stress, sleepQuality })
      setReadinessSaveState('success')
      setReadinessFeedback('Readiness saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while saving readiness.'
      setReadinessSaveState('error')
      setReadinessFeedback(`Could not save readiness: ${message}`)
    }
  }

  const beginMentalMath = () => {
    if (mentalScheduledSeconds === 0 || mentalTimer) {
      return
    }
    const now = nowMs()
    setMentalMathError(null)
    setMentalTimer({
      startedAtMs: now,
      startedAtIso: new Date(now).toISOString(),
      pausedSeconds: 0,
      pauseStartedAtMs: null,
    })
  }

  const pauseMentalMath = () => {
    if (!mentalTimer) {
      return
    }
    try {
      if (mentalTimer.pauseStartedAtMs) {
        const pausedFor = computePauseIncrementSeconds(mentalTimer.pauseStartedAtMs, nowMs())
        setMentalTimer({
          ...mentalTimer,
          pauseStartedAtMs: null,
          pausedSeconds: mentalTimer.pausedSeconds + pausedFor,
        })
        return
      }
      setMentalTimer({ ...mentalTimer, pauseStartedAtMs: nowMs() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update mental maths timer.'
      setMentalMathError(message)
    }
  }

  const completeMentalMathEarly = () => {
    if (!mentalTimer) {
      return
    }
    try {
      const now = nowMs()
      const pausedNow = mentalTimer.pauseStartedAtMs
        ? computePauseIncrementSeconds(mentalTimer.pauseStartedAtMs, now)
        : 0
      const pausedSeconds = mentalTimer.pausedSeconds + pausedNow
      const elapsed = computeActiveElapsedSeconds(
        {
          startedAtMs: mentalTimer.startedAtMs,
          pausedSeconds,
          pauseStartedAtMs: null,
        },
        now,
      )
      recordMentalMath({
        date: today,
        dayType,
        scheduledSeconds: mentalScheduledSeconds,
        elapsedSeconds: elapsed,
        completedFullDuration: elapsed >= mentalScheduledSeconds,
        startedAt: mentalTimer.startedAtIso,
        completedAt: new Date().toISOString(),
      })
      setMentalTimer(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete mental maths session.'
      setMentalMathError(message)
    }
  }

  const trimmedUrl = urlInput.trim()
  const needsTopic = attemptMode !== 'mixed'
  const attemptStartInput = {
    sourceUrl: trimmedUrl,
    mode: attemptMode,
    topicId: needsTopic ? topicId : null,
    scheduledSeconds: expectedTimerSeconds,
    dueReviewId: attemptMode === 'review' ? dueReview?.id ?? null : null,
    duplicateExists,
    duplicateAcknowledged,
    topicIds,
    attemptAlreadyRunning: Boolean(attemptTimer),
  }
  const attemptBlockedReason = getAttemptStartError(attemptStartInput)

  const beginAttempt = () => {
    try {
      validateAttemptStart(attemptStartInput)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot start timed attempt.'
      setAttemptError(message)
      return
    }
    setAttemptError(null)
    const now = nowMs()
    setAttemptTimer({
      startedAtMs: now,
      startedAtIso: new Date(now).toISOString(),
      scheduledSeconds: expectedTimerSeconds,
      elapsedSeconds: 0,
      pausedSeconds: 0,
      pauseStartedAtMs: null,
      mode: attemptMode,
      sourceUrl: trimmedUrl,
      topicId: attemptMode === 'mixed' ? null : topicId,
      difficulty,
      reviewSequenceId: attemptMode === 'review' ? dueReview?.id ?? null : null,
    })
  }

  const pauseAttempt = () => {
    if (!attemptTimer) {
      return
    }
    try {
      if (attemptTimer.pauseStartedAtMs) {
        const pausedFor = computePauseIncrementSeconds(attemptTimer.pauseStartedAtMs, nowMs())
        setAttemptTimer({
          ...attemptTimer,
          pauseStartedAtMs: null,
          pausedSeconds: attemptTimer.pausedSeconds + pausedFor,
        })
        return
      }
      setAttemptTimer({ ...attemptTimer, pauseStartedAtMs: nowMs() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update attempt timer.'
      setAttemptError(message)
    }
  }

  const finishAttempt = (abandoned: boolean) => {
    if (!attemptTimer) {
      return
    }
    try {
      const now = nowMs()
      const pausedNow = attemptTimer.pauseStartedAtMs
        ? computePauseIncrementSeconds(attemptTimer.pauseStartedAtMs, now)
        : 0
      const pausedSeconds = attemptTimer.pausedSeconds + pausedNow
      const elapsedSeconds = computeActiveElapsedSeconds(
        {
          startedAtMs: attemptTimer.startedAtMs,
          pausedSeconds,
          pauseStartedAtMs: null,
        },
        now,
      )
      const expired = elapsedSeconds >= attemptTimer.scheduledSeconds
      setPostmortem({
        timer: attemptTimer,
        completedAtIso: new Date(now).toISOString(),
        elapsedSeconds: Math.min(elapsedSeconds, attemptTimer.scheduledSeconds),
        pausedSeconds,
        timerExpired: expired,
        abandoned,
      })
      setAttemptTimer(null)
      setAttemptError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not finish attempt.'
      setAttemptError(message)
    }
  }

  const submitPostmortem = () => {
    if (!postmortem) {
      return
    }
    const actualTopicId =
      postmortem.timer.mode === 'mixed' && !topicId ? null : postmortem.timer.topicId
    try {
      saveAttempt({
      date: today,
      sourceUrl: postmortem.timer.sourceUrl,
      mode: postmortem.timer.mode,
      reviewSequenceId: postmortem.timer.reviewSequenceId,
      topicId: actualTopicId,
      difficulty: postmortem.timer.difficulty,
      dayType,
      phase: summary.phase,
      startedAt: postmortem.timer.startedAtIso,
      completedAt: postmortem.completedAtIso,
      scheduledSeconds: postmortem.timer.scheduledSeconds,
      elapsedSeconds: postmortem.elapsedSeconds,
      pausedSeconds: postmortem.pausedSeconds,
      timerExpired: postmortem.timerExpired,
      abandoned: postmortem.abandoned,
      firstTryCorrect,
      usedSolution,
      divergence,
      cueMissed: cueMissed.trim(),
      })
      setPostmortem(null)
      setPostmortemError(null)
      setUrlInput('')
      setDuplicateAcknowledged(false)
      setFirstTryCorrect(true)
      setUsedSolution(false)
      setDivergence('no_divergence')
      setCueMissed('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save attempt.'
      setPostmortemError(message)
    }
  }

  return (
    <div className="page">
      <section className="card">
        <div className="stat-row">
          <div className="stat-block">
            <p className="section-label">Phase</p>
            <h2>{safeTitleCaseLabel(summary.phase)}</h2>
          </div>
          <div className="stat-block right">
            <p className="section-label">Days to target</p>
            <span className="stat-value">{summary.daysToTarget}</span>
            <small className="muted">{TARGET_DATE}</small>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="section-label">Select day type</p>
        <div className="chip-row">
          {(['green', 'yellow', 'red', 'off'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`chip chip--${type} ${dayType === type ? 'active' : ''}`}
              onClick={() => setDayType(today, type)}
            >
              {safeTitleCaseLabel(type)}
            </button>
          ))}
        </div>
        <p className="hint">
          Mental maths: {dayProtocol.mentalMathSeconds / 60}m. Questions today: {summary.plan.totalTasks}.
          Completed: {summary.completedAttempts.length}/{summary.plan.totalTasks}
        </p>
        <div className={`protocol-indicator ${summary.protocolCompleted ? 'protocol-indicator--done' : ''}`}>
          <span className="protocol-indicator__dot" />
          Protocol {summary.protocolCompleted ? 'complete' : 'in progress'}
        </div>
      </section>

      <section className="card">
        <p className="section-label">Daily readiness</p>
        <div className="metric">
          <span>Mental energy</span>
          <div className="chip-row">
            {scoreValues.map((value) => (
              <button key={`energy-${value}`} type="button" className={`score ${energy === value ? 'active' : ''}`} onClick={() => setEnergy(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="metric">
          <span>Stress</span>
          <div className="chip-row">
            {scoreValues.map((value) => (
              <button key={`stress-${value}`} type="button" className={`score ${stress === value ? 'active' : ''}`} onClick={() => setStress(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="metric">
          <span>Sleep quality</span>
          <div className="chip-row">
            {scoreValues.map((value) => (
              <button key={`sleep-${value}`} type="button" className={`score ${sleepQuality === value ? 'active' : ''}`} onClick={() => setSleepQuality(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="primary btn-block"
          onClick={handleSaveReadiness}
          disabled={readinessSaveState === 'saving'}
          aria-busy={readinessSaveState === 'saving'}
        >
          {readinessSaveState === 'saving'
            ? 'Saving readiness...'
            : readinessSaveState === 'success'
              ? 'Saved'
              : 'Save readiness'}
        </button>
        {readinessFeedback && (
          <p className={`status-message ${readinessSaveState === 'error' ? 'error' : readinessSaveState === 'success' ? 'success' : ''}`}>
            {readinessFeedback}
          </p>
        )}
      </section>

      {dayType !== 'off' && (
        <section className="card">
          <p className="section-label">Mental maths</p>
          <div className="timer">{formatClock(mentalRemaining)}</div>
          <div className="action-row">
            <button type="button" className="primary" onClick={beginMentalMath} disabled={Boolean(mentalTimer)}>
              Start
            </button>
            <button type="button" className="secondary" onClick={pauseMentalMath} disabled={!mentalTimer}>
              {mentalTimer?.pauseStartedAtMs ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="secondary" onClick={completeMentalMathEarly} disabled={!mentalTimer}>
              Mark complete
            </button>
          </div>
          {mentalMathError && (
            <p className="status-message error" role="alert">
              {mentalMathError}
            </p>
          )}
        </section>
      )}

      {dayType !== 'off' && (
        <section className="card">
          <p className="section-label">Pending reviews</p>

          <div className="card-stack">
            <p className="section-label">Overdue</p>
            {overdueReviews.length === 0 ? (
              <p className="empty-state">You&apos;re caught up — no overdue reviews.</p>
            ) : (
              overdueReviews.map((entry) => (
                <div key={entry.sequence.id} className="list-item">
                  <a href={entry.sequence.sourceUrl} target="_blank" rel="noreferrer" className="link-btn">
                    {entry.sequence.parsedQuestionLabel}
                  </a>
                  <span className="muted">
                    {entry.sequence.topicLabelSnapshot} · {entry.sequence.originalDifficulty} · due {entry.effectiveDueDate}
                  </span>
                </div>
              ))
            )}

            <p className="section-label">Due today</p>
            {dueTodayReviews.length === 0 ? (
              <p className="empty-state">None due today.</p>
            ) : (
              dueTodayReviews.map((entry) => (
                <div key={entry.sequence.id} className="list-item">
                  <a href={entry.sequence.sourceUrl} target="_blank" rel="noreferrer" className="link-btn">
                    {entry.sequence.parsedQuestionLabel}
                  </a>
                  <span className="muted">
                    {entry.sequence.topicLabelSnapshot} · {entry.sequence.originalDifficulty}
                  </span>
                </div>
              ))
            )}
          </div>
          {reviewsWarning && (
            <p className="status-message error" role="alert">
              {reviewsWarning}
            </p>
          )}
        </section>
      )}

      {(dayType === 'green' || dayType === 'yellow') && (
        <section className="card">
          <div className="card-stack">
            <div className="card-stack__header">
              <p className="section-label">Recommended next question</p>
              <h3>{summary.recommendation}</h3>
            </div>
            <a href="https://quantquestions.io/problems" target="_blank" rel="noreferrer" className="link-btn link-btn--block">
              Open QuantQuestions
            </a>

            <div className="chip-row">
              <button type="button" className={`chip ${attemptMode === 'new' ? 'active' : ''}`} onClick={() => setAttemptMode('new')}>
                New
              </button>
              <button
                type="button"
                className={`chip ${attemptMode === 'review' ? 'active' : ''}`}
                onClick={() => setAttemptMode('review')}
                disabled={summary.plan.reviews.length === 0}
              >
                Review
              </button>
              <button type="button" className={`chip ${attemptMode === 'mixed' ? 'active' : ''}`} onClick={() => setAttemptMode('mixed')}>
                Mixed
              </button>
            </div>

            {attemptMode === 'review' && dueReview && (
              <div className="notice">
                <strong>Due review:</strong> {dueReview.parsedQuestionLabel} ({dueReview.originalDifficulty})
              </div>
            )}

            <label className="input-label">
              QuantQuestions URL
              <input value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://quantquestions.io/problems/..." />
            </label>
            {duplicateExists && (
              <label className="checkbox">
                <input type="checkbox" checked={duplicateAcknowledged} onChange={(event) => setDuplicateAcknowledged(event.target.checked)} />
                I want to re-attempt this existing URL intentionally
              </label>
            )}

            {attemptMode !== 'mixed' && (
              <label className="input-label">
                Topic
                <select value={topicId ?? ''} onChange={(event) => setTopicId(event.target.value || null)}>
                  {state.topics
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <label className="input-label">
              Difficulty
              <select
                value={difficulty}
                onChange={(event) => {
                  const next = event.target.value
                  if (!isDifficulty(next)) {
                    setAttemptError('Invalid difficulty selected.')
                    return
                  }
                  setDifficulty(next)
                }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <p className="hint">Timer: {Math.floor(expectedTimerSeconds / 60)} minutes</p>
            {attemptBlockedReason && !attemptError && (
              <p id="attempt-hint" className="hint">{attemptBlockedReason}</p>
            )}
            <button
              type="button"
              className="primary btn-block"
              onClick={beginAttempt}
              disabled={Boolean(attemptTimer)}
              aria-describedby={attemptError ? 'attempt-error' : attemptBlockedReason ? 'attempt-hint' : undefined}
            >
              Start timed attempt
            </button>
            {attemptError && (
              <p id="attempt-error" className="status-message error" role="alert">
                {attemptError}
              </p>
            )}
          </div>
        </section>
      )}

      {attemptTimer && (
        <section className="card emphasis">
          <p className="section-label">Attempt timer</p>
          <div className="timer">{formatClock(attemptRemaining)}</div>
          <div className="action-row">
            <button type="button" className="secondary" onClick={pauseAttempt}>
              {attemptTimer.pauseStartedAtMs ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="primary" onClick={() => finishAttempt(false)}>
              Finish attempt
            </button>
            <button type="button" className="danger" onClick={() => finishAttempt(true)}>
              Abandon attempt
            </button>
          </div>
        </section>
      )}

      {postmortem && (
        <section className="card">
          {postmortem.timerExpired && (
            <div className="notice warning">
              Time is up. Stop solving now, review the solution on QuantQuestions, then complete this 1-minute postmortem.
            </div>
          )}
          <p className="section-label">Post-attempt (short)</p>
          <label className="input-label">
            Correct on first try?
            <select value={String(firstTryCorrect)} onChange={(event) => setFirstTryCorrect(event.target.value === 'true')}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="input-label">
            Used the solution?
            <select value={String(usedSolution)} onChange={(event) => setUsedSolution(event.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          {postmortem.timer.mode === 'mixed' && (
            <label className="input-label">
              Actual topic after attempt
              <select value={topicId ?? ''} onChange={(event) => setTopicId(event.target.value || null)}>
                <option value="">Other</option>
                {state.topics
                  .filter((topic) => topic.stage === 'mixed_practice')
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="input-label">
            Where did the solution first diverge?
            <select value={divergence} onChange={(event) => setDivergence(event.target.value as DivergenceReason)}>
              {divergenceOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="input-label">
            Cue I missed (optional)
            <input
              value={cueMissed}
              onChange={(event) => setCueMissed(event.target.value)}
              placeholder="One short sentence"
              maxLength={220}
            />
          </label>
          <button type="button" className="primary btn-block" onClick={submitPostmortem}>
            Save attempt
          </button>
          {postmortemError && (
            <p className="status-message error" role="alert">
              {postmortemError}
            </p>
          )}
        </section>
      )}

      <section className="card">
        <p className="section-label">Today status</p>
        <div className={`protocol-indicator ${summary.protocolCompleted ? 'protocol-indicator--done' : ''}`}>
          <span className="protocol-indicator__dot" />
          {summary.protocolCompleted ? 'Protocol completed' : 'Protocol not yet complete'}
        </div>
      </section>
    </div>
  )
}

