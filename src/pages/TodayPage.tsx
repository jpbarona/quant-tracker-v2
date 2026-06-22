import { useEffect, useMemo, useState } from 'react'
import { DAY_PROTOCOLS, TARGET_DATE } from '../constants'
import { getMentalMathSecondsForDayType } from '../domain/dailyPlan'
import { parseQuestionLabel } from '../domain/urlParser'
import { titleCaseLabel } from '../lib/labels'
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

const formatClock = (total: number): string => {
  const safe = Math.max(0, Math.floor(total))
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

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

const nowMs = (): number => new Date().getTime()

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

  const dayType = summary.dayType
  const dayProtocol = DAY_PROTOCOLS[dayType]

  const dueReview = summary.plan.reviews[0] ?? null

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

  const mentalScheduledSeconds = getMentalMathSecondsForDayType(dayType)
  const mentalRemaining = (() => {
    if (!mentalTimer) {
      return mentalScheduledSeconds
    }
    const now = nowEpochMs
    const activeElapsed = mentalTimer.pauseStartedAtMs
      ? Math.floor((mentalTimer.pauseStartedAtMs - mentalTimer.startedAtMs) / 1000) - mentalTimer.pausedSeconds
      : Math.floor((now - mentalTimer.startedAtMs) / 1000) - mentalTimer.pausedSeconds
    return Math.max(0, mentalScheduledSeconds - activeElapsed)
  })()

  const attemptRemaining = (() => {
    if (!attemptTimer) {
      return 0
    }
    const now = nowEpochMs
    const activeElapsed = attemptTimer.pauseStartedAtMs
      ? Math.floor((attemptTimer.pauseStartedAtMs - attemptTimer.startedAtMs) / 1000) - attemptTimer.pausedSeconds
      : Math.floor((now - attemptTimer.startedAtMs) / 1000) - attemptTimer.pausedSeconds
    return Math.max(0, attemptTimer.scheduledSeconds - activeElapsed)
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
    const elapsed = Math.floor((nowEpochMs - mentalTimer.startedAtMs) / 1000) - mentalTimer.pausedSeconds
    if (elapsed >= mentalScheduledSeconds) {
      const completedAt = new Date().toISOString()
      logMentalMath({
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
  }, [dayType, logMentalMath, mentalTimer, mentalScheduledSeconds, nowEpochMs, today])

  useEffect(() => {
    if (!attemptTimer || attemptTimer.pauseStartedAtMs) {
      return
    }
    const elapsed = Math.floor((nowEpochMs - attemptTimer.startedAtMs) / 1000) - attemptTimer.pausedSeconds
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
  }, [attemptTimer, nowEpochMs])

  useEffect(() => {
    setReadinessSaveState('idle')
    setReadinessFeedback(null)
  }, [energy, stress, sleepQuality])

  useEffect(() => {
    setAttemptError(null)
  }, [urlInput, attemptMode, duplicateAcknowledged, topicId, difficulty])

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
    if (mentalTimer.pauseStartedAtMs) {
      const pausedFor = Math.floor((nowMs() - mentalTimer.pauseStartedAtMs) / 1000)
      setMentalTimer({
        ...mentalTimer,
        pauseStartedAtMs: null,
        pausedSeconds: mentalTimer.pausedSeconds + pausedFor,
      })
      return
    }
    setMentalTimer({ ...mentalTimer, pauseStartedAtMs: nowMs() })
  }

  const completeMentalMathEarly = () => {
    if (!mentalTimer) {
      return
    }
    const now = nowMs()
    const pausedNow = mentalTimer.pauseStartedAtMs
      ? Math.floor((now - mentalTimer.pauseStartedAtMs) / 1000)
      : 0
    const pausedSeconds = mentalTimer.pausedSeconds + pausedNow
    const elapsed = Math.max(0, Math.floor((now - mentalTimer.startedAtMs) / 1000) - pausedSeconds)
    logMentalMath({
      date: today,
      dayType,
      scheduledSeconds: mentalScheduledSeconds,
      elapsedSeconds: elapsed,
      completedFullDuration: elapsed >= mentalScheduledSeconds,
      startedAt: mentalTimer.startedAtIso,
      completedAt: new Date().toISOString(),
    })
    setMentalTimer(null)
  }

  const trimmedUrl = urlInput.trim()
  const needsTopic = attemptMode !== 'mixed'
  const attemptBlockedReason = (() => {
    if (attemptTimer) {
      return 'A timed attempt is already running.'
    }
    if (!trimmedUrl) {
      return 'Enter a QuantQuestions URL to start.'
    }
    if (attemptMode === 'review' && !dueReview) {
      return 'No review is due today. Switch to New or Mixed mode.'
    }
    if (duplicateExists && !duplicateAcknowledged) {
      return 'Confirm re-attempt for this URL below.'
    }
    if (needsTopic && !topicId) {
      return 'Select a topic to start.'
    }
    return null
  })()

  const beginAttempt = () => {
    if (attemptTimer) {
      return
    }
    if (!trimmedUrl) {
      setAttemptError('Enter a QuantQuestions URL before starting.')
      return
    }
    if (attemptMode === 'review' && !dueReview) {
      setAttemptError('No review is due today. Switch to New or Mixed mode.')
      return
    }
    if (duplicateExists && !duplicateAcknowledged) {
      setAttemptError('This URL was attempted before. Confirm re-attempt below.')
      return
    }
    if (needsTopic && !topicId) {
      setAttemptError('Select a topic before starting.')
      return
    }
    try {
      parseQuestionLabel(trimmedUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'URL could not be parsed.'
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
    if (attemptTimer.pauseStartedAtMs) {
      const pausedFor = Math.floor((nowMs() - attemptTimer.pauseStartedAtMs) / 1000)
      setAttemptTimer({
        ...attemptTimer,
        pauseStartedAtMs: null,
        pausedSeconds: attemptTimer.pausedSeconds + pausedFor,
      })
      return
    }
    setAttemptTimer({ ...attemptTimer, pauseStartedAtMs: nowMs() })
  }

  const finishAttempt = (abandoned: boolean) => {
    if (!attemptTimer) {
      return
    }
    const now = nowMs()
    const elapsedGross = Math.floor((now - attemptTimer.startedAtMs) / 1000)
    const pausedNow = attemptTimer.pauseStartedAtMs
      ? Math.floor((now - attemptTimer.pauseStartedAtMs) / 1000)
      : 0
    const pausedSeconds = attemptTimer.pausedSeconds + pausedNow
    const elapsedSeconds = Math.max(0, elapsedGross - pausedSeconds)
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
  }

  const submitPostmortem = () => {
    if (!postmortem) {
      return
    }
    const actualTopicId =
      postmortem.timer.mode === 'mixed' && !topicId ? null : postmortem.timer.topicId
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
    setUrlInput('')
    setDuplicateAcknowledged(false)
    setFirstTryCorrect(true)
    setUsedSolution(false)
    setDivergence('no_divergence')
    setCueMissed('')
  }

  return (
    <div className="page">
      <section className="card">
        <div className="stat-row">
          <div className="stat-block">
            <p className="section-label">Phase</p>
            <h2>{titleCaseLabel(summary.phase)}</h2>
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
              {titleCaseLabel(type)}
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
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
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

