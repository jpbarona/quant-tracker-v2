import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { CalendarPage } from './pages/CalendarPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { TopicsPage } from './pages/TopicsPage'
import { useAppStore } from './state/AppStore'

type Tab = 'today' | 'topics' | 'reviews' | 'calendar' | 'settings'

const titleByTab: Record<Tab, string> = {
  today: 'Today',
  topics: 'Topics',
  reviews: 'Reviews',
  calendar: 'Calendar',
  settings: 'Settings',
}

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const { loading, persistStatus } = useAppStore()

  if (loading) {
    return <div className="loading">Loading your tracker…</div>
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>{titleByTab[tab]}</h1>
        <span className={`persist-pill ${persistStatus.mode}`}>
          {persistStatus.mode === 'supabase' ? 'Cloud sync on' : 'Local mode'}
        </span>
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
