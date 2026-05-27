import styles from './Insights.module.css'
import { T, FONT, Eyebrow, Hairline, Card, TabBar } from './tokens'

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
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui }}>
      <div style={{ maxWidth: 430, margin: '0 auto', paddingBottom: 100 }}>

        {/* ── HERO — inverted pattern card ─────────────────────────── */}
        <div style={{ padding: '18px 16px 0' }}>
          <Card inverted padding={24} radius={20}>
            <Eyebrow color="#7a7a7a">Your pattern</Eyebrow>
            <div style={{ marginTop: 12, fontFamily: FONT.ui, fontSize: 16, lineHeight: 1.55, color: T.inkText }}>
              {hasData && best ? (
                <>
                  On your best week ({best.week})
                  {best.protein ? <>, protein averaged <span style={{ color: T.accent, fontWeight: 600 }}>{best.protein}g</span></> : null}
                  {best.calories ? <> and calories stayed around <span style={{ color: T.accent, fontWeight: 600 }}>{best.calories.toLocaleString()} kcal</span></> : null}
                  {best.activityDays > 0 ? <> with <span style={{ color: T.accent, fontWeight: 600 }}>{best.activityDays} active day{best.activityDays !== 1 ? 's' : ''}</span></> : null}
                  {best.weightChange !== null ? <> and a weight change of <span style={{ color: T.accent, fontWeight: 600 }}>{best.weightChange > 0 ? '+' : ''}{best.weightChange} kg</span></> : null}.
                </>
              ) : (
                'Log consistently for a few weeks and your personal pattern will appear here — showing what your best weeks look like in numbers.'
              )}
            </div>
          </Card>
        </div>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1 }}>Insights</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 6 }}>
            {hasData ? `Based on your last ${weeklyRows.length} week${weeklyRows.length !== 1 ? 's' : ''}` : 'Keep logging to unlock insights'}
          </div>
        </div>

        <Hairline style={{ margin: '18px 22px 0' }} />

        {/* ── Insight tip cards ─────────────────────────────────────── */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ padding: '0 6px 12px' }}><Eyebrow>What to know</Eyebrow></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insightCards.map(card => (
              <Card key={card.title} padding={16} radius={14} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: T.accentSoft, color: T.accentDark,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.5 }}>{card.body}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Week-by-week ─────────────────────────────────────────── */}
        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ padding: '0 6px 12px' }}><Eyebrow>Week by week</Eyebrow></div>
          {hasData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeklyRows.map(row => (
                <Card key={row.week} padding={16} radius={14} style={{ border: row.best ? `1px solid ${T.accent}` : `1px solid ${T.hair}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Eyebrow>{row.week}</Eyebrow>
                    {row.best && (
                      <span style={{
                        fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em',
                        background: T.accentSoft, color: T.accentDark,
                        padding: '3px 8px', borderRadius: 100,
                      }}>BEST WEEK</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {row.calories && (
                      <div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>CALORIES</div>
                        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 20, marginTop: 2 }}>{row.calories.toLocaleString()}</div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em' }}>kcal avg</div>
                      </div>
                    )}
                    {row.protein && (
                      <div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>PROTEIN</div>
                        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 20, marginTop: 2 }}>{row.protein}g</div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em' }}>per day</div>
                      </div>
                    )}
                    {row.activityDays > 0 && (
                      <div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>ACTIVITY</div>
                        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 20, marginTop: 2 }}>{row.activityMin}</div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em' }}>{row.activityDays} days · min</div>
                      </div>
                    )}
                  </div>
                  {row.weightChange !== null && (
                    <>
                      <Hairline style={{ margin: '12px 0 10px' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Eyebrow style={{ fontSize: 9 }}>Weight change</Eyebrow>
                        <span style={{
                          fontFamily: FONT.mono, fontSize: 11, fontWeight: 600,
                          color: row.weightChange < 0 ? T.accentDark : row.weightChange > 0 ? T.text : T.mute,
                          letterSpacing: '0.04em',
                        }}>
                          {row.weightChange > 0 ? '+' : ''}{row.weightChange.toFixed(1)} kg
                        </span>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card padding={24} radius={14}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>No data yet</div>
                <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.55 }}>
                  Log at least 2 weeks of data to see your week-by-week breakdown here.
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Disclaimer ────────────────────────────────────────────── */}
        <p style={{ fontFamily: FONT.ui, fontSize: 11, color: T.faint, lineHeight: 1.6, textAlign: 'center', padding: '18px 22px 0', margin: 0 }}>
          Insights are based on your logged data only and are not medical advice.
        </p>

      </div>

      {/* ── Bottom tab bar ───────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <TabBar active="insights" onTab={onNavigate} />
      </div>
    </div>
  )
}
