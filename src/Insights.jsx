import { useState } from 'react'
import { formatDate } from './logStore'
import { T, FONT, Eyebrow, Card, TabBar } from './tokens'
import { Paywall } from './entitlements'

// ── Icons ─────────────────────────────────────────────────────────────────────

const doseIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 2.5 13 5.5M9 4 12 7M4 9l3 3-1.5 1.5L4 12l-1.5-1.5L4 9Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 6l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const waterIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2C8 2 4 6.5 4 9.5a4 4 0 0 0 8 0C12 6.5 8 2 8 2Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)
const arrowUpIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const pinIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2a4 4 0 0 1 4 4c0 3-4 8-4 8S4 9 4 6a4 4 0 0 1 4-4Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)
const gridIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)
const proteinIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M6 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

// ── Tip cards ─────────────────────────────────────────────────────────────────
// Ordered to match design — dose pattern first, then hydration, weight, streaks, protein, accuracy

const TIP_CARDS = [
  {
    icon: doseIcon,
    title: 'A pattern around dose days',
    body: 'Calorie intake on dose days and the day after often runs slightly lower than your weekly average. This is a common pattern reported by GLP-1 users.',
  },
  {
    icon: waterIcon,
    title: 'Hydration matters on GLP-1',
    body: 'GLP-1 medications can reduce thirst cues. Tracking water intake helps you stay consistently hydrated, especially on injection days.',
  },
  {
    icon: arrowUpIcon,
    title: 'Day-to-day weight varies naturally',
    body: 'Your daily weight can shift up to 1.5 kg based on water, sleep, and meals. The weekly average gives a more reliable picture than any single reading.',
  },
  {
    icon: pinIcon,
    title: 'Longer logging streaks = better data',
    body: 'Weeks with 5+ days logged show more stable averages — which may simply mean the data is more complete rather than reflecting a behaviour change.',
  },
  {
    icon: proteinIcon,
    title: 'Higher protein weeks look different',
    body: "Weeks where protein averages higher tend to align with better weight trends — whether you're losing fat or building muscle. It's worth tracking consistently.",
  },
  {
    icon: gridIcon,
    title: 'Logging more days helps accuracy',
    body: 'The more days you log, the more reliable your weekly averages become. Even partial logs — just weight or protein — add useful signal.',
  },
]

// ── Compute weekly rows + aggregate stats ─────────────────────────────────────

