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
const calorieIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v3M5 4.5C3.5 6 3 8 4 10c.7 1.4 2 2.5 4 2.5s3.3-1.1 4-2.5c1-2 .5-4-1-5.5C10 6 9 7.5 8 7.5S6 6 5 4.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const weightIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 12h12M8 4v5M5.5 6.5 8 4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const restIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5A5 5 0 0 1 11.5 3a5 5 0 0 0-5 8.5H3v-3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M6.5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockWeeklyRows = [
  { week: 'Mar 17–23', calories: 1880, protein: 135, activityDays: 2, activityMin: 80,  dose: '0.5mg', weightChange: -0.2 },
  { week: 'Mar 24–30', calories: 1950, protein: 128, activityDays: 3, activityMin: 120, dose: '0.5mg', weightChange: +0.1 },
  { week: 'Mar 31–Apr 6', calories: 1910, protein: 132, activityDays: 2, activityMin: 90,  dose: '0.5mg', weightChange: -0.1 },
  { week: 'Apr 7–13',  calories: 1820, protein: 141, activityDays: 3, activityMin: 145, dose: '0.5mg', weightChange: -0.3 },
  { week: 'Apr 14–20', calories: 1808, protein: 142, activityDays: 4, activityMin: 175, dose: '0.5mg', weightChange: -0.4, best: true },
]

const insightCards = [
  {
    icon: proteinIcon,
    title: 'Higher protein weeks look different',
    body: 'Based on your data, weeks where protein averaged 140g+ tend to align with better weight trends. It\'s worth noting, though this may reflect other habits happening at the same time.',
  },
  {
    icon: consistencyIcon,
    title: 'Logging more days may help',
    body: 'Your more consistent weeks — 4 or more days logged — tend to show slightly lower calorie averages. Whether that reflects behaviour or just better tracking is hard to say.',
  },
  {
    icon: activityIcon,
    title: 'Short sessions tend to add up',
    body: 'Even 30-minute sessions accumulate to 150+ minutes per week in your data. Your more active weeks average around 160 min, which may be associated with steadier trends.',
  },
  {
    icon: calorieIcon,
    title: 'Around 1,800 kcal appears often',
    body: 'Weeks averaging 1,750–1,850 kcal tend to show up alongside your more stable weeks — based on your data so far. That said, individual variation matters a lot.',
  },
  {
    icon: weightIcon,
    title: 'Day-to-day weight varies naturally',
    body: 'Your daily weight can shift up to 1.5 kg based on water, sleep, and meals. The weekly average may give a more reliable picture than any single reading.',
  },
  {
    icon: restIcon,
    title: 'Rest days don\'t seem to slow things down',
    body: 'Based on your logged weeks, having 2–3 rest days doesn\'t appear to be associated with slower progress. How your body responds to rest is individual, though.',
  },
  {
    icon: streakIcon,
    title: 'Longer logging streaks look more consistent',
    body: 'Your weeks with 5+ days logged tend to show more stable averages — which may simply mean the data is more complete rather than reflecting a behaviour change.',
  },
  {
    icon: injectionIcon,
    title: 'A subtle pattern around dose days',
    body: 'Your calorie intake on dose days and the day after tends to run slightly lower than your weekly average — about 80 kcal. This is a small signal in your data, not a definitive finding.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Num({ children }) {
  return <span className={styles.highlight}>{children}</span>
}

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
  if (value === 0) return <span className={styles.deltaZero}>—</span>
  const neg = value < 0
  return (
    <span className={neg ? styles.deltaNeg : styles.deltaPos}>
      {neg ? '' : '+'}{value.toFixed(1)}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Insights({ onNavigate }) {
  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Insights</h1>
          <p className={styles.headerSub}>Based on your last 5 weeks</p>
        </header>

        <div className={styles.scrollContent}>

          {/* ── Pattern summary ──────────────────────────────────── */}
          <section className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>Your pattern</p>
            <p className={styles.summaryText}>
              On your best weeks, protein averaged <Num>142g</Num> and
              calories stayed around <Num>1,808 kcal</Num> — with{' '}
              <Num>4 active days</Num> and a weight drop of <Num>0.4 kg</Num>.
              That combination seems to be your sweet spot.
            </p>
          </section>

          {/* ── Insight cards ─────────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>What the data shows</h2>
            <div className={styles.cardList}>
              {insightCards.map(card => (
                <InsightCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          {/* ── Weekly comparison ─────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>Week-by-week</h2>
            <div className={styles.weekCards}>
              {mockWeeklyRows.slice(-4).map(row => (
                <div key={row.week} className={`${styles.weekCard} ${row.best ? styles.weekCardBest : ''}`}>
                  <div className={styles.weekCardHeader}>
                    <span className={styles.weekCardLabel}>{row.week}</span>
                    {row.best && <span className={styles.bestPill}>best week</span>}
                  </div>
                  <div className={styles.weekCardGrid}>
                    <div className={styles.weekStat}>
                      <span className={styles.weekStatLabel}>Calories</span>
                      <span className={styles.weekStatValue}>{row.calories.toLocaleString()}</span>
                      <span className={styles.weekStatUnit}>kcal avg</span>
                    </div>
                    <div className={styles.weekStat}>
                      <span className={styles.weekStatLabel}>Protein</span>
                      <span className={styles.weekStatValue}>{row.protein}g</span>
                      <span className={styles.weekStatUnit}>per day</span>
                    </div>
                    <div className={styles.weekStat}>
                      <span className={styles.weekStatLabel}>Activity</span>
                      <span className={styles.weekStatValue}>{row.activityMin} min</span>
                      <span className={styles.weekStatUnit}>{row.activityDays} days</span>
                    </div>
                    <div className={styles.weekStat}>
                      <span className={styles.weekStatLabel}>Dose</span>
                      <span className={styles.weekStatValue}>{row.dose}</span>
                      <span className={styles.weekStatUnit}>this week</span>
                    </div>
                    <div className={`${styles.weekStat} ${styles.weekStatFull}`}>
                      <span className={styles.weekStatLabel}>Weight change</span>
                      <span className={styles.weekStatValue}><WeightDelta value={row.weightChange} /> kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
