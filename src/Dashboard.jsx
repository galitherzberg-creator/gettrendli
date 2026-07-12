import { useState, useRef, useEffect } from 'react'
import { computeWeeklyData, getWeekLabel, todayISO, formatDate, isoDate } from './logStore'
import { T, FONT, Eyebrow, Hairline, Card, BigNumber, TabBar } from './tokens'
import { TrialBanner } from './entitlements'
import WeeklyReport, { currentWeekKey } from './WeeklyReport'

// ── GLP-1 medication library ─────────────────────────────────────────────────
const MEDICATIONS = [
  {
    id: 'wegovy', name: 'Wegovy', molecule: 'Semaglutide', freq: 'Weekly',
    ladder: [
      { label: '0.25', wks: '1–4'   },
      { label: '0.5',  wks: '5–8'   },
      { label: '1.0',  wks: '9–12'  },
      { label: '1.7',  wks: '13–16' },
      { label: '2.4',  wks: '17+'   },
    ],
  },
  {
    id: 'ozempic', name: 'Ozempic', molecule: 'Semaglutide', freq: 'Weekly',
    ladder: [
      { label: '0.25', wks: '1–4'  },
      { label: '0.5',  wks: '5+'   },
      { label: '1.0',  wks: 'opt.' },
      { label: '2.0',  wks: 'max'  },
    ],
  },
  {
    id: 'mounjaro', name: 'Mounjaro', molecule: 'Tirzepatide', freq: 'Weekly',
    ladder: [
      { label: '2.5',  wks: '1–4'   },
      { label: '5',    wks: '5–8'   },
      { label: '7.5',  wks: '9–12'  },
      { label: '10',   wks: '13–16' },
      { label: '12.5', wks: '17–20' },
      { label: '15',   wks: '21+'   },
    ],
  },
  {
    id: 'zepbound', name: 'Zepbound', molecule: 'Tirzepatide', freq: 'Weekly',
    ladder: [
      { label: '2.5',  wks: '1–4'   },
      { label: '5',    wks: '5–8'   },
      { label: '7.5',  wks: '9–12'  },
      { label: '10',   wks: '13–16' },
      { label: '12.5', wks: '17–20' },
      { label: '15',   wks: '21+'   },
    ],
  },
  {
    id: 'saxenda', name: 'Saxenda', molecule: 'Liraglutide', freq: 'Daily',
    ladder: [
      { label: '0.6', wks: 'wk 1' },
      { label: '1.2', wks: 'wk 2' },
      { label: '1.8', wks: 'wk 3' },
      { label: '2.4', wks: 'wk 4' },
      { label: '3.0', wks: 'wk 5+'},
    ],
  },
  {
    id: 'trulicity', name: 'Trulicity', molecule: 'Dulaglutide', freq: 'Weekly',
    ladder: [
      { label: '0.75', wks: 'start'  },
      { label: '1.5',  wks: 'maint.' },
      { label: '3.0',  wks: 'step 3' },
      { label: '4.5',  wks: 'max'    },
    ],
  },
  {
    id: 'victoza', name: 'Victoza', molecule: 'Liraglutide', freq: 'Daily',
    ladder: [
      { label: '0.6', wks: 'wk 1'   },
      { label: '1.2', wks: 'maint.' },
      { label: '1.8', wks: 'max'    },
    ],
  },
  {
    id: 'custom', name: 'Custom', molecule: 'Manual', freq: null,
    ladder: [],  // user-defined steps
  },
]

// ── Computation helpers ───────────────────────────────────────────────────────

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
    label: se.charAt(0).toUpperCase() + se.slice(1).replace('-', ' '),
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

