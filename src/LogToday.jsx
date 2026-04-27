import { useState, useEffect, useRef } from 'react'
import { todayISO, isoDate, formatDate } from './logStore'
import styles from './LogToday.module.css'

const ACTIVITY_TYPES = ['Walk', 'Run', 'Gym', 'Swim', 'Other']

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
    weight: '',
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

  // Section open state
  const [activityOpen, setActivityOpen]       = useState(false)
  const [injectionOpen, setInjectionOpen]     = useState(false)
  const [weightOpen, setWeightOpen]           = useState(false)

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
      setActivityOpen(!!f.activityDuration)
      setInjectionOpen(!!entry.dose)
      setWeightOpen(!!f.weight)
    } else {
      const f = emptyForm(selectedDate)
      setCalories(f.calories); setProtein(f.protein)
      setActivityType(f.activityType); setActivityDuration(f.activityDuration); setSteps(f.steps)
      setInjectionDate(f.injectionDate); setDose(f.dose)
      setWeight(f.weight)
      setActivityOpen(false); setInjectionOpen(false); setWeightOpen(false)
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

  function handleSave() {
    const missingCal  = !calories
    const missingProt = !protein
    setCalError(missingCal)
    setProtError(missingProt)
    if (missingCal || missingProt) return

    const values = {
      calories,
      protein,
      // Only persist optional sections if they were opened
      activityType:     activityOpen ? activityType     : null,
      activityDuration: activityOpen ? activityDuration : null,
      steps:            activityOpen ? steps            : null,
      injectionDate:    injectionOpen ? injectionDate   : null,
      dose:             injectionOpen ? dose            : null,
      weight:           weightOpen ? weight : null,
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
            title="Activity"
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
            <FieldGroup label="Type">
              <div className={styles.selectWrap}>
                <select className={styles.select} value={activityType} onChange={e => setActivityType(e.target.value)}>
                  {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <svg className={styles.selectChevron} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </FieldGroup>
            <div className={styles.twoCol}>
              <FieldGroup label="Duration">
                <NumberInput value={activityDuration} onChange={setActivityDuration} placeholder="45" unit="min" />
              </FieldGroup>
              <FieldGroup label="Steps (optional)">
                <NumberInput value={steps} onChange={setSteps} placeholder="6,000" />
              </FieldGroup>
            </div>
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
    </div>
  )
}
