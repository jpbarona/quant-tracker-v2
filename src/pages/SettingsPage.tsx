import { useState } from 'react'
import { TARGET_DATE } from '../constants'
import { useAppStore } from '../state/AppStore'

export const SettingsPage = () => {
  const { state, updateSettings, addTopic, reorderTopics } = useAppStore()
  if (!state) {
    throw new Error('State unavailable')
  }

  const [easyMinutes, setEasyMinutes] = useState(String(Math.floor(state.settings.easySeconds / 60)))
  const [mediumMinutes, setMediumMinutes] = useState(String(Math.floor(state.settings.mediumSeconds / 60)))
  const [hardMinutes, setHardMinutes] = useState(String(Math.floor(state.settings.hardSeconds / 60)))
  const [newTopic, setNewTopic] = useState('')

  const topics = [...state.topics].sort((a, b) => a.orderIndex - b.orderIndex)

  const saveTimers = () => {
    const easy = Number(easyMinutes)
    const medium = Number(mediumMinutes)
    const hard = Number(hardMinutes)
    if (!Number.isFinite(easy) || !Number.isFinite(medium) || !Number.isFinite(hard)) {
      throw new Error('Timer values must be numbers')
    }
    updateSettings({
      ...state.settings,
      easySeconds: Math.round(easy * 60),
      mediumSeconds: Math.round(medium * 60),
      hardSeconds: Math.round(hard * 60),
    })
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
        <p className="muted">Target date</p>
        <h3>{TARGET_DATE}</h3>
      </section>

      <section className="card">
        <p className="muted">Attempt timer durations (minutes)</p>
        <label className="input-label">
          Easy
          <input value={easyMinutes} onChange={(event) => setEasyMinutes(event.target.value)} inputMode="numeric" />
        </label>
        <label className="input-label">
          Medium
          <input value={mediumMinutes} onChange={(event) => setMediumMinutes(event.target.value)} inputMode="numeric" />
        </label>
        <label className="input-label">
          Hard
          <input value={hardMinutes} onChange={(event) => setHardMinutes(event.target.value)} inputMode="numeric" />
        </label>
        <button type="button" className="primary" onClick={saveTimers}>
          Save timer settings
        </button>
      </section>

      <section className="card">
        <p className="muted">Topics and order</p>
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
        <label className="input-label">
          Add topic
          <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} placeholder="Topic name" />
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => {
            addTopic(newTopic)
            setNewTopic('')
          }}
        >
          Add topic
        </button>
      </section>
    </div>
  )
}

