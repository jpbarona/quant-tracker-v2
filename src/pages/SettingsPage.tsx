import { useState } from 'react'
import { TARGET_DATE } from '../constants'
import { useAppStore } from '../state/AppStore'

type TimerSaveState = 'idle' | 'success' | 'error'

const validateTimerMinutes = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed === '') {
    return 'Required'
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Must be a whole number'
  }
  const num = Number(trimmed)
  if (num < 1 || num > 180) {
    return 'Must be between 1 and 180 minutes'
  }
  return null
}

const validateTopicName = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'Topic name is required'
  }
  if (trimmed.length > 80) {
    return 'Topic name must be 80 characters or fewer'
  }
  return null
}

export const SettingsPage = () => {
  const { state, updateSettings, addTopic, reorderTopics } = useAppStore()
  if (!state) {
    throw new Error('State unavailable')
  }

  const [easyMinutes, setEasyMinutes] = useState(String(Math.floor(state.settings.easySeconds / 60)))
  const [mediumMinutes, setMediumMinutes] = useState(String(Math.floor(state.settings.mediumSeconds / 60)))
  const [hardMinutes, setHardMinutes] = useState(String(Math.floor(state.settings.hardSeconds / 60)))
  const [newTopic, setNewTopic] = useState('')
  const [timerSaveState, setTimerSaveState] = useState<TimerSaveState>('idle')
  const [timerErrors, setTimerErrors] = useState<{ easy?: string; medium?: string; hard?: string }>({})
  const [timerFeedback, setTimerFeedback] = useState<string | null>(null)
  const [topicError, setTopicError] = useState<string | null>(null)

  const topics = [...state.topics].sort((a, b) => a.orderIndex - b.orderIndex)

  const saveTimers = () => {
    const easyErr = validateTimerMinutes(easyMinutes)
    const mediumErr = validateTimerMinutes(mediumMinutes)
    const hardErr = validateTimerMinutes(hardMinutes)

    if (easyErr || mediumErr || hardErr) {
      const errors: { easy?: string; medium?: string; hard?: string } = {}
      if (easyErr) errors.easy = easyErr
      if (mediumErr) errors.medium = mediumErr
      if (hardErr) errors.hard = hardErr
      setTimerErrors(errors)
      setTimerSaveState('error')
      setTimerFeedback('Fix the errors above before saving.')
      return
    }

    setTimerErrors({})
    try {
      updateSettings({
        ...state.settings,
        easySeconds: Number(easyMinutes) * 60,
        mediumSeconds: Number(mediumMinutes) * 60,
        hardSeconds: Number(hardMinutes) * 60,
      })
      setTimerSaveState('success')
      setTimerFeedback('Timer settings saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save timer settings.'
      setTimerSaveState('error')
      setTimerFeedback(message)
    }
  }

  const handleAddTopic = () => {
    const validationError = validateTopicName(newTopic)
    if (validationError) {
      setTopicError(validationError)
      return
    }

    const trimmed = newTopic.trim()
    try {
      addTopic(trimmed)
      setNewTopic('')
      setTopicError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add topic.'
      setTopicError(message)
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...topics]
    const target = index + direction
    if (target < 0 || target >= next.length) {
      return
    }
    const current = next[index]
    const swap = next[target]
    if (!current || !swap) {
      return
    }
    next[index] = swap
    next[target] = current
    reorderTopics(next.map((topic) => topic.id))
  }

  return (
    <div className="page">
      <section className="card">
        <p className="section-label">Target date</p>
        <h3>{TARGET_DATE}</h3>
      </section>

      <section className="card">
        <p className="section-label">Attempt timer durations (minutes)</p>
        <label className={`input-label ${timerErrors.easy ? 'input-label--error' : ''}`}>
          Easy
          <input
            value={easyMinutes}
            onChange={(event) => {
              setEasyMinutes(event.target.value)
              setTimerSaveState('idle')
              setTimerFeedback(null)
            }}
            inputMode="numeric"
          />
          {timerErrors.easy && <p className="input-error">{timerErrors.easy}</p>}
        </label>
        <label className={`input-label ${timerErrors.medium ? 'input-label--error' : ''}`}>
          Medium
          <input
            value={mediumMinutes}
            onChange={(event) => {
              setMediumMinutes(event.target.value)
              setTimerSaveState('idle')
              setTimerFeedback(null)
            }}
            inputMode="numeric"
          />
          {timerErrors.medium && <p className="input-error">{timerErrors.medium}</p>}
        </label>
        <label className={`input-label ${timerErrors.hard ? 'input-label--error' : ''}`}>
          Hard
          <input
            value={hardMinutes}
            onChange={(event) => {
              setHardMinutes(event.target.value)
              setTimerSaveState('idle')
              setTimerFeedback(null)
            }}
            inputMode="numeric"
          />
          {timerErrors.hard && <p className="input-error">{timerErrors.hard}</p>}
        </label>
        <button type="button" className="primary" onClick={saveTimers}>
          Save timer settings
        </button>
        {timerFeedback && (
          <p className={`status-message ${timerSaveState === 'error' ? 'error' : timerSaveState === 'success' ? 'success' : ''}`}>
            {timerFeedback}
          </p>
        )}
      </section>

      <section className="card">
        <p className="section-label">Topics and order</p>
        {topics.map((topic, index) => (
          <div key={topic.id} className="list-item row between">
            <div>
              <strong>{topic.name}</strong>
              <p className="hint">{topic.stage.replace('_', ' ')}</p>
            </div>
            <div className="row gap">
              <button type="button" className="secondary" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="secondary" onClick={() => move(index, 1)}>
                Down
              </button>
            </div>
          </div>
        ))}
        <label className={`input-label ${topicError ? 'input-label--error' : ''}`}>
          Add topic
          <input
            value={newTopic}
            onChange={(event) => {
              setNewTopic(event.target.value)
              setTopicError(null)
            }}
            placeholder="Topic name"
            maxLength={80}
          />
          {topicError && <p className="input-error">{topicError}</p>}
        </label>
        <button type="button" className="primary" onClick={handleAddTopic}>
          Add topic
        </button>
      </section>
    </div>
  )
}
