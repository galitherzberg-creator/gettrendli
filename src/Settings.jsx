import { useState } from 'react'
import styles from './Settings.module.css'
import { T, FONT, Eyebrow, Toggle, TabBar } from './tokens'
import { TrialBanner } from './entitlements'

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDICATIONS = [
  { id: 'semaglutide', name: 'Semaglutide', brands: 'OZEMPIC · WEGOVY' },
  { id: 'tirzepatide', name: 'Tirzepatide', brands: 'MOUNJARO · ZEPBOUND' },
  { id: 'liraglutide', name: 'Liraglutide', brands: 'SAXENDA · VICTOZA' },
  { id: 'none',        name: 'None / Other', brands: '' },
]

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const APP_VERSION = '2.4.1'
const APP_BUILD   = '318'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the ISO date of the most-recent occurrence of dayName (Mon–Sun) */
function lastOccurrenceOf(dayName) {
  const idx  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(dayName)
  if (idx < 0) return null
  const today = new Date()
  const diff  = (today.getDay() - idx + 7) % 7
  const d     = new Date(today)
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function nameInitials(name) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function padDay(n) { return String(n).padStart(3, '0') }

// ── Sub-components ────────────────────────────────────────────────────────────

// iOS-style list card wrapper
function ListCard({ children }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.hair}`,
      borderRadius: 16, overflow: 'hidden',
      margin: '0 16px',
    }}>
      {children}
    </div>
  )
}

// Row with value + chevron (tappable)
function ChevronRow({ label, value, onTap, first = false, isRed = false, bold = false }) {
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', background: 'transparent',
        border: 0, borderTop: first ? 0 : `1px solid ${T.hair}`,
        cursor: onTap ? 'pointer' : 'default', textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: FONT.ui, fontSize: 14, letterSpacing: '-0.01em', color: isRed ? '#C62828' : T.text, fontWeight: bold ? 500 : 400 }}>
        {label}
      </span>
      {value && !isRed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, letterSpacing: '-0.005em' }}>{value}</span>
          {onTap && (
            <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
              <path d="M1 1l5 5-5 5" stroke={T.faint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}
    </button>
  )
}

// Row with toggle
function ToggleRow({ label, value, onChange, first = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 16px', borderTop: first ? 0 : `1px solid ${T.hair}`,
    }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 14, color: T.text, letterSpacing: '-0.01em' }}>{label}</span>
      <Toggle on={value} onChange={onChange} />
    </div>
  )
}

// Expandable row that shows an editor below
function EditableRow({ label, value, isOpen, onTap, first = false, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onTap}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 16px', background: 'transparent',
          border: 0, borderTop: first ? 0 : `1px solid ${T.hair}`,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: FONT.ui, fontSize: 14, letterSpacing: '-0.01em', color: T.text }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute }}>{value}</span>
          <svg width="6" height="11" viewBox="0 0 7 12" fill="none"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M1 1l5 5-5 5" stroke={T.faint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: '4px 16px 14px', borderTop: `1px solid ${T.hair}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// Small number input for inline editing
function InlineInput({ value, onChange, onDone, unit, placeholder, step = '0.1', type = 'number' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
      <input
        autoFocus
        type={type}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onDone}
        onKeyDown={e => e.key === 'Enter' && onDone()}
        placeholder={placeholder}
        step={step}
        style={{
          flex: 1, padding: '10px 14px', borderRadius: 10,
          border: `1.5px solid ${T.accent}`, outline: 0, background: T.surf2,
          fontFamily: FONT.ui, fontSize: 15, color: T.text, letterSpacing: '-0.01em',
        }}
      />
      {unit && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mute, letterSpacing: '0.04em' }}>{unit}</span>}
    </div>
  )
}

