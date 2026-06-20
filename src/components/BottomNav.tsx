interface BottomNavProps {
  active: 'today' | 'topics' | 'reviews' | 'calendar' | 'settings'
  onSelect: (tab: 'today' | 'topics' | 'reviews' | 'calendar' | 'settings') => void
}

const items: Array<{ key: BottomNavProps['active']; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'topics', label: 'Topics' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'settings', label: 'Settings' },
]

export const BottomNav = ({ active, onSelect }: BottomNavProps) => {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${active === item.key ? 'active' : ''}`}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