function computeInsights(logs) {
  // Group entries by Monday-keyed week
  const weekMap = {}
  Object.entries(logs).forEach(([dateStr, entry]) => {
    if (!entry.calories && !entry.protein && !entry.weight && !entry.steps) return
    const d   = new Date(dateStr + 'T12:00:00')
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    const key = mon.toISOString().split('T')[0]
    if (!weekMap[key]) weekMap[key] = []
    weekMap[key].push({ dateStr, ...entry })
  })

  // Determine this week's Monday key
  const today = new Date()
  const td    = today.getDay()
  const thisMon = new Date(today)
  thisMon.setDate(today.getDate() + (td === 0 ? -6 : 1 - td))
  const thisMondayKey = thisMon.toISOString().split('T')[0]

  // Build sorted week rows (oldest → newest so week numbers are stable)
  const sorted = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b))

  const allWeeks = sorted.map(([weekKey, entries], idx) => {
    const start = new Date(weekKey + 'T12:00:00')
    const end   = new Date(start)
    end.setDate(start.getDate() + 6)

    const withProt    = entries.filter(e => e.protein)
    const weightRows  = entries.filter(e => e.weight).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    const hasDose     = entries.some(e => e.dose)

    const avgProtein   = withProt.length
      ? Math.round(withProt.reduce((s, e) => s + +e.protein, 0) / withProt.length) : null
    const latestWeight = weightRows.length ? parseFloat(weightRows[weightRows.length - 1].weight) : null
    const weightChange = weightRows.length >= 2
      ? parseFloat((parseFloat(weightRows[weightRows.length - 1].weight) - parseFloat(weightRows[0].weight)).toFixed(1))
      : null

    return {
      weekKey, weekNum: idx + 1,
      start, end,
      logsCount: entries.length,
      avgProtein, latestWeight, weightChange, hasDose,
      isCurrent: weekKey === thisMondayKey,
    }
  })

  // Aggregate stats
  const totalLogDays     = allWeeks.reduce((s, w) => s + w.logsCount, 0)
  const avgLoggedDays    = allWeeks.length ? +(totalLogDays / allWeeks.length).toFixed(1) : null
  const protWeeks        = allWeeks.filter(w => w.avgProtein)
  const overallAvgProt   = protWeeks.length
    ? Math.round(protWeeks.reduce((s, w) => s + w.avgProtein, 0) / protWeeks.length) : null

  // Best weekly loss = most negative weightChange across all weeks
  const lossValues  = allWeeks.filter(w => w.weightChange !== null).map(w => w.weightChange)
  const bestWkLoss  = lossValues.length ? Math.min(...lossValues) : null   // most negative = best loss

  // Hero narrative: "best" weeks = logsCount >= 5 or top-half logged
  const hiLoggingWeeks = allWeeks.filter(w => w.logsCount >= 5)
  const heroWeeks      = hiLoggingWeeks.length >= 2 ? hiLoggingWeeks : allWeeks
  const heroLogMin     = heroWeeks.length ? Math.min(...heroWeeks.map(w => w.logsCount)) : null
  const heroProtWeeks  = heroWeeks.filter(w => w.avgProtein)
  const heroAvgProt    = heroProtWeeks.length
    ? Math.round(heroProtWeeks.reduce((s, w) => s + w.avgProtein, 0) / heroProtWeeks.length) : null
  const heroDose       = heroWeeks.some(w => w.hasDose)

  // Show last 12 weeks, newest first
  const displayWeeks = [...allWeeks].reverse().slice(0, 12)

  return {
    weeks: displayWeeks,
    totalWeeks: allWeeks.length,
    avgLoggedDays,
    overallAvgProt,
    bestWkLoss,
    heroLogMin,
    heroAvgProt,
    heroDose,
    hasData: allWeeks.length > 0,
  }
}

// ── Date range formatter ──────────────────────────────────────────────────────
function fmtRange(start, end) {
  const sm = start.getMonth(), em = end.getMonth()
  const sd = start.getDate(),  ed = end.getDate()
  const mName = d => d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  if (sm === em) return `${mName(start)} ${sd} → ${ed}`
  return `${mName(start)} ${sd} → ${mName(end)} ${ed}`
}

// ── Main component ────────────────────────────────────────────────────────────

// NSV emoji pool — random pick on add
const NSV_EMOJIS = ['🎉','💪','✨','🏆','🌟','🙌','🔥','💫','🎯','🥳']

