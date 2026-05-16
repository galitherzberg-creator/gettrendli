import { useState, useRef } from 'react'
import { mockInsight } from './mockData'
import { computeWeeklyData, getWeekLabel, todayISO, formatDate, isoDate } from './logStore'
import styles from './Dashboard.module.css'
import TipBanner, { useTip } from './TipBanner'

const MOOD_MAP = {
  great:         { label: 'Great',        icon: '😊' },
  good:          { label: 'Good',         icon: '🙂' },
  nauseous:      { label: 'Nauseous',     icon: '🤢' },
  tired:         { label: 'Tired',        icon: '😴' },
  'low-appetite':{ label: 'Low appetite', icon: '🍽️' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WeightChange({ current, previous, goalType = 'lose' }) {
  if (!previous) return null
  const diff = parseFloat((parseFloat(current) - parseFloat(previous)).toFixed(1))
  const isZero = diff === 0
  const isGood = goalType === 'gain' ? diff > 0 : diff < 0
  return (
    <span className={`${styles.weightBadge} ${isGood ? styles.weightBadgeGood : isZero ? styles.weightBadgeNeutral : styles.weightBadgeUp}`}>
      {diff > 0 ? '+' : ''}{diff} kg {isZero ? 'no change' : 'from last entry'}
    </span>
  )
}

// Today section — shows actual logged values, not checkboxes
function TodayMetric({ label, primary, secondary, logged }) {
  return (
    <div className={styles.todayMetric}>
      <span className={styles.todayMetricLabel}>{label}</span>
      <span className={logged ? styles.todayMetricPrimary : styles.todayMetricEmpty}>
        {logged ? primary : '—'}
      </span>
      {logged && secondary && (
        <span className={styles.todayMetricSecondary}>{secondary}</span>
      )}
    </div>
  )
}

// Weekly section — smaller cards, aggregated averages
function SnapshotCard({ label, value, sub }) {
  return (
    <div className={styles.snapshotCard}>
      <span className={styles.snapshotLabel}>{label}</span>
      <span className={styles.snapshotValue}>{value ?? '—'}</span>
      {sub && <span className={styles.snapshotSub}>{sub}</span>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function computeStreak(logs) {
  let streak = 0
  let i = 0
  while (i < 365) {
    const entry = logs[isoDate(i)]
    if (!entry) break
    const hasData = entry.calories || entry.protein || entry.weight || entry.activityDuration || entry.water > 0
    if (!hasData) break
    streak++
    i++
  }
  return streak
}

function computeSideEffectTrends(logs) {
  const thisWeek = {}
  const lastWeek = {}
  for (let i = 0; i <= 6; i++) {
    const entry = logs[isoDate(i)]
    if (entry?.sideEffects?.length) {
      entry.sideEffects.forEach(se => { thisWeek[se] = (thisWeek[se] || 0) + 1 })
    }
  }
  for (let i = 7; i <= 13; i++) {
    const entry = logs[isoDate(i)]
    if (entry?.sideEffects?.length) {
      entry.sideEffects.forEach(se => { lastWeek[se] = (lastWeek[se] || 0) + 1 })
    }
  }
  const all = new Set([...Object.keys(thisWeek), ...Object.keys(lastWeek)])
  if (!all.size) return []
  return Array.from(all).map(se => ({
    key: se,
    label: se.charAt(0).toUpperCase() + se.slice(1).replace('-', '. '),
    thisWeek: thisWeek[se] || 0,
    lastWeek: lastWeek[se] || 0,
  })).sort((a, b) => b.thisWeek - a.thisWeek)
}

function computeDoseHistory(logs) {
  return Object.entries(logs)
    .filter(([, v]) => v.dose && v.injectionDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([, v]) => ({ date: v.injectionDate, dose: v.dose }))
}

function computeBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  const m = heightCm / 100
  return (parseFloat(weightKg) / (m * m)).toFixed(1)
}

function computeNextInjection(logs, userSettings) {
  const { injectionInterval = 7, lastInjectionDate } = userSettings
  let latestInjDate = lastInjectionDate ?? null
  for (const entry of Object.values(logs)) {
    if (entry.injectionDate && (!latestInjDate || entry.injectionDate > latestInjDate)) {
      latestInjDate = entry.injectionDate
    }
  }
  if (!latestInjDate) return null
  const last = new Date(latestInjDate + 'T12:00:00')
  const next = new Date(last)
  next.setDate(next.getDate() + injectionInterval)
  const today = new Date(todayISO + 'T12:00:00')
  const daysUntil = Math.round((next - today) / 86400000)
  return { daysUntil, nextDate: next.toISOString().split('T')[0] }
}

function computeWeeklySummary(logs, goalType, proteinGoal) {
  // This week (last 7 days)
  const thisWeek = []
  for (let i = 0; i <= 6; i++) {
    const d = isoDate(i)
    if (logs[d]) thisWeek.push({ ...logs[d], date: d })
  }
  // Last week (7–13 days ago) — for weight comparison
  const lastWeekWeights = []
  for (let i = 7; i <= 13; i++) {
    const d = isoDate(i)
    if (logs[d]?.weight) lastWeekWeights.push(parseFloat(logs[d].weight))
  }
  const thisWeekWeights = thisWeek.filter(e => e.weight).map(e => parseFloat(e.weight))
  const weightNow  = thisWeekWeights.length ? thisWeekWeights[thisWeekWeights.length - 1] : null
  const weightThen = lastWeekWeights.length ? lastWeekWeights[lastWeekWeights.length - 1] : null
  const weightDelta = weightNow && weightThen
    ? parseFloat((weightNow - weightThen).toFixed(1))
    : null

  const daysLogged      = thisWeek.filter(e => e.calories || e.protein || e.weight || e.activityDuration).length
  const activitySessions = thisWeek.filter(e => e.activityDuration).length
  const proteinEntries  = thisWeek.filter(e => e.protein)
  const avgProtein      = proteinEntries.length
    ? Math.round(proteinEntries.reduce((s, e) => s + parseFloat(e.protein), 0) / proteinEntries.length)
    : null
  const proteinGoalDays = proteinGoal && proteinEntries.length
    ? proteinEntries.filter(e => parseFloat(e.protein) >= proteinGoal).length
    : null

  // Generate headline sentence
  const parts = []
  if (weightDelta !== null) {
    const direction = goalType === 'gain'
      ? (weightDelta > 0 ? `gained ${weightDelta} kg` : weightDelta < 0 ? `lost ${Math.abs(weightDelta)} kg` : 'maintained your weight')
      : (weightDelta < 0 ? `lost ${Math.abs(weightDelta)} kg` : weightDelta > 0 ? `gained ${weightDelta} kg` : 'maintained your weight')
    parts.push(direction)
  }
  if (daysLogged > 0) parts.push(`logged ${daysLogged} day${daysLogged !== 1 ? 's' : ''}`)
  if (avgProtein)      parts.push(`averaged ${avgProtein}g protein`)
  const headline = parts.length
    ? `You ${parts.join(', ')}.`
    : 'Keep logging to see your weekly recap.'

  return { weightDelta, daysLogged, activitySessions, avgProtein, proteinGoalDays, headline }
}

function computeProjection(logs, goalWeight, goalType = 'lose') {
  const entries = Object.entries(logs)
    .filter(([, v]) => v.weight)
    .sort(([a], [b]) => a.localeCompare(b))
  if (entries.length < 2) return null
  const [firstDate, firstEntry] = entries[0]
  const [lastDate,  lastEntry]  = entries[entries.length - 1]
  const days = (new Date(lastDate) - new Date(firstDate)) / 86400000
  if (days <= 0) return null
  const delta = goalType === 'gain'
    ? parseFloat(lastEntry.weight) - parseFloat(firstEntry.weight)   // gained
    : parseFloat(firstEntry.weight) - parseFloat(lastEntry.weight)   // lost
  if (delta <= 0) return null
  const ratePerDay = delta / days
  const remaining  = goalType === 'gain'
    ? goalWeight - parseFloat(lastEntry.weight)
    : parseFloat(lastEntry.weight) - goalWeight
  if (remaining <= 0) return null
  const daysLeft = Math.round(remaining / ratePerDay)
  const target   = new Date()
  target.setDate(target.getDate() + daysLeft)
  return target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const PULL_THRESHOLD = 62

export default function Dashboard({ logs, userSettings, onNavigate }) {
  const { name, startWeight, goalWeight, height, goalType = 'lose', proteinGoal = null } = userSettings

  // Pull-to-refresh
  const [pullY, setPullY]         = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY               = useRef(0)
  const tip                       = useTip('dashboard')

  function onTouchStart(e) {
    if (window.scrollY <= 0) touchStartY.current = e.touches[0].clientY
  }
  function onTouchMove(e) {
    if (!touchStartY.current) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) setPullY(Math.min(dy * 0.42, PULL_THRESHOLD))
  }
  function onTouchEnd() {
    if (pullY >= PULL_THRESHOLD * 0.85) {
      setRefreshing(true)
      setPullY(PULL_THRESHOLD)
      setTimeout(() => { setRefreshing(false); setPullY(0); touchStartY.current = 0 }, 900)
    } else {
      setPullY(0)
      touchStartY.current = 0
    }
  }
  const { text: insightText } = mockInsight
  const weekLabel = getWeekLabel()

  const {
    avgCalories, avgProtein, totalActivityMin, activityDays,
    lastInjection, latestWeight, prevWeight,
  } = computeWeeklyData(logs)

  const todayLog    = logs[todayISO] || {}
  const hasCalories = !!todayLog.calories
  const hasProtein  = !!todayLog.protein
  const hasActivity = !!todayLog.activityDuration
  const hasInjection = !!todayLog.dose
  const loggedCount = [hasCalories, hasProtein, hasActivity, hasInjection].filter(Boolean).length

  const lastInjectionLabel = lastInjection?.injectionDate
    ? formatDate(lastInjection.injectionDate, { month: 'short', day: 'numeric' })
    : null

  // Direction-aware goal progress
  const goalProgress = latestWeight && startWeight && goalWeight && startWeight !== goalWeight
    ? goalType === 'gain'
      ? Math.min(100, Math.max(0, ((latestWeight - startWeight) / (goalWeight - startWeight)) * 100))
      : Math.min(100, Math.max(0, ((startWeight - latestWeight) / (startWeight - goalWeight)) * 100))
    : null
  const kgToGo = latestWeight
    ? goalType === 'gain'
      ? Math.max(0, goalWeight - latestWeight).toFixed(1)
      : Math.max(0, latestWeight - goalWeight).toFixed(1)
    : null

  // Protein goal progress (optional)
  const proteinPct = proteinGoal && todayLog.protein
    ? Math.min(100, Math.round((todayLog.protein / proteinGoal) * 100))
    : null

  const bmi             = computeBMI(latestWeight, height)
  const projectedDate   = computeProjection(logs, goalWeight, goalType)
  const nextInj         = computeNextInjection(logs, userSettings)
  const weeklySummary   = computeWeeklySummary(logs, goalType, proteinGoal)
  const streak          = computeStreak(logs)
  const sideEffects     = computeSideEffectTrends(logs)
  const doseHistory     = computeDoseHistory(logs)
  const todayWater      = todayLog.water || 0

  return (
    <div className={styles.shell} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div className={styles.pullWrap} style={{ height: refreshing ? PULL_THRESHOLD : pullY, opacity: refreshing ? 1 : pullY / PULL_THRESHOLD }}>
          <svg className={`${styles.pullIcon} ${refreshing ? styles.pullSpin : ''}`} width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M15 9A6 6 0 1 1 9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M9 1l2.5 2L9 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {refreshing && <span className={styles.pullText}>Updated</span>}
        </div>
      )}

      <div className={styles.page}>

        {/* ── Tip banner ──────────────────────────────────────────── */}
        {tip.visible && (
          <TipBanner
            text="Tap + to log today's weight, nutrition, and mood. The more you log, the smarter your insights get."
            onDismiss={tip.dismiss}
          />
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <p className={styles.greeting}>Hey, {name}</p>
              <div className={styles.headerMeta}>
                <p className={styles.weekLabel}>Week of {weekLabel}</p>
                {streak > 0 && (
                  <span className={styles.streakBadge}>
                    {streak} day streak
                  </span>
                )}
              </div>
            </div>
            <button className={styles.avatarBtn} aria-label="Settings">{name[0]}</button>
          </div>
        </header>

        {/* ── Weight hero ─────────────────────────────────────────── */}
        <section className={styles.weightCard}>
          <p className={styles.weightEyebrow}>Current Weight</p>
          <div className={styles.weightRow}>
            <span className={styles.weightValue}>{latestWeight ?? '—'}</span>
            <span className={styles.weightUnit}>kg</span>
          </div>
          {bmi && <p className={styles.bmi}>BMI {bmi}</p>}

          <WeightChange current={latestWeight} previous={prevWeight} goalType={goalType} />

          {goalProgress !== null && (
            <div className={styles.goalWrap}>
              <div className={styles.goalBar}>
                <div className={styles.goalFill} style={{ width: `${goalProgress}%` }} />
              </div>
              <p className={styles.goalLabel}>
                <span className={styles.goalPct}>{Math.round(goalProgress)}%</span>
                {' '}toward {goalWeight} kg goal · {kgToGo} kg to go
              </p>
              {projectedDate && (
                <p className={styles.projection}>At this pace: ~{projectedDate}</p>
              )}
            </div>
          )}
        </section>

        {/* ── Injection countdown ─────────────────────────────────── */}
        {nextInj && (
          <section className={styles.section} style={{ paddingTop: 12 }}>
            <div className={`${styles.injBanner} ${nextInj.daysUntil < 0 ? styles.injBannerOverdue : nextInj.daysUntil === 0 ? styles.injBannerToday : ''}`}>
              <div className={styles.injBannerIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 2.5l2 2-7 7-3 .5.5-3 7-6.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 4.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <div className={styles.injBannerText}>
                <span className={styles.injBannerLabel}>Next injection</span>
                <span className={styles.injBannerValue}>
                  {nextInj.daysUntil === 0
                    ? 'Due today'
                    : nextInj.daysUntil < 0
                    ? `${Math.abs(nextInj.daysUntil)} day${Math.abs(nextInj.daysUntil) !== 1 ? 's' : ''} overdue`
                    : `In ${nextInj.daysUntil} day${nextInj.daysUntil !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── Today ── primary, above weekly ──────────────────────── */}
        <section className={styles.section}>
          <div className={styles.todayCard}>

            <div className={styles.todayCardHeader}>
              <div>
                <h2 className={styles.todayCardTitle}>Today</h2>
                <p className={styles.todayCardDate}>{formatDate(todayISO)}</p>
              </div>
              <span className={`${styles.todayBadge} ${loggedCount === 0 ? styles.todayBadgeEmpty : ''}`}>
                {loggedCount} / 4 logged
              </span>
            </div>

            <div className={styles.todayMetricsGrid}>
              <TodayMetric
                label="Calories"
                primary={Number(todayLog.calories).toLocaleString()}
                secondary="kcal"
                logged={hasCalories}
              />
              <TodayMetric
                label="Protein"
                primary={`${todayLog.protein}g`}
                logged={hasProtein}
              />
              <TodayMetric
                label="Activity"
                primary={todayLog.activityType}
                secondary={`${todayLog.activityDuration} min`}
                logged={hasActivity}
              />
              <TodayMetric
                label="Injection"
                primary={`${Number(todayLog.dose).toFixed(2)} mg`}
                logged={hasInjection}
              />
            </div>

            {todayWater > 0 && (
              <div className={styles.waterRow}>
                <span className={styles.waterRowLabel}>Water today</span>
                <div className={styles.waterDots}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`${styles.waterDot} ${i < todayWater ? styles.waterDotFull : ''}`} />
                  ))}
                </div>
                <span className={styles.waterRowCount}>{todayWater}/8</span>
              </div>
            )}

            {proteinPct !== null && (
              <div className={styles.proteinGoalWrap}>
                <div className={styles.proteinGoalBar}>
                  <div className={styles.proteinGoalFill} style={{ width: `${proteinPct}%` }} />
                </div>
                <p className={styles.proteinGoalText}>
                  <span>{proteinPct}%</span> of protein goal · {todayLog.protein}g / {proteinGoal}g
                </p>
              </div>
            )}

            {todayLog.mood && MOOD_MAP[todayLog.mood] && (
              <div className={styles.todayMoodRow}>
                <span className={styles.todayMoodIcon}>{MOOD_MAP[todayLog.mood].icon}</span>
                <span className={styles.todayMoodText}>Feeling {MOOD_MAP[todayLog.mood].label.toLowerCase()} today</span>
              </div>
            )}

            <button
              data-testid="log-today-btn"
              className={styles.logBtn}
              onClick={() => onNavigate('log')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              {loggedCount > 0 ? 'Update Today' : 'Log Today'}
            </button>
          </div>
        </section>

        {/* ── Weekly summary ───────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryLabel}>This week</span>
              {weeklySummary.weightDelta !== null && (
                <span className={`${styles.summaryDelta} ${
                  (goalType === 'gain' ? weeklySummary.weightDelta > 0 : weeklySummary.weightDelta < 0)
                    ? styles.summaryDeltaGood
                    : weeklySummary.weightDelta === 0
                    ? styles.summaryDeltaNeutral
                    : styles.summaryDeltaBad
                }`}>
                  {weeklySummary.weightDelta > 0 ? '+' : ''}{weeklySummary.weightDelta} kg
                </span>
              )}
            </div>
            <p className={styles.summaryHeadline}>{weeklySummary.headline}</p>
            <div className={styles.summaryStats}>
              {weeklySummary.daysLogged > 0 && (
                <div className={styles.summaryStat}>
                  <span className={styles.summaryStatValue}>{weeklySummary.daysLogged}<span className={styles.summaryStatSub}>/7</span></span>
                  <span className={styles.summaryStatLabel}>Days logged</span>
                </div>
              )}
              {weeklySummary.activitySessions > 0 && (
                <div className={styles.summaryStat}>
                  <span className={styles.summaryStatValue}>{weeklySummary.activitySessions}</span>
                  <span className={styles.summaryStatLabel}>Workouts</span>
                </div>
              )}
              {weeklySummary.avgProtein && (
                <div className={styles.summaryStat}>
                  <span className={styles.summaryStatValue}>{weeklySummary.avgProtein}<span className={styles.summaryStatSub}>g</span></span>
                  <span className={styles.summaryStatLabel}>Avg protein</span>
                </div>
              )}
              {weeklySummary.proteinGoalDays !== null && (
                <div className={styles.summaryStat}>
                  <span className={styles.summaryStatValue}>{weeklySummary.proteinGoalDays}<span className={styles.summaryStatSub}>×</span></span>
                  <span className={styles.summaryStatLabel}>Goal hit</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Side effects ─────────────────────────────────────────── */}
        {sideEffects.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sideEffectsCard}>
              <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>Side effects this week</h2>
              <div className={styles.sideEffectsList}>
                {sideEffects.map(se => {
                  const better = se.thisWeek < se.lastWeek
                  const worse  = se.thisWeek > se.lastWeek
                  return (
                    <div key={se.key} className={styles.sideEffectRow}>
                      <span className={styles.sideEffectName}>{se.label}</span>
                      <div className={styles.sideEffectBar}>
                        <div
                          className={styles.sideEffectFill}
                          style={{ width: `${Math.min(100, se.thisWeek / 7 * 100)}%` }}
                        />
                      </div>
                      <span className={styles.sideEffectCount}>{se.thisWeek}×</span>
                      {se.lastWeek > 0 && (
                        <span className={`${styles.sideEffectTrend} ${better ? styles.trendBetter : worse ? styles.trendWorse : styles.trendSame}`}>
                          {better ? '↓' : worse ? '↑' : '→'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className={styles.sideEffectNote}>Arrows compare to last week. Log side effects in the daily log.</p>
            </div>
          </section>
        )}

        {/* ── Dose history ─────────────────────────────────────────── */}
        {doseHistory.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 10 }}>Dose history</h2>
            <div className={styles.doseHistoryCard}>
              {doseHistory.map((entry, i) => (
                <div key={i} className={styles.doseRow}>
                  <div className={styles.doseDot} />
                  <span className={styles.doseDate}>{formatDate(entry.date, { month: 'short', day: 'numeric' })}</span>
                  <span className={styles.doseMg}>{Number(entry.dose).toFixed(2)} mg</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Weekly average ── secondary, below today ─────────────── */}
        <section className={styles.section}>
          <div className={styles.weeklyHeader}>
            <h2 className={styles.sectionTitle}>Weekly Average</h2>
            <span className={styles.weeklyRange}>{weekLabel}</span>
          </div>
          <div className={styles.snapshotGrid}>
            <SnapshotCard
              label="Avg Calories"
              value={avgCalories?.toLocaleString()}
              sub="kcal / day"
            />
            <SnapshotCard
              label="Avg Protein"
              value={avgProtein ? `${avgProtein}g` : null}
              sub="per day"
            />
            <SnapshotCard
              label="Activity"
              value={totalActivityMin ? `${totalActivityMin} min` : null}
              sub={activityDays ? `${activityDays} days` : 'none logged'}
            />
            <SnapshotCard
              label="Last Injection"
              value={lastInjection ? `${lastInjection.dose}mg` : null}
              sub={lastInjectionLabel}
            />
          </div>
        </section>

        {/* ── Insight teaser ───────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Latest Insight</h2>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a4.5 4.5 0 0 1 1.688 8.67c-.24.098-.438.32-.438.587V11.5a1.25 1.25 0 0 1-2.5 0v-.743c0-.267-.198-.49-.438-.587A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M6.5 13.5h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.insightBody}>
              <p className={styles.insightText}>{insightText}</p>
              <button className={styles.insightLink} onClick={() => onNavigate('insights')}>
                View all insights
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6h7M6.5 3.5 9 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── Bottom nav ───────────────────────────────────────────── */}
        <nav className={styles.bottomNav}>
          {[
            { icon: homeIcon,        label: 'Home',     active: true },
            { icon: chartIcon,       label: 'Charts',   active: false, action: 'charts' },
            { icon: plusIcon,        label: 'Log',      active: false, center: true, action: 'log' },
            { icon: measureIcon,     label: 'Measure',  active: false, action: 'measurements' },
            { icon: settingsIcon,    label: 'Settings', active: false, action: 'settings' },
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
const measureIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="7" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 7V5.5M8 7V5M11 7V5.5M14 7V5M5 13v1.5M8 13v2M11 13v1.5M14 13v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const settingsIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14 14l1.06 1.06M4.93 15.07l1.06-1.06M14 6l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