function computeProtocol(logs) {
  const injections = Object.values(logs)
    .filter(e => e.injectionDate && e.dose)
    .sort((a, b) => a.injectionDate.localeCompare(b.injectionDate))
  if (!injections.length) return { weeksOn: null }
  const firstDate = injections[0].injectionDate
  const days      = Math.floor((new Date(todayISO + 'T12:00:00') - new Date(firstDate + 'T12:00:00')) / 86400000)
  const weeksOn   = Math.max(1, Math.ceil((days + 1) / 7))
  return { weeksOn }
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
  const thisWeek = []
  for (let i = 0; i <= 6; i++) {
    const d = isoDate(i)
    if (logs[d]) thisWeek.push({ ...logs[d], date: d })
  }
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

  const daysLogged       = thisWeek.filter(e => e.calories || e.protein || e.weight || e.activityDuration).length
  const activitySessions = thisWeek.filter(e => e.activityDuration).length
  const proteinEntries   = thisWeek.filter(e => e.protein)
  const avgProtein       = proteinEntries.length
    ? Math.round(proteinEntries.reduce((s, e) => s + parseFloat(e.protein), 0) / proteinEntries.length)
    : null
  const proteinGoalDays  = proteinGoal && proteinEntries.length
    ? proteinEntries.filter(e => parseFloat(e.protein) >= proteinGoal).length
    : null

  const parts = []
  if (weightDelta !== null) {
    const direction = goalType === 'gain'
      ? (weightDelta > 0 ? `gained ${weightDelta} kg` : weightDelta < 0 ? `lost ${Math.abs(weightDelta)} kg` : 'maintained your weight')
      : (weightDelta < 0 ? `lost ${Math.abs(weightDelta)} kg` : weightDelta > 0 ? `gained ${weightDelta} kg` : 'maintained your weight')
    parts.push(direction)
  }
  if (daysLogged > 0) parts.push(`logged ${daysLogged} day${daysLogged !== 1 ? 's' : ''}`)
  if (avgProtein)     parts.push(`averaged ${avgProtein}g protein`)
  const headline = parts.length ? `You ${parts.join(', ')}.` : 'Keep logging to see your weekly recap.'

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
    ? parseFloat(lastEntry.weight) - parseFloat(firstEntry.weight)
    : parseFloat(firstEntry.weight) - parseFloat(lastEntry.weight)
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

// ── Component ────────────────────────────────────────────────────────────────

const PULL_THRESHOLD = 62

export default function Dashboard({ logs, userSettings, onNavigate, updateLog, onSaveSettings, entitlements, onUpgrade }) {
  const { name, startWeight, goalWeight, height, goalType = 'lose', proteinGoal = null, unitSystem = 'metric' } = userSettings

  // ── Unit helpers (weights stored in kg, display in lbs when US) ───────────
  const isMetric = unitSystem !== 'us'
  const wUnit    = isMetric ? 'kg' : 'lb'
  function wFmt(kg, dec = 1) {
    if (kg == null) return null
    const v = isMetric ? parseFloat(kg) : parseFloat(kg) * 2.2046
    return v.toFixed(dec)
  }

  const [pullY, setPullY]           = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY                 = useRef(0)

  // Protocol — user-controlled, nothing auto-detected
  const [protocolMed,  setProtocolMed]  = useState(() => {
    try { return localStorage.getItem('gt_protocol_med') || '' } catch { return '' }
  })
  const [protocolStep, setProtocolStep] = useState(() => {
    try { const s = localStorage.getItem('gt_protocol_step'); return s !== null ? parseInt(s, 10) : -1 } catch { return -1 }
  })
  // Custom dose steps, keyed by medication id — lets someone on a named drug
  // (e.g. Mounjaro) add an off-ladder dose like a 1mg microdose, while the
  // "Custom" medication keeps its own from-scratch list under its own key.
  const [customStepsByMed, setCustomStepsByMed] = useState(() => {
    try {
      const byMed = JSON.parse(localStorage.getItem('gt_protocol_custom_by_med') || 'null')
      if (byMed) return byMed
      // One-time migration from the old single-list format (was 'custom'-med only).
      const legacy = JSON.parse(localStorage.getItem('gt_protocol_custom') || '[]')
      return legacy.length ? { custom: legacy } : {}
    } catch { return {} }
  })
  const [customInput,     setCustomInput]     = useState('')
  const [addDoseOpen,     setAddDoseOpen]     = useState(false)

  function saveCustomStepsByMed(next) {
    setCustomStepsByMed(next)
    try { localStorage.setItem('gt_protocol_custom_by_med', JSON.stringify(next)) } catch {}
  }

  function changeMed(id) {
    setProtocolMed(id)
    setProtocolStep(-1)
    setAddDoseOpen(false)
    try { localStorage.setItem('gt_protocol_med', id); localStorage.setItem('gt_protocol_step', '-1') } catch {}
  }
  function setStep(idx) {
    const next = protocolStep === idx ? -1 : idx
    setProtocolStep(next)
    try { localStorage.setItem('gt_protocol_step', String(next)) } catch {}
  }
  function addCustomStep() {
    const val = parseFloat(customInput)
    if (isNaN(val) || val <= 0 || !protocolMed) return
    const label = String(parseFloat(val.toFixed(2))).replace(/\.?0+$/, '') || String(val)
    const presetLabels = protocolMed === 'custom' ? [] : (MEDICATIONS.find(m => m.id === protocolMed)?.ladder ?? []).map(s => s.label)
    const current = customStepsByMed[protocolMed] || []
    const next = [...current, { label, wks: '' }]
      .sort((a, b) => parseFloat(a.label) - parseFloat(b.label))
      .filter((s, i, arr) => arr.findIndex(x => x.label === s.label) === i)  // dedup within custom
      .filter(s => !presetLabels.includes(s.label))                          // don't duplicate a preset step
    saveCustomStepsByMed({ ...customStepsByMed, [protocolMed]: next })
    setProtocolStep(-1); setCustomInput(''); setAddDoseOpen(false)
    try { localStorage.setItem('gt_protocol_step', '-1') } catch {}
  }
  function removeCustomStep(idx) {
    const current = customStepsByMed[protocolMed] || []
    const next = current.filter((_, i) => i !== idx)
    saveCustomStepsByMed({ ...customStepsByMed, [protocolMed]: next })
    setProtocolStep(-1)
    try { localStorage.setItem('gt_protocol_step', '-1') } catch {}
  }

  // Active ladder = medication preset merged with any custom doses added for
  // it (e.g. a microdose below the standard starting step), or a from-scratch
  // custom list when medication is "Custom".
  const activeMedObj  = MEDICATIONS.find(m => m.id === protocolMed)
  const customSteps   = customStepsByMed[protocolMed] || []
  const activeLadder  = protocolMed === 'custom'
    ? customSteps
    : [...(activeMedObj?.ladder ?? []).map(s => ({ ...s, custom: false })), ...customSteps.map(s => ({ ...s, custom: true }))]
        .sort((a, b) => parseFloat(a.label) - parseFloat(b.label))

  // Injection inline edit
  const [injOpen,     setInjOpen]     = useState(false)
  const [injDate,     setInjDate]     = useState(todayISO)
  const [injDose,     setInjDose]     = useState('')

  function openInjEdit() {
    // Log a taken injection. Pre-fill date with today and dose with the
    // projected next dose (same as last time, or the manual override).
    setInjDate(todayISO)
    setInjDose(projectedDose != null ? String(projectedDose) : '')
    setInjOpen(true)
  }

  function saveInjection() {
    if (!injDate) return
    const dose = parseFloat(injDose) || null
    updateLog(injDate, { ...(logs[injDate] || {}), injectionDate: injDate, dose })
    // A logged injection consumes any manual next-dose override — future
    // projections follow this newly logged dose.
    if (onSaveSettings) onSaveSettings(prev => ({ ...prev, nextDoseOverride: null }))
    setInjOpen(false)
  }

  // Manual override for the projected NEXT dose (separate from logging a shot).
  const [nextDoseOpen, setNextDoseOpen] = useState(false)
  const [nextDoseVal,  setNextDoseVal]  = useState('')

  function openNextDoseEdit() {
    setNextDoseVal(projectedDose != null ? String(projectedDose) : '')
    setNextDoseOpen(true)
  }

  function saveNextDose() {
    const val = parseFloat(nextDoseVal)
    if (onSaveSettings) {
      onSaveSettings(prev => ({ ...prev, nextDoseOverride: Number.isFinite(val) ? val : null }))
    }
    setNextDoseOpen(false)
  }

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

  const { avgCalories, avgProtein: weeklyAvgProt, totalActivityMin, activityDays, lastInjection, latestWeight, prevWeight } = computeWeeklyData(logs)

  const todayLog      = logs[todayISO] || {}
  const hasCalories    = !!todayLog.calories
  const hasProtein     = !!todayLog.protein
  const hasActivity    = !!todayLog.activityDuration
  const hasInjection   = !!todayLog.dose
  const hasMood        = !!todayLog.mood
  const hasSideEffects = (todayLog.sideEffects?.length ?? 0) > 0
  const todayWater    = todayLog.water || 0
  const hasWater      = todayWater > 0
  const loggedCount   = [!!todayLog.weight, hasProtein, hasWater, hasSideEffects, hasMood].filter(Boolean).length

  // Goal progress
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

  const proteinPct    = proteinGoal && todayLog.protein
    ? Math.min(100, Math.round((todayLog.protein / proteinGoal) * 100))
    : null

  const streak        = computeStreak(logs)
  const nextInj       = computeNextInjection(logs, userSettings)
  const weeklySummary = computeWeeklySummary(logs, goalType, proteinGoal)
  const sideEffects   = computeSideEffectTrends(logs)
  const doseHistory   = computeDoseHistory(logs)
  // Projected next dose: default to the SAME dose as the last real injection,
  // unless the user has manually set an override for the next shot.
  const lastRealDose  = doseHistory[0]?.dose ?? null
  const projectedDose = userSettings.nextDoseOverride ?? lastRealDose
  const projectedDate = computeProjection(logs, goalWeight, goalType)
  const protocolData  = computeProtocol(logs)

  // ── Weekly report: auto-pop once per week, when there's data worth recapping ──
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const thisWeekKey = currentWeekKey()
  useEffect(() => {
    const alreadyShown = userSettings.lastWeeklyReportWeek === thisWeekKey
    const hasData = (weeklySummary?.daysLogged ?? 0) > 0
    if (!alreadyShown && hasData) setWeeklyOpen(true)
  }, [thisWeekKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeWeeklyReport() {
    setWeeklyOpen(false)
    if (onSaveSettings) onSaveSettings(prev => ({ ...prev, lastWeeklyReportWeek: thisWeekKey }))
  }

  // Today's date display
  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const firstName    = name ? name.split(' ')[0] : 'there'

  // Inline today log rows — matches design: Weight / Protein / Water / Side effects / Mood
  const moodLabel = todayLog.mood
    ? todayLog.mood.charAt(0).toUpperCase() + todayLog.mood.slice(1)
    : 'Log now'
  const sideEffectsLabel = hasSideEffects
    ? todayLog.sideEffects.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')).join(', ')
    : 'Log now'
  const todayRows = [
    { label: 'Weight',       val: todayLog.weight ? `${wFmt(todayLog.weight)} ${wUnit}` : 'Log now', done: !!todayLog.weight },
    { label: 'Protein',      val: hasProtein       ? `${todayLog.protein} g`             : 'Log now', done: hasProtein },
    { label: 'Water',        val: hasWater         ? `${todayWater} cup${todayWater !== 1 ? 's' : ''}` : 'Log now', done: hasWater },
    { label: 'Side effects', val: sideEffectsLabel, done: hasSideEffects },
    { label: 'Mood',         val: moodLabel,        done: hasMood },
  ]

  return (
    <div
      style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <WeeklyReport
        open={weeklyOpen}
        onClose={closeWeeklyReport}
        firstName={firstName}
        weeklySummary={weeklySummary}
        sideEffects={sideEffects}
        streak={streak}
        nextInj={nextInj}
        projectedDose={projectedDose}
        goalType={goalType}
      />

      {/* Pull refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div style={{
          height: refreshing ? PULL_THRESHOLD : pullY,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: refreshing ? 1 : pullY / PULL_THRESHOLD,
          overflow: 'hidden', transition: refreshing ? 'none' : 'opacity 0.1s',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
            <path d="M15 9A6 6 0 1 1 9 3" stroke={T.accent} strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M9 1l2.5 2L9 5" stroke={T.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {refreshing && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mute, letterSpacing: '0.1em' }}>UPDATED</span>}
        </div>
      )}

      <div style={{ maxWidth: 430, margin: '0 auto', paddingBottom: 100 }}>

        {/* ── Trial / upgrade banner ───────────────────────────────── */}
        <TrialBanner entitlements={entitlements} onUpgrade={onUpgrade} />

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px' }}>
          <div>
            <Eyebrow>{todayDisplay}</Eyebrow>
            <div style={{ fontFamily: FONT.ui, fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4 }}>
              Morning, {firstName}.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setWeeklyOpen(true)}
              title="Weekly recap"
              style={{
                width: 36, height: 36, borderRadius: 18,
                border: `1px solid ${T.hair}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'transparent', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>
              </svg>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              style={{
                width: 36, height: 36, borderRadius: 18,
                border: `1px solid ${T.hair}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'transparent', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── HERO — black weight card ──────────────────────────────── */}
        <div style={{ padding: '0 16px' }}>
          <Card inverted padding={0} radius={20} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Eyebrow color="#7a7a7a">Current Weight</Eyebrow>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: '#7a7a7a', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Today
                </span>
              </div>
              {(() => {
                const displayW = latestWeight ? wFmt(latestWeight) : '—'
                const sinceW1  = latestWeight && startWeight
                  ? parseFloat(wFmt(latestWeight)) - parseFloat(wFmt(startWeight))
                  : null
                return (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <BigNumber value={displayW} unit={wUnit} size={80} color={T.inkText} />
                    {sinceW1 !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: '#a0a0a0', letterSpacing: '0.08em' }}>
                          {sinceW1 > 0 ? '+' : ''}{sinceW1.toFixed(1)} {wUnit}
                        </div>
                        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: '#7a7a7a', marginTop: 4 }}>since week 1</div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Sparkline */}
            <div style={{ padding: '6px 24px 22px' }}>
              <svg width="100%" height="48" viewBox="0 0 320 48" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={T.accent} stopOpacity="0.45"/>
                    <stop offset="1" stopColor={T.accent} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {(() => {
                  // Build sparkline from last 9 weight entries
                  const weightEntries = Object.entries(logs)
                    .filter(([, v]) => v.weight)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-9)
                  if (weightEntries.length < 2) {
                    // fallback flat line
                    return (
                      <>
                        <path d="M0,24 L320,24 L320,48 L0,48 Z" fill="url(#sparkFade)" opacity="0.3" />
                        <path d="M0,24 L320,24" fill="none" stroke={T.accent} strokeWidth="1.7" strokeLinecap="round"/>
                      </>
                    )
                  }
                  const vals = weightEntries.map(([, v]) => parseFloat(v.weight))
                  const minV = Math.min(...vals), maxV = Math.max(...vals)
                  const range = maxV - minV || 1
                  const pts = vals.map((v, i) => {
                    const x = (i / (vals.length - 1)) * 320
                    const y = 4 + ((maxV - v) / range) * 38
                    return { x, y }
                  })
                  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                  const fill = line + ` L${pts[pts.length-1].x},48 L0,48 Z`
                  return (
                    <>
                      <path d={fill} fill="url(#sparkFade)" />
                      <path d={line} fill="none" stroke={T.accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y}
                          r={i === pts.length - 1 ? 4 : 2}
                          fill={T.accent}
                          stroke={i === pts.length - 1 ? '#fff' : 'none'}
                          strokeWidth={i === pts.length - 1 ? 1.5 : 0}
                        />
                      ))}
                    </>
                  )
                })()}
              </svg>
            </div>
          </Card>
        </div>

        {/* ── GOAL PROGRESS ────────────────────────────────────────── */}
        {goalProgress !== null && (
          <div style={{ padding: '20px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Eyebrow>Goal Progress</Eyebrow>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: T.text, letterSpacing: '0.08em' }}>
                <span style={{ fontWeight: 600 }}>{Math.round(goalProgress)}%</span>
                <span style={{ color: T.faint }}> / 100</span>
              </div>
            </div>
            <div style={{ position: 'relative', marginTop: 12, height: 8 }}>
              <div style={{ position: 'absolute', inset: 0, background: T.hair, borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${goalProgress}%`, background: T.accent, borderRadius: 4 }} />
              <div style={{ position: 'absolute', right: 0, top: -4, width: 1, height: 16, background: T.ink }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.06em' }}>
              <span>{wFmt(startWeight, 0)} START</span>
              <span style={{ color: T.text, fontWeight: 600 }}>{wFmt(latestWeight) ?? '—'} NOW</span>
              <span>{wFmt(goalWeight, 0)} GOAL</span>
            </div>
            {kgToGo > 0 && (
              <div style={{ fontFamily: FONT.ui, fontSize: 12, color: T.mute, marginTop: 6 }}>
                {wFmt(kgToGo)} {wUnit} to go{projectedDate ? ` · on track for ${projectedDate}` : ''}
              </div>
            )}
          </div>
        )}

        {/* ── INJECTION COUNTDOWN + STREAK ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 10, padding: '22px 16px 0' }}>

          {/* Injection countdown */}
          <Card padding={0} radius={14} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow>Next Injection</Eyebrow>
              <button
                onClick={openInjEdit}
                style={{
                  background: 'transparent', border: `1px solid ${T.hair}`, borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer',
                  fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.10em',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M2 9.5l1.5-.3 5.5-5.5-1.2-1.2L2.3 8 2 9.5Z"/>
                </svg>
                EDIT
              </button>
            </div>

            {/* Inline edit panel */}
            {injOpen && (
              <div style={{ padding: '10px 16px 14px', background: T.surf2, borderTop: `1px solid ${T.hair}` }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>DATE</div>
                    <input
                      type="date"
                      value={injDate}
                      max={todayISO}
                      onChange={e => setInjDate(e.target.value)}
                      style={{
                        width: '100%', border: `1px solid ${T.hair}`, borderRadius: 8,
                        padding: '7px 10px', fontFamily: FONT.ui, fontSize: 13,
                        background: T.card, outline: 'none', boxSizing: 'border-box',
                        color: T.text,
                      }}
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>DOSE (MG)</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.25"
                      value={injDose}
                      onChange={e => setInjDose(e.target.value)}
                      placeholder="1.0"
                      style={{
                        width: '100%', border: `1px solid ${T.hair}`, borderRadius: 8,
                        padding: '7px 10px', fontFamily: FONT.ui, fontSize: 13,
                        background: T.card, outline: 'none', boxSizing: 'border-box',
                        color: T.text,
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setInjOpen(false)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    border: `1px solid ${T.hair}`, background: 'transparent', cursor: 'pointer',
                    fontFamily: FONT.ui, fontSize: 13, color: T.mute,
                  }}>Cancel</button>
                  <button onClick={saveInjection} style={{
                    flex: 2, padding: '9px 0', borderRadius: 10,
                    border: 0, background: T.ink, cursor: 'pointer',
                    fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.inkText,
                  }}>Save injection</button>
                </div>
              </div>
            )}

            {nextInj ? (
              <>
                <div style={{ padding: '6px 16px 14px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <BigNumber value={Math.max(0, nextInj.daysUntil)} unit="d" size={44} italic={false} />
                  {nextInj.daysUntil < 0 && (
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: '#C0392B', letterSpacing: '0.08em' }}>OVERDUE</span>
                  )}
                </div>
                <Hairline />
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 500 }}>
                      {projectedDose != null ? `${projectedDose} mg` : 'Set dose'}
                      {userSettings.nextDoseOverride != null && (
                        <span style={{ fontFamily: FONT.mono, fontSize: 8, color: T.accent, letterSpacing: '0.08em', marginLeft: 6 }}>ADJUSTED</span>
                      )}
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.08em', marginTop: 2 }}>
                      {nextInj.nextDate}
                    </div>
                  </div>
                  <button onClick={openNextDoseEdit} style={{
                    padding: '5px 10px', borderRadius: 8, border: `1px solid ${T.hair}`,
                    background: 'transparent', cursor: 'pointer',
                    fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', color: T.mute,
                  }}>CHANGE DOSE</button>
                </div>
                {nextDoseOpen && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>
                      PLANNED NEXT DOSE (MG)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        value={nextDoseVal}
                        onChange={e => setNextDoseVal(e.target.value)}
                        placeholder={lastRealDose != null ? String(lastRealDose) : '1.0'}
                        style={{
                          flex: 1, border: `1px solid ${T.hair}`, borderRadius: 8,
                          padding: '7px 10px', fontFamily: FONT.ui, fontSize: 13,
                          background: T.card, outline: 'none', boxSizing: 'border-box', color: T.text,
                        }}
                      />
                      <button onClick={() => setNextDoseOpen(false)} style={{
                        padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.hair}`,
                        background: 'transparent', cursor: 'pointer', fontFamily: FONT.ui, fontSize: 13, color: T.mute,
                      }}>Cancel</button>
                      <button onClick={saveNextDose} style={{
                        padding: '7px 14px', borderRadius: 8, border: 0, background: T.ink, cursor: 'pointer',
                        fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.inkText,
                      }}>Save</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '10px 16px 16px' }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute }}>Tap EDIT to log your first injection</div>
              </div>
            )}
          </Card>

          {/* Streak */}
          <Card padding={16} radius={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Eyebrow>Streak</Eyebrow>
            </div>
            <div style={{ marginTop: 6 }}>
              <BigNumber value={streak} unit="d" size={44} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['M','T','W','T','F','S','S'].map((d, i) => {
                const done = i < Math.min(streak, 7)
                const today = i === new Date().getDay() - 1
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: done ? T.accent : 'transparent',
                      border: done ? 'none' : `1px solid ${T.hair2}`,
                      outline: today ? `2px solid ${T.accent}` : 'none',
                      outlineOffset: today ? 2 : 0,
                    }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 8, color: T.faint, letterSpacing: '0.05em' }}>{d}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── TODAY'S LOG ──────────────────────────────────────────── */}
        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ padding: '0 6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Eyebrow>Today's Log</Eyebrow>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.08em' }}>
              {loggedCount} / {todayRows.length} LOGGED
            </span>
          </div>
          <Card padding={0} radius={14}>
            {todayRows.map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                borderBottom: i === todayRows.length - 1 ? 'none' : `1px solid ${T.hair}`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  border: row.done ? 'none' : `1px solid ${T.hair2}`,
                  background: row.done ? T.ink : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: 12, flexShrink: 0,
                }}>
                  {row.done && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={T.inkText} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6.5L5 9.5l5-7"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{row.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 13,
                    fontWeight: row.done ? 500 : 400,
                    color: row.done ? T.text : T.mute,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{row.val}</div>
                </div>
              </div>
            ))}

            {/* Water dots */}
            {todayWater > 0 && (
              <div style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                borderTop: `1px solid ${T.hair}`,
              }}>
                <Eyebrow style={{ fontSize: 9 }}>Water</Eyebrow>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: i < todayWater ? T.accent : T.hair,
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.06em' }}>{todayWater}/8</span>
              </div>
            )}

            {/* Protein goal bar */}
            {proteinPct !== null && (
              <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${T.hair}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Eyebrow style={{ fontSize: 9 }}>Protein goal</Eyebrow>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>
                    {todayLog.protein}g / {proteinGoal}g · {proteinPct}%
                  </span>
                </div>
                <div style={{ height: 4, background: T.hair, borderRadius: 2, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${proteinPct}%`, background: T.accent, borderRadius: 2 }} />
                </div>
              </div>
            )}

            {/* Log button */}
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
              <button
                onClick={() => onNavigate('log')}
                style={{
                  flex: 1, height: 48, borderRadius: 12, border: 0,
                  background: T.ink, color: T.inkText, cursor: 'pointer',
                  fontFamily: FONT.ui, fontSize: 14, fontWeight: 600,
                  letterSpacing: '-0.01em', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {loggedCount > 0 ? 'Update today' : 'Log today'}
              </button>
              {/* Past-day shortcut */}
              <button
                onClick={() => onNavigate('log')}
                title="Log a past day"
                style={{
                  width: 48, height: 48, borderRadius: 12, marginTop: 4,
                  border: `1px solid ${T.hair}`, background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.mute} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                  <path d="M8 14h4M8 18h6"/>
                </svg>
              </button>
            </div>
          </Card>
        </div>

        {/* ── WEEKLY SUMMARY ───────────────────────────────────────── */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ padding: '0 6px 10px' }}>
            <Eyebrow>This week</Eyebrow>
          </div>
          <Card padding={20} radius={14}>
            <p style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.01em', color: T.text, marginBottom: 16 }}>
              {weeklySummary.headline}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[
                { v: weeklySummary.daysLogged, sub: '/7', label: 'Days logged' },
                { v: weeklySummary.activitySessions, sub: '', label: 'Workouts' },
                { v: weeklySummary.avgProtein, sub: 'g', label: 'Avg protein' },
                { v: weeklySummary.proteinGoalDays, sub: '×', label: 'Goal hit' },
              ].filter(s => s.v !== null && s.v !== undefined && s.v > 0).map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 24, letterSpacing: '-0.01em' }}>
                    {s.v}<span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, fontStyle: 'normal' }}>{s.sub}</span>
                  </div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em', marginTop: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── SIDE EFFECTS ─────────────────────────────────────────── */}
        {sideEffects.length > 0 && (
          <div style={{ padding: '18px 16px 0' }}>
            <div style={{ padding: '0 6px 10px' }}><Eyebrow>Side effects this week</Eyebrow></div>
            <Card padding={16} radius={14}>
              {sideEffects.map(se => (
                <div key={se.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, fontWeight: 500 }}>{se.label}</div>
                  <div style={{ width: 80, height: 4, background: T.hair, borderRadius: 2, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, se.thisWeek / 7 * 100)}%`, background: T.ink, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, width: 20, textAlign: 'right' }}>{se.thisWeek}×</span>
                  {se.lastWeek > 0 && (
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: se.thisWeek < se.lastWeek ? T.accentDark : se.thisWeek > se.lastWeek ? '#C0392B' : T.mute }}>
                      {se.thisWeek < se.lastWeek ? '↓' : se.thisWeek > se.lastWeek ? '↑' : '→'}
                    </span>
                  )}
                </div>
              ))}
              <p style={{ fontFamily: FONT.ui, fontSize: 11, color: T.mute, marginTop: 4 }}>
                Arrows compare to last week.
              </p>
            </Card>
          </div>
        )}

        {/* ── PROTOCOL PROGRESS ────────────────────────────────────── */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ padding: '0 6px 10px' }}><Eyebrow>Protocol progress</Eyebrow></div>
          <Card padding={20} radius={14}>

            {/* ── Medication selector ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.mute, letterSpacing: '0.12em', marginBottom: 10 }}>
                MY MEDICATION
              </div>
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto',
                paddingBottom: 4, scrollbarWidth: 'none',
              }}>
                {MEDICATIONS.map(med => {
                  const active = protocolMed === med.id
                  return (
                    <button
                      key={med.id}
                      onClick={() => changeMed(med.id)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px', borderRadius: 20,
                        border: active ? 'none' : `1px solid ${T.hair}`,
                        background: active ? T.ink : T.surf2,
                        cursor: 'pointer',
                        fontFamily: FONT.ui, fontSize: 12, fontWeight: active ? 600 : 400,
                        color: active ? T.inkText : T.text,
                        letterSpacing: '-0.01em',
                        transition: 'all 0.12s',
                      }}
                    >
                      {med.name}
                    </button>
                  )
                })}
              </div>
              {activeMedObj && activeMedObj.id !== 'custom' && (
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em', marginTop: 8 }}>
                  {activeMedObj.molecule} · {activeMedObj.freq}
                </div>
              )}
            </div>

            {/* ── No medication chosen yet ── */}
            {!protocolMed && (
              <div style={{
                padding: '18px 0 8px', textAlign: 'center',
                fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.5,
              }}>
                Choose your medication above to see<br/>the dose escalation schedule.
              </div>
            )}

            {/* ── Custom step builder ── */}
            {protocolMed === 'custom' && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.mute, letterSpacing: '0.12em', marginBottom: 10 }}>
                  MY DOSE STEPS (MG)
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomStep()}
                    placeholder="e.g. 2.5"
                    style={{
                      flex: 1, border: `1px solid ${T.hair}`, borderRadius: 10,
                      padding: '9px 12px', fontFamily: FONT.ui, fontSize: 13,
                      background: T.card, outline: 'none', color: T.text,
                    }}
                  />
                  <button
                    onClick={addCustomStep}
                    style={{
                      width: 44, height: 44, borderRadius: 10, border: 0,
                      background: T.ink, color: T.inkText, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}
                  >+</button>
                </div>
                {customSteps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {customSteps.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px 4px 12px', borderRadius: 20,
                        background: T.surf2, border: `1px solid ${T.hair}`,
                      }}>
                        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.text }}>{s.label} mg</span>
                        <button
                          onClick={() => removeCustomStep(i)}
                          style={{
                            background: 'transparent', border: 0, padding: 0,
                            cursor: 'pointer', color: T.mute, fontSize: 14, lineHeight: 1,
                            display: 'flex', alignItems: 'center',
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                {customSteps.length === 0 && (
                  <div style={{ fontFamily: FONT.ui, fontSize: 12, color: T.mute }}>
                    Add your dose steps above.
                  </div>
                )}
              </div>
            )}

            {/* ── Ladder: week counter + current dose ── */}
            {protocolMed && activeLadder.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>
                      WEEK ON PROTOCOL
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 40, color: T.text, lineHeight: 1 }}>
                        {protocolData.weeksOn ?? '—'}
                      </span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute }}>WK</span>
                    </div>
                  </div>
                  {protocolStep >= 0 && protocolStep < activeLadder.length && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>
                        MY DOSE
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                        <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 40, color: T.accent, lineHeight: 1 }}>
                          {activeLadder[protocolStep].label}
                        </span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.accentDark }}>mg</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dose escalation ladder — tap to set your position */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.mute, letterSpacing: '0.12em' }}>
                      TAP YOUR CURRENT DOSE
                    </div>
                    {protocolStep >= 0 && (
                      <button
                        onClick={() => setStep(-1)}
                        style={{
                          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                          fontFamily: FONT.mono, fontSize: 7.5, color: T.faint, letterSpacing: '0.08em',
                        }}
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Circles + connectors */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {activeLadder.flatMap((step, i) => {
                      const past   = i < protocolStep
                      const active = i === protocolStep
                      const nodes  = []
                      nodes.push(
                        <button
                          key={`dot-${i}`}
                          onClick={() => setStep(i)}
                          style={{
                            width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                            background: active ? T.ink : past ? T.accentSoft : T.surf2,
                            border: active ? `2px solid ${T.ink}` : `1px solid ${past ? T.accentHair : T.hair}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: active ? `0 0 0 3px ${T.accentSoft}` : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          {past ? (
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                              <path d="M2.5 6.5l3 3 5-5" stroke={T.accentDark} strokeWidth="1.7"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span style={{
                              fontFamily: FONT.mono,
                              fontSize: active ? 9 : 7.5,
                              color: active ? T.inkText : T.faint,
                              fontWeight: active ? 700 : 400,
                              letterSpacing: '-0.01em',
                            }}>
                              {step.label}
                            </span>
                          )}
                        </button>
                      )
                      if (i < activeLadder.length - 1) {
                        nodes.push(
                          <div key={`line-${i}`} style={{
                            flex: 1, height: 2,
                            background: i < protocolStep ? T.accent : T.hair,
                            transition: 'background 0.15s',
                          }} />
                        )
                      }
                      return nodes
                    })}
                  </div>

                  {/* Labels below circles */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 6 }}>
                    {activeLadder.flatMap((step, i) => {
                      const active = i === protocolStep
                      const nodes  = []
                      nodes.push(
                        <div key={`lbl-${i}`} style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontFamily: FONT.mono, fontSize: 7, color: active ? T.text : T.faint, fontWeight: active ? 700 : 400 }}>
                            {step.label}mg
                          </span>
                          {step.wks ? (
                            <span style={{ fontFamily: FONT.mono, fontSize: 6, color: T.faint }}>
                              wk{step.wks}
                            </span>
                          ) : step.custom ? (
                            <span style={{ fontFamily: FONT.mono, fontSize: 6, color: T.accentDark }}>
                              own
                            </span>
                          ) : null}
                        </div>
                      )
                      if (i < activeLadder.length - 1) nodes.push(<div key={`sp-${i}`} style={{ flex: 1 }} />)
                      return nodes
                    })}
                  </div>
                </div>

                {/* Next step hint */}
                {protocolStep >= 0 && protocolStep < activeLadder.length - 1 && (
                  <div style={{
                    marginTop: 14, padding: '9px 12px', borderRadius: 10,
                    background: T.accentSoft,
                    fontFamily: FONT.ui, fontSize: 11, color: T.accentDark, lineHeight: 1.45,
                  }}>
                    Next step: <strong>{activeLadder[protocolStep + 1].label} mg</strong> — discuss timing with your prescriber.
                  </div>
                )}
                {protocolStep >= 0 && protocolStep === activeLadder.length - 1 && (
                  <div style={{
                    marginTop: 14, padding: '9px 12px', borderRadius: 10,
                    background: T.accentSoft,
                    fontFamily: FONT.ui, fontSize: 11, color: T.accentDark, lineHeight: 1.45,
                  }}>
                    🎯 Maintenance dose — great work staying consistent.
                  </div>
                )}
              </>
            )}

            {/* ── Custom / micro dose (named medications) ──────────────── */}
            {protocolMed && protocolMed !== 'custom' && activeMedObj && (
              <div style={{ marginTop: 16 }}>
                {!addDoseOpen ? (
                  <button
                    type="button"
                    onClick={() => setAddDoseOpen(true)}
                    style={{
                      background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontFamily: FONT.ui, fontSize: 12, fontWeight: 600,
                      color: T.accentDark, letterSpacing: '-0.01em',
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
                    Add a custom dose (e.g. microdosing)
                  </button>
                ) : (
                  <>
                    <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.mute, letterSpacing: '0.12em', marginBottom: 8 }}>
                      CUSTOM DOSE (MG)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCustomStep()}
                        placeholder="e.g. 1"
                        autoFocus
                        style={{
                          flex: 1, border: `1px solid ${T.hair}`, borderRadius: 10,
                          padding: '9px 12px', fontFamily: FONT.ui, fontSize: 13,
                          background: T.card, outline: 'none', color: T.text,
                        }}
                      />
                      <button
                        onClick={addCustomStep}
                        style={{
                          width: 44, height: 44, borderRadius: 10, border: 0,
                          background: T.ink, color: T.inkText, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}
                      >+</button>
                      <button
                        onClick={() => { setAddDoseOpen(false); setCustomInput('') }}
                        style={{
                          width: 44, height: 44, borderRadius: 10, border: `1px solid ${T.hair}`,
                          background: 'transparent', color: T.mute, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0,
                        }}
                      >×</button>
                    </div>
                  </>
                )}
                {customSteps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {customSteps.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px 4px 12px', borderRadius: 20,
                        background: T.surf2, border: `1px solid ${T.hair}`,
                      }}>
                        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.text }}>{s.label} mg</span>
                        <button
                          onClick={() => removeCustomStep(i)}
                          style={{
                            background: 'transparent', border: 0, padding: 0,
                            cursor: 'pointer', color: T.mute, fontSize: 14, lineHeight: 1,
                            display: 'flex', alignItems: 'center',
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Recent injections ── */}
            {doseHistory.slice(0, 4).length > 0 && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${T.hair}`, paddingTop: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.mute, letterSpacing: '0.12em', marginBottom: 8 }}>
                  RECENT INJECTIONS
                </div>
                {doseHistory.slice(0, 4).map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    paddingBottom: i < 3 ? 8 : 0,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: 3.5, background: T.accent, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, color: T.mute }}>
                      {formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: T.text }}>
                      {Number(entry.dose).toFixed(2)} mg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── INSIGHTS LINK ────────────────────────────────────────── */}
        <div style={{ padding: '18px 16px 0' }}>
          <button
            onClick={() => onNavigate('insights')}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 14,
              border: `1px solid ${T.hair}`, background: T.card, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: FONT.ui, textAlign: 'left',
            }}
          >
            <div>
              <Eyebrow style={{ marginBottom: 4 }}>Insights</Eyebrow>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: '-0.01em' }}>
                View trends & patterns →
              </div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accentDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          </button>
        </div>

      </div>

      {/* ── BOTTOM TAB BAR ───────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <TabBar active="home" onTab={onNavigate} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
