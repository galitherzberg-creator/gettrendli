import styles from './Insights.module.css'

// ── Card icons ────────────────────────────────────────────────────────────────

const proteinIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 13 C3 13 5 5 8 5 C11 5 13 13 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M5.5 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const consistencyIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)
const activityIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 10l3-4 3 3 3-5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const weightIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 12h12M8 4v5M5.5 6.5 8 4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const streakIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2C5.5 4.5 4 7 5.5 9.5 6.2 10.7 7.3 11.5 8 12c.7-.5 1.8-1.3 2.5-2.5C12 7 10.5 4.5 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const injectionIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.5 2.5 13.5 5.5M9 4 12 7M4 9l3 3-1.5 1.5L4 12l-1.5-1.5L4 9Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 6l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const waterIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2C8 2 4 6.5 4 9.5a4 4 0 0 0 8 0C12 6.5 8 2 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

// ── Insight tip cards (generic, always relevant) ──────────────────────────────

const insightCards = [
  {
    icon: proteinIcon,
    title: 'Higher protein weeks look different',
    body: "Weeks where protein averages higher tend to align with better weight trends — whether you're losing fat or building muscle. It's worth tracking consistently.",
  },
  {
    icon: consistencyIcon,
    title: 'Logging more days helps accuracy',
    body: 'The more days you log, the more reliable your weekly averages become. Even partial logs — just weight or protein — add useful signal.',
  },
  {
    icon: activityIcon,
    title: 'Short sessions tend to add up',
    body: 'Even 30-minute sessions accumulate to 150+ minutes per week. Consistency beats intensity for long-term trends.',
  },
  {
    icon: weightIcon,
    title: 'Day-to-day weight varies naturally',
    body: 'Your daily weight can shift up to 1.5 kg based on water, sleep, and meals. The weekly average gives a more reliable picture than any single reading.',
  },
  {
    icon: streakIcon,
    title: 'Longer logging streaks = better data',
    body: 'Weeks with 5+ days logged show more stable averages — which may simply mean the data is more complete rather than reflecting a behaviour change.',
  },
  {
    icon: injectionIcon,
    title: 'A pattern around dose days',
    body: 'Calorie intake on dose days and the day after often runs slightly lower than your weekly average. This is a common pattern reported by GLP-1 users.',
  },
  {
    icon: waterIcon,
    title: 'Hydration matters on GLP-1',
    body: 'GLP-1 medications can reduce thirst cues. Tracking water intake helps ensure you stay consistently hydrated, especially on injection days.',
  },
]

// ── Compute weekly rows from real logs ────────────────────────────────────────

function computeInsightWeeks(logs) {
  const weeks = {}
  Object.entries(logs).forEach(([dateStr, entry]) => {
    if (!entry.calories && !entry.protein && !entry.weight && !entry.activityDuration) return
    const d = new Date(dateStr + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    const weekKey = monday.toISOString().split('T')[0]
    if (!weeks[weekKey]) weeks[weekKey] = []
    weeks[weekKey].push({ dateStr, ...entry })
  })

  const result = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, entries]) => {
      const start = new Date(weekKey + 'T12:00:00')
      const end   = new Date(start)
      end.setDate(start.getDate() + 6)
      const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const label = `${fmt(start)}–${fmt(end)}`

      const withCal      = entries.filter(e => e.calories)
      const withProt     = entries.filter(e => e.protein)
      const withActivity = entries.filter(e => e.activityDuration)
      const withDose     = entries.filter(e => e.dose)
      const weightEntries = entries.filter(e => e.weight).sort((a, b) => a.dateStr.localeCompare(b.dateStr))

      const avgCalories  = withCal.length  ? Math.round(withCal.reduce((s, e) => s + +e.calories, 0) / withCal.length)  : null
      const avgProtein   = withProt.length ? Math.round(withProt.reduce((s, e) => s + +e.protein, 0) / withProt.length) : null
      const activityDays = withActivity.length
      const activityMin  = withActivity.reduce((s, e) => s + +e.activityDuration, 0)
      const latestDose   = withDose.length ? withDose[withDose.length - 1].dose : null
      const weightChange = weightEntries.length >= 2
        ? parseFloat((parseFloat(weightEntries[weightEntries.length - 1].weight) - parseFloat(weightEntries[0].weight)).toFixed(1))
        : null

      return { week: label, calories: avgCalories, protein: avgProtein, activityDays, activityMin, dose: latestDose ? `${latestDose}mg` : null, weightChange }
    })

  // Mark best week (highest protein)
  if (result.length > 1) {
    const withProt = result.filter(w => w.protein)
    if (withProt.length) {
      const best = withProt.reduce((a, b) => b.protein > a.protein ? b : a)
      best.best = true
    }
  }

  return result.slice(-4)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightCard({ icon, title, body }) {
  return (
    <div className={styles.insightCard}>
      <div className={styles.insightCardIcon}>{icon}</div>
      <div className={styles.insightCardBody}>
        <p className={styles.insightCardTitle}>{title}</p>
        <p className={styles.insightCardText}>{body}</p>
      </div>
    </div>
  )
}

