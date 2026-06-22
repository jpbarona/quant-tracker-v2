import { useMemo, useState } from 'react'
import { FOUNDATIONS_START } from './constants'
import { BottomNav } from './components/BottomNav'
import { CalendarPage } from './pages/CalendarPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { TopicsPage } from './pages/TopicsPage'
import { getTodaySummary, useAppStore, useTodayDate } from './state/AppStore'
import { titleCaseLabel } from './lib/labels'

type Tab = 'today' | 'topics' | 'reviews' | 'calendar' | 'settings'

const titleByTab: Record<Tab, string> = {
  today: 'Today',
  topics: 'Topics',
  reviews: 'Reviews',
  calendar: 'Calendar',
  settings: 'Settings',
}

const BrandMark = () => (
  <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="6" fill="#12151c" />
    <path
      d="M4 22 L10 16 L16 19 L22 10 L28 6"
      stroke="url(#brandGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="6" r="2" fill="#2ec4b6" />
    <defs>
      <linearGradient id="brandGrad" x1="4" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#d4a053" />
        <stop offset="1" stopColor="#2ec4b6" />
      </linearGradient>
    </defs>
  </svg>
)

interface PhaseRingProps {
  daysToTarget: number
  targetDate: string
}

const PhaseRing = ({ daysToTarget, targetDate }: PhaseRingProps) => {
  const progress = useMemo(() => {
    const start = new Date(`${FOUNDATIONS_START}T00:00:00.000Z`).getTime()
    const end = new Date(`${targetDate}T00:00:00.000Z`).getTime()
    const total = Math.max(1, Math.ceil((end - start) / (24 * 3600 * 1000)))
    const elapsed = total - daysToTarget
    return Math.min(1, Math.max(0, elapsed / total))
  }, [daysToTarget, targetDate])

  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="phase-ring" title={`${daysToTarget} days to target`} aria-label={`${daysToTarget} days to target`}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <defs>
          <linearGradient id="phaseGradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d4a053" />
            <stop offset="1" stopColor="#2ec4b6" />
          </linearGradient>
        </defs>
        <circle className="phase-ring__track" cx="22" cy="22" r={radius} />
        <circle
          className="phase-ring__fill"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="phase-ring__label">{daysToTarget}</span>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const { loading, persistStatus, state } = useAppStore()
  const today = useTodayDate()

  const phaseInfo = useMemo(() => {
    if (!state) {
      return null
    }
    const summary = getTodaySummary(state, today)
    return {
      phase: titleCaseLabel(summary.phase),
      daysToTarget: summary.daysToTarget,
      targetDate: state.settings.targetDate,
    }
  }, [state, today])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading" />
        <span>Loading your tracker…</span>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__brand">
          <BrandMark />
          <div className="top-bar__titles">
            <h1>{titleByTab[tab]}</h1>
            {phaseInfo && <p className="top-bar__phase">{phaseInfo.phase}</p>}
          </div>
        </div>
        <div className="top-bar__actions">
          {phaseInfo && (
            <PhaseRing daysToTarget={phaseInfo.daysToTarget} targetDate={phaseInfo.targetDate} />
          )}
          <span className={`persist-pill ${persistStatus.mode}`}>
            {persistStatus.mode === 'supabase' ? 'Cloud sync on' : 'Local mode'}
          </span>
        </div>
      </header>

      <main className="page-container">
        {tab === 'today' && <TodayPage />}
        {tab === 'topics' && <TopicsPage />}
        {tab === 'reviews' && <ReviewsPage />}
        {tab === 'calendar' && <CalendarPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <BottomNav active={tab} onSelect={setTab} />
    </div>
  )
}

export default App
