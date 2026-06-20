import { useState } from 'react'
import { isoDay } from '../lib/date'
import { getCalendarDays, useAppStore } from '../state/AppStore'

const monthIso = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export const CalendarPage = () => {
  const { state } = useAppStore()
  if (!state) {
    throw new Error('State unavailable')
  }
  const [selectedMonth, setSelectedMonth] = useState(monthIso(new Date()))
  const [selectedDate, setSelectedDate] = useState(isoDay(new Date()))
  const days = getCalendarDays(state, selectedMonth)
  const selected = days.find((entry) => entry.date === selectedDate) ?? null

  return (
    <div className="page">
      <section className="card">
        <label className="input-label">
          Month
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
        <div className="calendar-grid">
          {days.map((entry) => (
            <button
              key={entry.date}
              type="button"
              className={`calendar-cell ${entry.protocolCompleted ? 'done' : ''} ${selectedDate === entry.date ? 'selected' : ''}`}
              onClick={() => setSelectedDate(entry.date)}
            >
              <span>{entry.date.slice(-2)}</span>
              <small>{entry.dayType ?? '-'}</small>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="card">
          <p className="muted">Details for {selected.date}</p>
          <p>Day type: {selected.dayType ?? 'Not selected'}</p>
          <p>Protocol completed: {selected.protocolCompleted ? 'Yes' : 'No'}</p>
          <p>
            Readiness: {selected.readiness ? `${selected.readiness.mentalEnergy}/${selected.readiness.stress}/${selected.readiness.sleepQuality}` : 'Not logged'}
          </p>
          <p>
            Mental maths: {selected.mentalMath ? `${Math.floor(selected.mentalMath.elapsedSeconds / 60)}m ${selected.mentalMath.elapsedSeconds % 60}s` : 'None'}
          </p>
          <p>Question attempts: {selected.attemptCount}</p>
          <p>Review attempts: {selected.reviewCount}</p>
        </section>
      )}
    </div>
  )
}