function WeightDelta({ value }) {
  if (value === null || value === undefined) return <span className={styles.deltaZero}>—</span>
  if (value === 0) return <span className={styles.deltaZero}>±0</span>
  const neg = value < 0
  return (
    <span className={neg ? styles.deltaNeg : styles.deltaPos}>
      {neg ? '' : '+'}{value.toFixed(1)}
    </span>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>No data yet</p>
      <p className={styles.emptyText}>Log at least 2 weeks of data to see your week-by-week breakdown and pattern summary here.</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Insights({ logs = {}, onNavigate }) {
  const weeklyRows = computeInsightWeeks(logs)
  const hasData    = weeklyRows.length > 0
  const best       = weeklyRows.find(w => w.best)

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Insights</h1>
          <p className={styles.headerSub}>
            {hasData ? `Based on your last ${weeklyRows.length} week${weeklyRows.length !== 1 ? 's' : ''}` : 'Keep logging to unlock insights'}
          </p>
        </header>

        <div className={styles.scrollContent}>

          {/* ── Pattern summary ──────────────────────────────────── */}
          <section className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>Your pattern</p>
            {hasData && best ? (
              <p className={styles.summaryText}>
                On your best week ({best.week}){best.protein ? <>, protein averaged <span className={styles.highlight}>{best.protein}g</span></> : null}{best.calories ? <> and calories stayed around <span className={styles.highlight}>{best.calories.toLocaleString()} kcal</span></> : null}{best.activityDays > 0 ? <> with <span className={styles.highlight}>{best.activityDays} active day{best.activityDays !== 1 ? 's' : ''}</span></> : null}{best.weightChange !== null ? <> and a weight change of <span className={styles.highlight}>{best.weightChange > 0 ? '+' : ''}{best.weightChange} kg</span></> : null}.
              </p>
            ) : (
              <p className={styles.summaryText}>
                Log consistently for a few weeks and your personal pattern will appear here — showing what your best weeks look like in numbers.
              </p>
            )}
          </section>

          {/* ── Insight cards ─────────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>What to know</h2>
            <div className={styles.cardList}>
              {insightCards.map(card => (
                <InsightCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          {/* ── Weekly comparison ─────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>Week-by-week</h2>
            {hasData ? (
              <div className={styles.weekCards}>
                {weeklyRows.map(row => (
                  <div key={row.week} className={`${styles.weekCard} ${row.best ? styles.weekCardBest : ''}`}>
                    <div className={styles.weekCardHeader}>
                      <span className={styles.weekCardLabel}>{row.week}</span>
                      {row.best && <span className={styles.bestPill}>best week</span>}
                    </div>
                    <div className={styles.weekCardGrid}>
                      {row.calories && (
                        <div className={styles.weekStat}>
                          <span className={styles.weekStatLabel}>Calories</span>
                          <span className={styles.weekStatValue}>{row.calories.toLocaleString()}</span>
                          <span className={styles.weekStatUnit}>kcal avg</span>
                        </div>
                      )}
                      {row.protein && (
                        <div className={styles.weekStat}>
                          <span className={styles.weekStatLabel}>Protein</span>
                          <span className={styles.weekStatValue}>{row.protein}g</span>
                          <span className={styles.weekStatUnit}>per day</span>
                        </div>
                      )}
                      {row.activityDays > 0 && (
                        <div className={styles.weekStat}>
                          <span className={styles.weekStatLabel}>Activity</span>
                          <span className={styles.weekStatValue}>{row.activityMin} min</span>
                          <span className={styles.weekStatUnit}>{row.activityDays} days</span>
                        </div>
                      )}
                      {row.dose && (
                        <div className={styles.weekStat}>
                          <span className={styles.weekStatLabel}>Dose</span>
                          <span className={styles.weekStatValue}>{row.dose}</span>
                          <span className={styles.weekStatUnit}>this week</span>
                        </div>
                      )}
                      {row.weightChange !== null && (
                        <div className={`${styles.weekStat} ${styles.weekStatFull}`}>
                          <span className={styles.weekStatLabel}>Weight change</span>
                          <span className={styles.weekStatValue}><WeightDelta value={row.weightChange} /> kg</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </section>

          {/* ── Disclaimer ────────────────────────────────────────── */}
          <p className={styles.disclaimer}>
            Insights are based on your logged data only and are for personal tracking purposes.
            They are not medical advice. Consult your healthcare provider before making changes to
            your diet, activity, or medication routine.
          </p>

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── Bottom nav ───────────────────────────────────────────── */}
        <nav className={styles.bottomNav}>
          {[
            { icon: homeIcon,       label: 'Home',     action: 'dashboard' },
            { icon: chartIcon,      label: 'Charts',   action: 'charts' },
            { icon: plusIcon,       label: 'Log',      action: 'log', center: true },
            { icon: insightNavIcon, label: 'Insights', action: 'insights', active: true },
            { icon: settingsIcon,   label: 'Settings', action: 'settings' },
          ].map(({ icon, label, active, center, action }) => (
            <button key={label} onClick={() => action && onNavigate(action)}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''} ${center ? styles.navItemCenter : ''}`}>
              {icon}
              {!center && <span className={styles.navLabel}>{label}</span>}
            </button>
          ))}
        </nav>

      </div>
    </div>
  )
}

// ── Nav icons ─────────────────────────────────────────────────────────────────

const homeIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const chartIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 14l4.5-5 3.5 3 4-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 17h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const plusIcon = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const insightNavIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 7v3M10 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const settingsIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14 14l1.06 1.06M4.93 15.07l1.06-1.06M14 6l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