// Chip selector (horizontal scrollable chips)
function ChipSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
      {options.map(opt => {
        const on = value === (opt.id ?? opt)
        const label = opt.label ?? opt
        return (
          <button
            key={opt.id ?? opt}
            type="button"
            onClick={() => onChange(opt.id ?? opt)}
            style={{
              padding: '7px 14px', borderRadius: 20,
              border: `1px solid ${on ? T.ink : T.hair}`,
              background: on ? T.ink : 'transparent',
              color: on ? T.inkText : T.mute,
              fontFamily: FONT.ui, fontSize: 13, fontWeight: on ? 600 : 500,
              letterSpacing: '-0.01em', cursor: 'pointer',
            }}
          >{label}</button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings({ userSettings, onSaveSettings, logs = {}, onNavigate, entitlements, onUpgrade, onSignOut, isAdmin = false }) {
  const s = userSettings
  // `isAdmin` is passed down from App.jsx, computed from the real authenticated
  // session email — never from this settings JSON, which the account owner can
  // freely edit and must not be trusted for a privilege check.

  // Unit helpers
  const isMetric = s.unitSystem !== 'us'
  const wUnit    = isMetric ? 'kg' : 'lb'
  function wFmt(kg, dec = 1) {
    if (!kg && kg !== 0) return ''
    return isMetric ? parseFloat(kg).toFixed(dec) : (parseFloat(kg) * 2.2046).toFixed(dec)
  }
  function wParse(display) {
    const v = parseFloat(display)
    if (isNaN(v)) return null
    return isMetric ? v : v / 2.2046
  }

  // ── Profile stats (computed from logs) ──────────────────────────────────────
  const logCount    = Object.keys(logs).length
  const weightLogs  = Object.entries(logs)
    .filter(([, e]) => e.weight)
    .sort(([a], [b]) => a.localeCompare(b))
  const latestWt    = weightLogs.length ? parseFloat(weightLogs[weightLogs.length - 1][1].weight) : null
  const startWt     = parseFloat(s.startWeight) || null
  const lostKg      = startWt && latestWt && startWt > latestWt ? +(startWt - latestWt).toFixed(1) : null
  const lostDisplay = lostKg ? wFmt(lostKg) : null

  const refDate    = s.startDate || s.lastInjectionDate
  const daysSince  = refDate ? Math.max(0, Math.floor((Date.now() - new Date(refDate + 'T12:00:00')) / 86400000)) : null
  const weeksSince = refDate ? Math.max(0, Math.floor(daysSince / 7)) : null

  // ── Local state ──────────────────────────────────────────────────────────────

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName,  setEditName]  = useState(s.name)
  const [editEmail, setEditEmail] = useState(s.email ?? '')

  // Medication
  const [medication,         setMedicationLocal]  = useState(s.medication ?? 'semaglutide')
  const [dose,               setDoseLocal]        = useState(String(s.dose ?? '1.0'))
  const [injectionDay,       setInjDayLocal]      = useState(s.injectionDay ?? 'Friday')
  const [reminderEnabled,    setReminderLocal]    = useState(s.reminderEnabled ?? true)
  const [autoTitration,      setAutoTitLocal]     = useState(s.autoTitrationAlert ?? false)

  // Targets
  const [goalType,      setGoalTypeLocal]    = useState(s.goalType ?? 'lose')
  const [goalWeight,    setGoalWeightLocal]  = useState(wFmt(s.goalWeight || 0, 0))
  const [pace,          setPaceLocal]        = useState(isMetric ? String(s.pace ?? '0.5') : String(((s.pace ?? 0.5) * 2.2046).toFixed(1)))
  const [proteinGoal,   setProteinLocal]     = useState(String(s.proteinGoal ?? ''))
  const [fiberGoal,     setFiberLocal]       = useState(String(s.fiberGoal ?? ''))
  const [waterGoal,     setWaterLocal]       = useState(String(s.dailyWaterGoal ?? '8'))

  // Privacy
  const [faceId,     setFaceId]    = useState(false)
  const [analytics,  setAnalytics] = useState(false)

  // Editing row
  const [openRow, setOpenRow] = useState(null)

  // Toast
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  // ── Save helpers ─────────────────────────────────────────────────────────────

  function save(patch) {
    onSaveSettings({ ...s, ...patch })
  }

  function toggleRow(key) {
    setOpenRow(prev => prev === key ? null : key)
  }

  // ── Profile save ─────────────────────────────────────────────────────────────
  function saveProfile() {
    if (!editName.trim()) return
    save({ name: editName.trim(), email: editEmail.trim() })
    setEditingProfile(false)
    showToast('Profile updated')
  }

  // ── Medication saves ─────────────────────────────────────────────────────────
  function saveMedication(val) { setMedicationLocal(val); save({ medication: val }) }
  function saveDose()          { const v = parseFloat(dose); if (!isNaN(v)) { save({ dose: v }); setOpenRow(null) } }
  function saveInjDay(val)     {
    setInjDayLocal(val)
    save({ injectionDay: val, lastInjectionDate: lastOccurrenceOf(val) })
  }

  // ── Targets saves ────────────────────────────────────────────────────────────
  function saveGoalType(val)  { setGoalTypeLocal(val); save({ goalType: val }) }
  function saveGoalWeight()   {
    const kg = wParse(goalWeight)
    if (kg) { save({ goalWeight: kg }); setOpenRow(null) }
  }
  function savePace() {
    const v = parseFloat(pace)
    if (!isNaN(v)) { save({ pace: isMetric ? v : +(v / 2.2046).toFixed(3) }); setOpenRow(null) }
  }
  function saveProtein() {
    const v = parseFloat(proteinGoal)
    save({ proteinGoal: isNaN(v) ? null : v }); setOpenRow(null)
  }
  function saveFiber() {
    const v = parseFloat(fiberGoal)
    save({ fiberGoal: isNaN(v) ? null : v }); setOpenRow(null)
  }
  function saveWater() {
    const v = parseFloat(waterGoal)
    if (!isNaN(v)) { save({ dailyWaterGoal: v }); setOpenRow(null) }
  }

  // ── Account ──────────────────────────────────────────────────────────────────
  function handleSignOut() {
    if (window.confirm('Sign out of GetTrendli?')) {
      if (onSignOut) { onSignOut(); return }   // cloud mode: ends the Supabase session
      localStorage.clear(); window.location.reload()
    }
  }
  function handleResetData() {
    if (window.confirm('Clear all logs and measurements? Your profile settings will be kept.')) {
      localStorage.removeItem('gt_logs')
      localStorage.removeItem('gt_measurements')
      window.location.reload()
    }
  }
  function handleDeleteAccount() {
    if (window.confirm('Delete your account and all data? This cannot be undone.')) {
      localStorage.clear(); window.location.reload()
    }
  }

  // Export all of the user's data as a JSON file they can keep or move.
  function handleExportData() {
    const readJSON = (key, fallback) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
    }
    const payload = {
      app: 'GetTrendli',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: readJSON('gt_settings', {}),
      logs: readJSON('gt_logs', {}),
      measurements: readJSON('gt_measurements', []),
      nonScaleVictories: readJSON('gt_nsvs', []),
    }
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `trendli-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('Data exported')
    } catch {
      showToast('Export failed')
    }
  }

  // ── Derived display values ───────────────────────────────────────────────────
  const medName      = MEDICATIONS.find(m => m.id === medication)?.name ?? 'Semaglutide'
  const paceDisplay  = isMetric ? `${pace} kg / wk` : `${pace} lb / wk`
  const gwDisplay    = goalWeight ? `${goalWeight} ${wUnit}` : '—'
  const protDisplay  = proteinGoal ? `${proteinGoal} g` : '—'
  const fiberDisplay = fiberGoal ? `${fiberGoal} g` : '—'
  const waterDisplay = waterGoal ? `${waterGoal} cups` : '—'

  return (
    <div className={styles.shell}>
      <div className={styles.page}>
        <div className={styles.scrollContent} style={{ padding: '0 0 120px', gap: 0 }}>

          <TrialBanner entitlements={entitlements} onUpgrade={onUpgrade} />

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={{ padding: '22px 20px 16px' }}>
            <Eyebrow style={{ marginBottom: 6 }}>Settings</Eyebrow>
            <h1 style={{ fontFamily: FONT.ui, fontSize: 36, fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: T.text }}>
              You.
            </h1>
          </div>

          {/* ── Profile card ───────────────────────────────────── */}
          <div style={{ margin: '0 16px 20px' }}>
            <div style={{ background: T.card, border: `1px solid ${T.hair}`, borderRadius: 18, padding: '18px 18px 16px' }}>
              {!editingProfile ? (
                <>
                  {/* Avatar + name + edit */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 26,
                      background: T.ink, color: T.inkText,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT.ui, fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em',
                      flexShrink: 0,
                    }}>
                      {nameInitials(s.name || 'U')}
                    </div>
                    {/* Name + email + day */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT.ui, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: T.text, lineHeight: 1.2 }}>
                        {s.name || 'Your name'}
                      </div>
                      <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.mute, letterSpacing: '0.08em', marginTop: 3 }}>
                        {s.email ? s.email.toUpperCase() : 'ADD EMAIL'}
                        {daysSince != null ? ` · DAY ${padDay(daysSince)}` : ''}
                      </div>
                    </div>
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => { setEditName(s.name); setEditEmail(s.email ?? ''); setEditingProfile(true) }}
                      style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1px solid ${T.hair}`, background: 'transparent',
                        fontFamily: FONT.mono, fontSize: 9, fontWeight: 600,
                        letterSpacing: '0.10em', color: T.mute, cursor: 'pointer',
                      }}
                    >EDIT</button>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.hair}` }}>
                    {[
                      { val: lostDisplay ? `${lostDisplay} ${wUnit}` : '—',  label: 'LOST'     },
                      { val: weeksSince != null ? `${weeksSince} wks`  : '—', label: 'ON DOSE'  },
                      { val: logCount > 0 ? String(logCount) : '—',           label: 'LOGS'     },
                    ].map(st => (
                      <div key={st.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22,
                          color: T.text, letterSpacing: '-0.02em', lineHeight: 1,
                        }}>{st.val}</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 8.5, color: T.mute, letterSpacing: '0.12em' }}>
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Edit mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em' }}>EDIT PROFILE</div>
                  {[
                    { label: 'Name', val: editName, set: setEditName, type: 'text', placeholder: 'Your name' },
                    { label: 'Email', val: editEmail, set: setEditEmail, type: 'email', placeholder: 'your@email.com' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.10em', marginBottom: 5 }}>{f.label.toUpperCase()}</div>
                      <input
                        type={f.type}
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
                          border: `1px solid ${T.hair}`, outline: 0, background: T.surf2,
                          fontFamily: FONT.ui, fontSize: 15, color: T.text, letterSpacing: '-0.01em',
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={saveProfile} style={{
                      flex: 1, padding: '11px 0', borderRadius: 12,
                      background: T.ink, color: T.inkText, border: 0,
                      fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Save</button>
                    <button type="button" onClick={() => setEditingProfile(false)} style={{
                      padding: '11px 18px', borderRadius: 12,
                      background: 'transparent', border: `1px solid ${T.hair}`,
                      fontFamily: FONT.ui, fontSize: 14, color: T.mute, cursor: 'pointer',
                    }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── MEDICATION ─────────────────────────────────────── */}
          <Eyebrow style={{ padding: '0 20px 8px', letterSpacing: '0.14em' }}>Medication</Eyebrow>
          <ListCard>
            <EditableRow
              first label="Drug" value={medName}
              isOpen={openRow === 'drug'}
              onTap={() => toggleRow('drug')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
                {MEDICATIONS.map(m => {
                  const on = medication === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { saveMedication(m.id); setOpenRow(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${on ? T.ink : T.hair}`,
                        background: on ? T.ink : T.surf2,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: on ? 600 : 500, color: on ? T.inkText : T.text }}>
                          {m.name}
                        </div>
                        {m.brands && (
                          <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: on ? 'rgba(250,250,247,0.5)' : T.faint, letterSpacing: '0.08em', marginTop: 2 }}>
                            {m.brands}
                          </div>
                        )}
                      </div>
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l4 4 6-6" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </EditableRow>

            <EditableRow
              label="Dose" value={`${dose} mg`}
              isOpen={openRow === 'dose'}
              onTap={() => toggleRow('dose')}
            >
              <InlineInput
                value={dose}
                onChange={setDoseLocal}
                onDone={saveDose}
                unit="mg"
                placeholder="1.0"
                step="0.25"
              />
            </EditableRow>

            <EditableRow
              label="Injection day" value={injectionDay}
              isOpen={openRow === 'injday'}
              onTap={() => toggleRow('injday')}
            >
              <ChipSelect
                options={DAY_NAMES}
                value={injectionDay}
                onChange={val => { saveInjDay(val); setOpenRow(null) }}
              />
            </EditableRow>

            <ToggleRow
              label="Reminder"
              value={reminderEnabled}
              onChange={v => { setReminderLocal(v); save({ reminderEnabled: v }) }}
            />
            <ToggleRow
              label="Auto-titration alert"
              value={autoTitration}
              onChange={v => { setAutoTitLocal(v); save({ autoTitrationAlert: v }) }}
            />
          </ListCard>

          {/* ── TARGETS ────────────────────────────────────────── */}
          <Eyebrow style={{ padding: '22px 20px 8px', letterSpacing: '0.14em' }}>Targets</Eyebrow>

          {/* Goal type tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
            {[
              { id: 'lose', label: 'Lose weight',  sub: 'BODY RECOMPOSITION', d: 'M6 9l6 6 6-6' },
              { id: 'gain', label: 'Build muscle',  sub: 'GAIN · LEAN MASS',   d: 'M6 15l6-6 6 6' },
            ].map(g => {
              const on = goalType === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => saveGoalType(g.id)}
                  style={{
                    padding: '14px', textAlign: 'left', cursor: 'pointer',
                    background: on ? T.ink : T.card,
                    color: on ? T.inkText : T.text,
                    border: `1px solid ${on ? T.ink : T.hair}`,
                    borderRadius: 14, fontFamily: FONT.ui,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: on ? '#1a1a1a' : T.surf2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={on ? T.inkText : T.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={g.d}/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{g.label}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: '0.08em', opacity: 0.55, marginTop: 2, textTransform: 'uppercase' }}>{g.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <ListCard>
            <EditableRow
              first label="Goal weight" value={gwDisplay}
              isOpen={openRow === 'gw'}
              onTap={() => toggleRow('gw')}
            >
              <InlineInput
                value={goalWeight}
                onChange={setGoalWeightLocal}
                onDone={saveGoalWeight}
                unit={wUnit}
                placeholder={isMetric ? '75' : '165'}
              />
            </EditableRow>

            <EditableRow
              label="Pace" value={paceDisplay}
              isOpen={openRow === 'pace'}
              onTap={() => toggleRow('pace')}
            >
              <InlineInput
                value={pace}
                onChange={setPaceLocal}
                onDone={savePace}
                unit={`${wUnit} / wk`}
                placeholder={isMetric ? '0.5' : '1.1'}
              />
            </EditableRow>

            <EditableRow
              label="Daily protein" value={protDisplay}
              isOpen={openRow === 'protein'}
              onTap={() => toggleRow('protein')}
            >
              <InlineInput
                value={proteinGoal}
                onChange={setProteinLocal}
                onDone={saveProtein}
                unit="g"
                placeholder="120"
              />
            </EditableRow>

            <EditableRow
              label="Daily fiber" value={fiberDisplay}
              isOpen={openRow === 'fiber'}
              onTap={() => toggleRow('fiber')}
            >
              <InlineInput
                value={fiberGoal}
                onChange={setFiberLocal}
                onDone={saveFiber}
                unit="g"
                placeholder="28"
              />
            </EditableRow>

            <EditableRow
              label="Daily water" value={waterDisplay}
              isOpen={openRow === 'water'}
              onTap={() => toggleRow('water')}
            >
              <InlineInput
                value={waterGoal}
                onChange={setWaterLocal}
                onDone={saveWater}
                unit="cups"
                placeholder="8"
                step="1"
              />
            </EditableRow>
          </ListCard>

          {/* ── PRIVACY & DATA ──────────────────────────────────── */}
          <Eyebrow style={{ padding: '22px 20px 8px', letterSpacing: '0.14em' }}>Privacy &amp; Data</Eyebrow>
          <ListCard>
            <ToggleRow first label="Use Face ID"           value={faceId}    onChange={setFaceId} />
            <ToggleRow       label="Anonymous analytics"   value={analytics} onChange={setAnalytics} />
            <ChevronRow      label="Export data"           value="JSON" onTap={handleExportData} />
          </ListCard>

          {/* ── ADMIN (only ever visible to the admin account) ──── */}
          {isAdmin && (
            <div style={{ padding: '22px 20px 0' }}>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                  background: T.ink, border: 0, textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(63,202,165,0.18)', color: T.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z"/>
                    <path d="M9 12l2 2 4-4" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 15, fontWeight: 600, color: T.inkText, letterSpacing: '-0.01em' }}>
                    Admin
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(250,250,247,0.55)', marginTop: 1 }}>
                    Operations console — only visible to you
                  </div>
                </div>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M1 1l5 5-5 5" stroke="rgba(250,250,247,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── ACCOUNT ────────────────────────────────────────── */}
          <Eyebrow style={{ padding: '22px 20px 8px', letterSpacing: '0.14em' }}>Account</Eyebrow>
          <ListCard>
            <ChevronRow first label="Subscription"
              value={
                entitlements?.subscribed   ? 'GetTrendli Plus · Active'
                : entitlements?.trialActive ? `Free trial · ${entitlements.daysLeft}d left`
                : entitlements?.trialEnded  ? 'Trial ended'
                : 'GetTrendli Plus'
              }
              onTap={entitlements?.subscribed ? () => showToast('GetTrendli Plus is active') : onUpgrade} />
            <ChevronRow       label="Send feedback" value=""             onTap={() => showToast('Thanks for using GetTrendli!')} />
            <ChevronRow       label="Reset all logs" isRed onTap={handleResetData} />
            <ChevronRow       label="Sign out"       isRed onTap={handleSignOut} />
            <ChevronRow       label="Delete account" isRed onTap={handleDeleteAccount} />
          </ListCard>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', padding: '28px 0 12px' }}>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 20, color: T.mute, letterSpacing: '-0.01em', userSelect: 'none' }}>
              GetTrendli
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.12em', marginTop: 4 }}>
              VERSION {APP_VERSION} · BUILD {APP_BUILD}
            </div>
          </div>

        </div>

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
          <TabBar active="profile" onTab={onNavigate} />
        </div>

        {/* ── Toast ───────────────────────────────────────────── */}
        <div style={{
          position: 'fixed', bottom: 100, left: '50%',
          transform: `translateX(-50%) translateY(${toast ? 0 : 16}px)`,
          opacity: toast ? 1 : 0, transition: 'all 0.22s',
          background: T.ink, color: T.inkText,
          borderRadius: 20, padding: '10px 18px',
          fontFamily: FONT.ui, fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 60,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>

      </div>
    </div>
  )
}
