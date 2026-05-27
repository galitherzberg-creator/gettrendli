import { useState, useEffect, useRef } from 'react'
import { todayISO, isoDate, formatDate } from './logStore'
import styles from './LogToday.module.css'
import { TabBar } from './tokens'

const ACTIVITY_TYPES = ['Walk', 'Run', 'Gym', 'Swim', 'Cycle', 'Yoga', 'Strength training', 'HIIT', 'Pilates', 'Hike', 'Other']
const DURATION_PRESETS = [15, 30, 45, 60, 90]

const MOODS = [
  { value: 'low',   label: 'Low'  },
  { value: 'off',   label: 'Off'  },
  { value: 'ok',    label: 'OK'   },
  { value: 'good',  label: 'Good' },
  { value: 'great', label: 'Great'},
]

const SIDE_EFFECTS = [
  { value: 'nausea',        label: 'Nausea' },
  { value: 'fatigue',       label: 'Fatigue' },
  { value: 'headache',      label: 'Headache' },
  { value: 'constipation',  label: 'Constipation' },
  { value: 'heartburn',     label: 'Heartburn' },
  { value: 'bloating',      label: 'Bloating' },
  { value: 'inj-site',      label: 'Injection site' },
  { value: 'none',          label: 'None' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DateSelector({ value, onChange }) {
  const inputRef = useRef(null)
  const isToday = value === todayISO
  const label = formatDate(value)

  const openPicker = () => {
    try { inputRef.current?.showPicker() } catch {}
  }

  return (
    <div className={styles.dateSelectorRow}>
      <button
        className={styles.dateArrow}
        onClick={() => onChange(addDays(value, -1))}
        type="button"
        aria-label="Previous day"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button className={styles.dateLabelBtn} onClick={openPicker} type="button">
        <span className={styles.dateLabelText}>{label}</span>
        {isToday && <span className={styles.todayPill}>Today</span>}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.calIcon}>
          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Hidden native date input */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        max={todayISO}
        onChange={e => e.target.value && onChange(e.target.value)}
        className={styles.hiddenDateInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <button
        className={styles.dateArrow}
        onClick={() => onChange(addDays(value, 1))}
        type="button"
        aria-label="Next day"
        disabled={isToday}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

function CollapsibleSection({ title, icon, isOpen, onToggle, badge, children }) {
  return (
    <div className={`${styles.section} ${isOpen ? styles.sectionOpen : ''}`}>
      <button className={styles.sectionTrigger} onClick={onToggle} type="button" aria-expanded={isOpen}>
        <div className={styles.sectionTriggerLeft}>
          <span className={styles.sectionIcon}>{icon}</span>
          <span className={styles.sectionTitle}>{title}</span>
          {badge && !isOpen && <span className={styles.sectionBadge}>{badge}</span>}
        </div>
        <div className={styles.sectionTriggerRight}>
          <span className={styles.sectionOptional}>Optional</span>
          <ChevronIcon open={isOpen} />
        </div>
      </button>
      <div className={`${styles.sectionBody} ${isOpen ? styles.sectionBodyOpen : ''}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionContent}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function FieldGroup({ label, required, children }) {
  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldLabel}>
        <span>{label}</span>
        {required && <span className={styles.requiredDot} aria-label="required" />}
      </div>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, placeholder, unit, min = 0, step }) {
  return (
    <div className={styles.inputRow}>
      <input
        className={styles.input}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
      />
      {unit && <span className={styles.inputUnit}>{unit}</span>}
    </div>
  )
}

function DoseStepper({ value, onChange }) {
  const step = 0.25
  const min = 0.25
  const max = 5.0
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  return (
    <div className={styles.stepper}>
      <button className={styles.stepperBtn} onClick={dec} type="button" aria-label="Decrease dose" disabled={value <= min}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </button>
      <div className={styles.stepperVal}>
        <span className={styles.stepperNum}>{value.toFixed(2)}</span>
        <span className={styles.stepperUnit}>mg</span>
      </div>
      <button className={styles.stepperBtn} onClick={inc} type="button" aria-label="Increase dose" disabled={value >= max}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

function WaterCups({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, justifyContent: 'space-between' }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const filled = i < value
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(value === i + 1 ? i : i + 1)}
              style={{
                flex: 1, background: 'transparent', border: 0, padding: 0,
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
              }}
              title={`${i + 1} cup${i ? 's' : ''}`}
            >
              <svg width="22" height="28" viewBox="0 0 22 28" style={{ display: 'block' }}>
                <path
                  d="M3.5 3 L18.5 3 L17 25 Q17 26 16 26 L6 26 Q5 26 5 25 Z"
                  fill={filled ? T.ink : 'transparent'}
                  stroke={filled ? T.ink : T.hair2}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {filled && (
                  <line x1="6" y1="8" x2="16" y2="8" stroke={T.inkText} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
                )}
              </svg>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9,
                color: filled ? T.text : T.faint,
                letterSpacing: '0.04em', fontWeight: filled ? 600 : 400,
              }}>{i + 1}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onChange(Math.min(12, value + 1))}
          style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
          title="Add another cup"
        >
          <div style={{
            width: 22, height: 28, borderRadius: 4,
            border: `1px dashed ${T.hair2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.mute,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.04em' }}>+</span>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
          {value === 1 ? '1 CUP' : `${value} CUPS`} / 8 · ~64 OZ
        </span>
        <button type="button" onClick={() => onChange(0)} style={{
          background: 'transparent', border: 0, padding: '2px 6px', cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em',
        }}>RESET</button>
      </div>
    </div>
  )
}

function Toast({ visible, isUpdate }) {
  return (
    <div className={`${styles.toast} ${visible ? styles.toastVisible : ''}`} role="status" aria-live="polite">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {isUpdate ? 'Log updated.' : 'Log saved.'}
    </div>
  )
}

// ── Empty form values ─────────────────────────────────────────────────────────

function emptyForm(date) {
  return {
    calories: '', protein: '',
    activityType: 'Walk', activityDuration: '', steps: '',
    injectionDate: date, dose: 0.5,
    weight: '', mood: null,
    water: 0, sideEffects: [],
  }
}

function formFromEntry(entry, date) {
  return {
    calories:         entry.calories         ?? '',
    protein:          entry.protein          ?? '',
    activityType:     entry.activityType     ?? 'Walk',
    activityDuration: entry.activityDuration ?? '',
    steps:            entry.steps            ?? '',
    injectionDate:    entry.injectionDate    ?? date,
    dose:             entry.dose             ?? 0.5,
    weight:           entry.weight           ?? '',
    mood:             entry.mood             ?? null,
    water:            entry.water            ?? 0,
    sideEffects:      entry.sideEffects      ?? [],
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogToday({ logs, updateLog, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(todayISO)

  // Form fields
  const [calories, setCalories]               = useState('')
  const [protein, setProtein]                 = useState('')
  const [activityType, setActivityType]       = useState('Walk')
  const [activityDuration, setActivityDuration] = useState('')
  const [steps, setSteps]                     = useState('')
  const [injectionDate, setInjectionDate]     = useState(todayISO)
  const [dose, setDose]                       = useState(0.5)
  const [weight, setWeight]                   = useState('')

  const [mood, setMood]                       = useState(null)
  const [water, setWater]                     = useState(0)
  const [sideEffects, setSideEffects]         = useState([])
  const [hunger, setHunger]                   = useState(40)
  const [note, setNote]                       = useState('')

  // Section open state
  const [activityOpen, setActivityOpen]       = useState(false)
  const [injectionOpen, setInjectionOpen]     = useState(false)
  const [weightOpen, setWeightOpen]           = useState(false)
  const [waterOpen, setWaterOpen]             = useState(false)

  // Validation + feedback
  const [calError, setCalError]               = useState(false)
  const [protError, setProtError]             = useState(false)
  const [showToast, setShowToast]             = useState(false)
  const [lastSaveWasUpdate, setLastSaveWasUpdate] = useState(false)

  // Load form values whenever the selected date changes
  useEffect(() => {
    const entry = logs[selectedDate]
    if (entry) {
      const f = formFromEntry(entry, selectedDate)
      setCalories(f.calories)
      setProtein(f.protein)
      setActivityType(f.activityType)
      setActivityDuration(f.activityDuration)
      setSteps(f.steps)
      setInjectionDate(f.injectionDate)
      setDose(f.dose)
      setWeight(f.weight)
      // Auto-expand sections that have data
      setMood(f.mood)
      setWater(f.water)
      setSideEffects(f.sideEffects)
      setHunger(entry.hunger ?? 40)
      setNote(entry.note ?? '')
      setActivityOpen(!!f.activityDuration)
      setInjectionOpen(!!entry.dose)
      setWeightOpen(!!f.weight)
      setWaterOpen(!!f.water)
    } else {
      const f = emptyForm(selectedDate)
      setCalories(f.calories); setProtein(f.protein)
      setActivityType(f.activityType); setActivityDuration(f.activityDuration); setSteps(f.steps)
      setInjectionDate(f.injectionDate); setDose(f.dose)
      setWeight(f.weight); setMood(null)
      setWater(0); setSideEffects([])
      setHunger(40); setNote('')
      setActivityOpen(false); setInjectionOpen(false); setWeightOpen(false); setWaterOpen(false)
    }
    setCalError(false)
    setProtError(false)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const existingEntry = logs[selectedDate]
  const isExisting = !!existingEntry

  const headerDateLabel = formatDate(selectedDate)
  const titleDate = selectedDate === todayISO
    ? 'Today'
    : formatDate(selectedDate, { weekday: 'short', month: 'short', day: 'numeric' })

  const activityBadge  = activityDuration ? `${activityDuration} min` : null
  const injectionBadge = existingEntry?.dose ? `${Number(existingEntry.dose).toFixed(2)}mg` : null
  const weightBadge    = weight ? `${weight} kg` : null
  const waterBadge     = water > 0 ? `${water} / 8` : null

  function handleSave() {
    const missingCal  = !calories
    const missingProt = !protein
    setCalError(missingCal)
    setProtError(missingProt)
    if (missingCal || missingProt) return

    const values = {
      calories,
      protein,
      mood,
      sideEffects,
      hunger,
      note: note.trim() || null,
      // Only persist optional sections if they were opened
      activityType:     activityOpen ? activityType     : null,
      activityDuration: activityOpen ? activityDuration : null,
      steps:            activityOpen ? steps            : null,
      injectionDate:    injectionOpen ? injectionDate   : null,
      dose:             injectionOpen ? dose            : null,
      weight:           weightOpen ? weight             : null,
      water:            waterOpen ? water               : 0,
    }

    setLastSaveWasUpdate(isExisting)
    updateLog(selectedDate, values)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2800)
  }

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* Header */}
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => onNavigate('dashboard')}
            aria-label="Back to Dashboard" type="button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L7.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={styles.headerCenter}>
            <h1 className={styles.headerTitle}>Log — {titleDate}</h1>
            {isExisting && <p className={styles.headerSub}>Editing saved log</p>}
          </div>
          <div className={styles.headerSpacer} />
        </header>

        {/* Date selector */}
        <DateSelector value={selectedDate} onChange={setSelectedDate} />

        {/* Scrollable content */}
        <div className={styles.scrollContent}>

          {/* Nutrition — always expanded */}
          <div className={styles.nutritionCard}>
            <div className={styles.nutritionHeader}>
              <div className={styles.nutritionHeaderLeft}>
                <span className={styles.sectionIcon}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6c0 3 4.5 6.5 4.5 6.5S11.5 9 11.5 6c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.25"/>
                  </svg>
                </span>
                <span className={styles.sectionTitle}>Nutrition</span>
              </div>
              <span className={styles.requiredLabel}>Required</span>
            </div>

            <div className={styles.nutritionGrid}>
              <FieldGroup label="Calories" required>
                <NumberInput
                  value={calories}
                  onChange={v => { setCalories(v); setCalError(false) }}
                  placeholder="1,800"
                  unit="kcal"
                />
                {calError && <p className={styles.fieldError}>Please enter calories</p>}
              </FieldGroup>

              <FieldGroup label="Protein" required>
                <NumberInput
                  value={protein}
                  onChange={v => { setProtein(v); setProtError(false) }}
                  placeholder="140"
                  unit="g"
                />
                {protError && <p className={styles.fieldError}>Please enter protein</p>}
              </FieldGroup>
            </div>
          </div>

          {/* Activity */}
          <CollapsibleSection
            title="Movement"
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="9" cy="2.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M6.5 4.5L4 9.5h2.5L5 12.5M6.5 4.5l2 2-1.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            isOpen={activityOpen}
            onToggle={() => setActivityOpen(o => !o)}
            badge={activityBadge}
          >
            <FieldGroup label="Workout type">
              <div className={styles.selectWrap}>
                <select className={styles.select} value={activityType} onChange={e => setActivityType(e.target.value)}>
                  {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <svg className={styles.selectChevron} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Quick-select chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {['Walk','Run','Strength training','Cycle','Yoga','HIIT'].map(w => {
                  const on = activityType === w
                  return (
                    <button key={w} type="button" onClick={() => setActivityType(w)} style={{
                      padding: '6px 11px', borderRadius: 14,
                      border: `1px solid ${on ? T.ink : 'var(--border)'}`,
                      background: on ? T.ink : 'transparent',
                      color: on ? T.inkText : T.mute,
                      fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? 600 : 500,
                      letterSpacing: '-0.01em', cursor: 'pointer',
                    }}>{w}</button>
                  )
                })}
              </div>
            </FieldGroup>
            <FieldGroup label="Duration">
              <NumberInput value={activityDuration} onChange={setActivityDuration} placeholder="45" unit="min" />
              {/* Duration quick chips */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {DURATION_PRESETS.map(d => {
                  const on = String(activityDuration) === String(d)
                  return (
                    <button key={d} type="button" onClick={() => setActivityDuration(String(d))} style={{
                      flex: 1, padding: '7px 0', borderRadius: 10,
                      border: `1px solid ${on ? T.ink : 'var(--border)'}`,
                      background: on ? T.ink : 'transparent',
                      color: on ? T.inkText : T.mute,
                      fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? 600 : 500,
                      cursor: 'pointer',
                    }}>{d}</button>
                  )
                })}
              </div>
            </FieldGroup>
            <FieldGroup label="Steps (optional)">
              <NumberInput value={steps} onChange={setSteps} placeholder="6,000" />
            </FieldGroup>
          </CollapsibleSection>

          {/* GLP-1 Injection */}
          <CollapsibleSection
            title="GLP-1 Injection"
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-6 6-2.5.5.5-2.5 6-6Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 4l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            }
            isOpen={injectionOpen}
            onToggle={() => setInjectionOpen(o => !o)}
            badge={injectionBadge}
          >
            <FieldGroup label="Date">
              <input
                className={`${styles.input} ${styles.dateInput}`}
                type="date"
                value={injectionDate}
                max={todayISO}
                onChange={e => setInjectionDate(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Dose">
              <DoseStepper value={dose} onChange={setDose} />
            </FieldGroup>
          </CollapsibleSection>

          {/* Weight */}
          <CollapsibleSection
            title="Weight"
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="4.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M4.5 4.5A2.5 2.5 0 0 1 9.5 4.5" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M7 7.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            }
            isOpen={weightOpen}
            onToggle={() => setWeightOpen(o => !o)}
            badge={weightBadge}
          >
            <FieldGroup label="Weight">
              <NumberInput value={weight} onChange={setWeight} placeholder="83.4" unit="kg" step="0.1" />
            </FieldGroup>
          </CollapsibleSection>

          {/* Water intake */}
          <CollapsibleSection
            title="Water"
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5C7 1.5 3 5.5 3 8.5a4 4 0 0 0 8 0C11 5.5 7 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
            }
            isOpen={waterOpen}
            onToggle={() => setWaterOpen(o => !o)}
            badge={waterBadge}
          >
            <FieldGroup label="Cups today">
              <WaterCups value={water} onChange={setWater} />
            </FieldGroup>
          </CollapsibleSection>

          {/* Mood — text segmented */}
          <div className={styles.moodCard}>
            <div className={styles.moodHeader}>
              <span className={styles.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 8.5c.5.8 1.5 1.2 2 1.2s1.5-.4 2-1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="5" cy="5.5" r=".75" fill="currentColor"/>
                  <circle cx="9" cy="5.5" r=".75" fill="currentColor"/>
                </svg>
              </span>
              <span className={styles.sectionTitle}>Mood</span>
              <span className={styles.moodOptional}>Optional</span>
            </div>
            {/* Text-only mood buttons */}
            <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', margin: '8px 0 14px' }}>
              {MOODS.map(m => {
                const on = mood === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(prev => prev === m.value ? null : m.value)}
                    style={{
                      flex: 1, padding: '11px 0', border: 0, cursor: 'pointer',
                      background: on ? T.ink : 'transparent',
                      color: on ? T.inkText : T.text,
                      fontFamily: FONT.ui, fontSize: 13,
                      fontWeight: on ? 600 : 500, letterSpacing: '-0.01em',
                    }}
                  >{m.label}</button>
                )
              })}
            </div>

            {/* Hunger level slider */}
            <div className={styles.sideEffectsHeader}>
              <span className={styles.sectionTitle} style={{ fontSize: 12 }}>Hunger level</span>
              <span className={styles.moodOptional}>{hunger}<span style={{ opacity: 0.5 }}>/100</span></span>
            </div>
            <div style={{ padding: '4px 0 16px' }}>
              <div style={{ position: 'relative', height: 24 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 2, background: 'var(--border)', borderRadius: 1 }} />
                <div style={{ position: 'absolute', left: 0, top: 11, height: 2, width: `${hunger}%`, background: T.accent, borderRadius: 1 }} />
                <div style={{
                  position: 'absolute', top: '50%',
                  left: `${hunger}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 20, height: 20, borderRadius: 10, background: T.ink,
                  border: '3px solid #fff', boxShadow: `0 0 0 1px ${T.accent}`,
                  pointerEvents: 'none',
                }} />
                <input type="range" min="0" max="100" value={hunger}
                  onChange={e => setHunger(+e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
                <span>SUPPRESSED</span><span>NEUTRAL</span><span>RAVENOUS</span>
              </div>
            </div>

            <div className={styles.sideEffectsHeader}>
              <span className={styles.sectionTitle} style={{ fontSize: 12 }}>Side effects</span>
              <span className={styles.moodOptional}>Select all that apply</span>
            </div>
            <div className={styles.sideEffectsGrid}>
              {SIDE_EFFECTS.map(se => {
                const active = sideEffects.includes(se.value)
                return (
                  <button
                    key={se.value}
                    type="button"
                    className={`${styles.seBtn} ${active ? styles.seBtnActive : ''}`}
                    onClick={() => setSideEffects(prev =>
                      active ? prev.filter(v => v !== se.value) : [...prev, se.value]
                    )}
                  >
                    {se.label}
                  </button>
                )
              })}
            </div>

            {/* Note */}
            <div style={{ marginTop: 16 }}>
              <div className={styles.sideEffectsHeader} style={{ marginBottom: 8 }}>
                <span className={styles.sectionTitle} style={{ fontSize: 12 }}>Note</span>
                <span className={styles.moodOptional}>Optional</span>
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="How did today go? Any observations…"
                rows={3}
                style={{
                  width: '100%', border: '1px solid var(--border)', outline: 0, resize: 'none',
                  borderRadius: 10, padding: '10px 12px', boxSizing: 'border-box',
                  fontFamily: FONT.ui, fontSize: 14, color: T.text, background: 'var(--surface)',
                  letterSpacing: '-0.01em', lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          <div className={styles.saveSpacor} />
        </div>

        {/* Save button */}
        <div className={styles.saveArea}>
          <button className={styles.saveBtn} onClick={handleSave} type="button">
            {isExisting ? 'Save Changes' : 'Save Log'}
          </button>
        </div>

        <Toast visible={showToast} isUpdate={lastSaveWasUpdate} />
      </div>

      {/* Fixed tab bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <TabBar active="log" onTab={onNavigate} />
      </div>
    </div>
  )
}
