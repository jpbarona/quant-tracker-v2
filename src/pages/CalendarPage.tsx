import { useMemo, useState } from 'react'
import { isoDay } from '../lib/date'
import { getCalendarDays, useAppStore } from '../state/AppStore'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const monthIso = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const leadingEmptyCells = (monthIsoValue: string): number => {
  const first = new Date(`${monthIsoValue}-01T00:00:00.000Z`)
  const day = first.getUTCDay()
  return day === 0 ? 6 : day - 1
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

  const padding = useMemo(() => leadingEmptyCells(selectedMonth), [selectedMonth])

  return (
    <div className="page">
      <section className="card">
        <label className="input-label">
          Month
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>

        <div className="calendar-weekdays">
          {WEEKDAYS.map((label) => (
            <span key={label} className="calendar-weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: padding }, (_, i) => (
            <div key={`pad-${i}`} className="calendar-cell calendar-cell--empty" aria-hidden="true" />
          ))}
          {days.map((entry) => {
            const typeClass = entry.dayType ? `calendar-cell--${entry.dayType}` : ''
            return (
              <button
                key={entry.date}
                type="button"
                className={`calendar-cell ${typeClass} ${entry.protocolCompleted ? 'done' : ''} ${selectedDate === entry.date ? 'selected' : ''}`}
                onClick={() => setSelectedDate(entry.date)}
              >
                <span className="calendar-cell__day">{entry.date.slice(-2)}</span>
                <span className="calendar-cell__type">{entry.dayType ?? '—'}</span>
              </button>
            )
          })}
        </div>
      </section>

      {selected && (
        <section className="card">
          <p className="section-label">Details for {selected.date}</p>
          <p>Day type: {selected.dayType ?? 'Not selected'}</p>
          <div className={`protocol-indicator ${selected.protocolCompleted ? 'protocol-indicator--done' : ''}`}>
            <span className="protocol-indicator__dot" />
            {selected.protocolCompleted ? 'Protocol completed' : 'Protocol incomplete'}
          </div>
          <p>
            Readiness:{' '}
            {selected.readiness
              ? `${selected.readiness.mentalEnergy}/${selected.readiness.stress}/${selected.readiness.sleepQuality}`
              : 'Not logged'}
          </p>
          <p>
            Mental maths:{' '}
            {selected.mentalMath
              ? `${Math.floor(selected.mentalMath.elapsedSeconds / 60)}m ${selected.mentalMath.elapsedSeconds % 60}s`
              : 'None'}
          </p>
          <p>Question attempts: {selected.attemptCount}</p>
          <p>Review attempts: {selected.reviewCount}</p>
        </section>
      )}
    </div>
  )
}