export default function Insights({ logs = {}, userSettings = {}, onNavigate, entitlements, onUpgrade }) {
  // Insights & trends is a GetTrendli Plus feature.
  if (entitlements && !entitlements.hasPremium) {
    return <Paywall feature="Insights" entitlements={entitlements}
      onUpgrade={onUpgrade} onNavigate={onNavigate} active="insights" />
  }

  const { unitSystem = 'metric' } = userSettings
  const isMetric = unitSystem !== 'us'
  const wUnit    = isMetric ? 'KG' : 'LB'

  // ── NSV state ───────────────────────────────────────────────────────────────
  const [nsvs, setNsvs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gt_nsvs') || '[]') } catch { return [] }
  })
  const [nsvInput,  setNsvInput]  = useState('')
  const [nsvFormOn, setNsvFormOn] = useState(false)

  function addNsv() {
    if (!nsvInput.trim()) return
    const entry = {
      id:    Date.now(),
      text:  nsvInput.trim(),
      date:  new Date().toISOString().split('T')[0],
      emoji: NSV_EMOJIS[Math.floor(Math.random() * NSV_EMOJIS.length)],
    }
    const next = [entry, ...nsvs]
    setNsvs(next)
    try { localStorage.setItem('gt_nsvs', JSON.stringify(next)) } catch {}
    setNsvInput('')
    setNsvFormOn(false)
  }

  function removeNsv(id) {
    const next = nsvs.filter(n => n.id !== id)
    setNsvs(next)
    try { localStorage.setItem('gt_nsvs', JSON.stringify(next)) } catch {}
  }

  function wFmt(kg, dec = 1) {
    if (kg == null) return null
    const v = isMetric ? parseFloat(kg) : parseFloat(kg) * 2.2046
    return v.toFixed(dec)
  }

  const {
    weeks, totalWeeks, avgLoggedDays, overallAvgProt,
    bestWkLoss, heroLogMin, heroAvgProt, heroDose, hasData,
  } = computeInsights(logs)

  // Days logged (for unlock progress)
  const totalLogDays = Object.values(logs).filter(e =>
    e.weight || e.calories || e.protein || (e.water ?? 0) > 0
  ).length
  const unlockAt  = 7
  const toUnlock  = Math.max(0, unlockAt - totalLogDays)
  const unlockPct = Math.min(100, (totalLogDays / unlockAt) * 100)

  const bestLossDisplay = bestWkLoss != null ? Math.abs(parseFloat(wFmt(bestWkLoss))) : null

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui }}>
      <div style={{ maxWidth: 430, margin: '0 auto', paddingBottom: 120 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, color: T.text }}>
            Insights
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 6, letterSpacing: '-0.01em' }}>
            Patterns and tips for your protocol.
          </div>
        </div>

        {/* ── Hero card (inverted) ───────────────────────────── */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{
            background: T.ink, borderRadius: 18, padding: '20px 20px 18px',
            border: '1px solid #1a1a1a',
          }}>
            {/* Eyebrow */}
            <Eyebrow color="#7a7a7a" style={{ letterSpacing: '0.12em', fontSize: 9 }}>
              YOUR PATTERN{totalWeeks > 0 ? ` · ${totalWeeks} WEEK${totalWeeks !== 1 ? 'S' : ''}` : ''}
            </Eyebrow>

            {/* Narrative */}
            <div style={{
              marginTop: 12, fontFamily: FONT.ui, fontSize: 18, fontWeight: 500,
              lineHeight: 1.4, color: T.inkText, letterSpacing: '-0.02em',
            }}>
              {hasData && heroLogMin ? (
                <>
                  Your best weeks pair{' '}
                  <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, color: T.accent }}>
                    {heroLogMin}+ days
                  </span>
                  {' '}of logging
                  {heroAvgProt ? (
                    <> with{' '}
                      <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, color: T.accent }}>
                        ~{heroAvgProt}g
                      </span>
                      {' '}of protein
                    </>
                  ) : null}
                  {heroDose ? ' and a steady dose day' : ''}.
                </>
              ) : (
                <>
                  {/* Unlock progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: FONT.mono, fontSize: 9, color: '#6a6a6a', letterSpacing: '0.10em' }}>
                      <span>YOUR PATTERN UNLOCKS IN</span>
                      <span style={{ color: toUnlock === 0 ? T.accent : '#6a6a6a' }}>
                        {toUnlock === 0 ? 'READY ✓' : `${toUnlock} MORE DAY${toUnlock !== 1 ? 'S' : ''}`}
                      </span>
                    </div>
                    {/* Dot progress */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      {Array.from({ length: unlockAt }).map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: 5, borderRadius: 3,
                          background: i < totalLogDays ? T.accent : 'rgba(255,255,255,0.12)',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: FONT.ui, fontSize: 12, color: '#7a7a7a', marginTop: 10, lineHeight: 1.5 }}>
                      {totalLogDays === 0
                        ? 'Log your first day to start building your pattern.'
                        : `${totalLogDays} of ${unlockAt} days logged. Keep going — your personal insights will appear here.`}
                    </div>
                  </div>
                  {/* Preview of what unlocks */}
                  <div style={{ borderTop: '1px solid #222', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['Best weeks analysis', 'Protein correlation', 'Side-effect patterns', 'Streak insights'].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.ui, fontSize: 12, color: '#555' }}>
                        <div style={{ width: 5, height: 5, borderRadius: 3, background: '#333', flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Stats row */}
            {hasData && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 18, paddingTop: 16, borderTop: '1px solid #222',
              }}>
                {[
                  bestLossDisplay != null && { label: 'BEST WK LOSS', value: bestLossDisplay, sub: wUnit },
                  avgLoggedDays   != null && { label: 'LOGGED DAYS',  value: avgLoggedDays,   sub: '/7' },
                  overallAvgProt  != null && { label: 'AVG PROTEIN',  value: overallAvgProt,  sub: 'G'  },
                ].filter(Boolean).slice(0, 3).map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: '#6a6a6a', letterSpacing: '0.12em' }}>
                      {s.label}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{
                        fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 26,
                        color: T.inkText, letterSpacing: '-0.02em', lineHeight: 1,
                      }}>{s.value}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: '#6a6a6a', letterSpacing: '0.06em' }}>
                        {s.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detailed charts link ───────────────────────────── */}
        <div style={{ padding: '12px 16px 0' }}>
          <button type="button" onClick={() => onNavigate('charts')} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 18px', borderRadius: 14, background: T.ink, color: T.inkText,
            border: 0, cursor: 'pointer', fontFamily: FONT.ui,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Detailed charts</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.85 }}>
              <span style={{ fontFamily: FONT.ui, fontSize: 12 }}>Weight · protein · dose</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </span>
          </button>
        </div>

        {/* ── What to know tip cards ─────────────────────────── */}
        <div style={{ padding: '22px 22px 10px' }}>
          <Eyebrow>What to know</Eyebrow>
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TIP_CARDS.map(card => (
            <Card key={card.title} padding={16} radius={14}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: T.accentSoft, color: T.accentDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 5, color: T.text }}>
                  {card.title}
                </div>
                <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.55 }}>
                  {card.body}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Non-Scale Victories ───────────────────────────── */}
        <div style={{ padding: '22px 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>Non-Scale Victories</Eyebrow>
          <button
            onClick={() => setNsvFormOn(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 20,
              background: nsvFormOn ? T.ink : T.accentSoft,
              color: nsvFormOn ? T.inkText : T.accentDark,
              border: 0, cursor: 'pointer',
              fontFamily: FONT.ui, fontSize: 12, fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {nsvFormOn ? <path d="M2 6h8"/> : <path d="M6 2v8M2 6h8"/>}
            </svg>
            {nsvFormOn ? 'Cancel' : 'Add milestone'}
          </button>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Add form */}
          {nsvFormOn && (
            <Card padding={14} radius={14}>
              <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 8 }}>
                WHAT'S YOUR WIN?
              </div>
              <textarea
                autoFocus
                value={nsvInput}
                onChange={e => setNsvInput(e.target.value.slice(0, 120))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNsv() } }}
                placeholder="e.g. My jeans fit again, walked 10K steps, less hunger on dose days…"
                rows={2}
                style={{
                  width: '100%', border: `1px solid ${T.hair}`, borderRadius: 10,
                  padding: '10px 12px', boxSizing: 'border-box',
                  fontFamily: FONT.ui, fontSize: 14, color: T.text, resize: 'none',
                  background: T.surf2, outline: 0, letterSpacing: '-0.01em', lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button onClick={() => setNsvFormOn(false)} style={{
                  padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.hair}`,
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: FONT.ui, fontSize: 13, color: T.mute,
                }}>Cancel</button>
                <button onClick={addNsv} disabled={!nsvInput.trim()} style={{
                  padding: '8px 18px', borderRadius: 10, border: 0,
                  background: nsvInput.trim() ? T.ink : T.hair, cursor: nsvInput.trim() ? 'pointer' : 'default',
                  fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.inkText,
                }}>Save ✓</button>
              </div>
            </Card>
          )}

          {/* NSV list */}
          {nsvs.length > 0 ? (
            <Card padding={0} radius={14}>
              {nsvs.map((nsv, i) => (
                <div key={nsv.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < nsvs.length - 1 ? `1px solid ${T.hair}` : 'none',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{nsv.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.4 }}>
                      {nsv.text}
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em', marginTop: 3 }}>
                      {formatDate(nsv.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <button onClick={() => removeNsv(nsv.id)} style={{
                    background: 'transparent', border: 0, padding: 4, cursor: 'pointer',
                    color: T.faint, flexShrink: 0, lineHeight: 1,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8"/>
                    </svg>
                  </button>
                </div>
              ))}
            </Card>
          ) : !nsvFormOn && (
            <Card padding={20} radius={14} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏆</div>
              <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                Track wins beyond the scale
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.55 }}>
                Clothes fitting better, more energy, less hunger, better sleep — these victories matter just as much as the number.
              </div>
            </Card>
          )}
        </div>

        {/* ── Week-by-week ───────────────────────────────────── */}
        <div style={{ padding: '22px 22px 10px' }}>
          <Eyebrow>Week-by-week</Eyebrow>
        </div>
        <div style={{ padding: '0 16px' }}>
          {hasData ? (
            <Card padding={0} radius={14}>
              {weeks.map((row, i) => (
                <div key={row.weekKey} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderBottom: i < weeks.length - 1 ? `1px solid ${T.hair}` : 'none',
                }}>
                  {/* Left: week label + date range + dots */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: T.text }}>
                      {row.isCurrent ? 'This week' : `Week ${row.weekNum}`}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.mute, letterSpacing: '0.06em' }}>
                        {fmtRange(row.start, row.end)}
                      </span>
                      {/* Log-day dots */}
                      <div style={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                        {Array.from({ length: 7 }).map((_, k) => (
                          <div key={k} style={{
                            width: 5, height: 5, borderRadius: 3,
                            background: k < row.logsCount ? T.accent : T.hair2,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: weight + delta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {row.latestWeight != null && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                        <span style={{
                          fontFamily: FONT.ui, fontSize: 15, fontWeight: 700,
                          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: T.text,
                        }}>
                          {wFmt(row.latestWeight)}
                        </span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>
                          {wUnit}
                        </span>
                      </div>
                    )}
                    {row.weightChange != null && (
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end', marginTop: 1,
                        fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        color: row.weightChange <= 0 ? T.accentDark : '#D97706',
                      }}>
                        <span>
                          {row.weightChange > 0 ? '+' : ''}{wFmt(row.weightChange)}
                        </span>
                        <span style={{ fontSize: 8, fontWeight: 500, opacity: 0.8 }}>{wUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card padding={20} radius={14}>
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 5, borderRadius: 3,
                    background: i < totalLogDays ? T.accent : T.hair,
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                {totalLogDays === 0 ? 'Start logging to see your weeks' : `${totalLogDays} day${totalLogDays !== 1 ? 's' : ''} logged`}
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.55 }}>
                {toUnlock > 0
                  ? `Log ${toUnlock} more day${toUnlock !== 1 ? 's' : ''} to unlock your week-by-week breakdown — weight trends, protein averages, and injection patterns.`
                  : 'Your week-by-week summary is ready. Keep logging to see it grow.'}
              </div>
            </Card>
          )}
        </div>

        {/* ── Disclaimer ─────────────────────────────────────── */}
        <p style={{
          fontFamily: FONT.ui, fontSize: 11, color: T.faint,
          lineHeight: 1.65, textAlign: 'center',
          padding: '20px 28px 0', margin: 0,
        }}>
          Insights are based on your logged data only and are for personal tracking purposes.
          They are not medical advice. Consult your healthcare provider before making changes
          to your diet, activity, or medication routine.
        </p>

      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <TabBar active="insights" onTab={onNavigate} />
      </div>
    </div>
  )
}
