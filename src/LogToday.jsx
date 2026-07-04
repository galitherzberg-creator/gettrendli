import { useState, useEffect, useRef } from 'react'
import { todayISO, isoDate, formatDate } from './logStore'
import { T, FONT, Eyebrow } from './tokens'
import FoodSearch from './FoodSearch'

// ── Constants ────────────────────────────────────────────────────────────────

const MOODS = ['Low', 'Off', 'OK', 'Good', 'Great']

const SIDE_EFFECTS = [
  'Nausea', 'Fatigue', 'Headache', 'Constipation',
  'Heartburn', 'Bloating', 'Injection site', 'None',
]

const ACTIVITY_CHIPS = ['Walk', 'Run', 'Gym', 'Cycle', 'Yoga', 'HIIT', 'Swim', 'Pilates']
const DURATION_PRESETS = [15, 30, 45, 60, 90]
const STEP_GOALS = [5000, 7500, 10000, 12500, 15000]

// ── Helpers ──────────────────────────────────────────────────────────────────

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmtStepGoal(n) {
  return n >= 1000 ? `${n / 1000}K` : String(n)
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.hair}`,
      borderRadius: 16,
      padding: '18px 18px 16px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Water cups ───────────────────────────────────────────────────────────────

function WaterCups({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
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
                alignItems: 'center', gap: 3,
              }}
            >
              <svg width="20" height="26" viewBox="0 0 22 28" style={{ display: 'block' }}>
                <path
                  d="M3.5 3 L18.5 3 L17 25 Q17 26 16 26 L6 26 Q5 26 5 25 Z"
                  fill={filled ? T.ink : 'transparent'}
                  stroke={filled ? T.ink : T.hair2}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {filled && (
                  <line x1="6" y1="8" x2="16" y2="8" stroke={T.inkText} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
                )}
              </svg>
              <span style={{
                fontFamily: FONT.mono, fontSize: 8,
                color: filled ? T.text : T.faint,
                letterSpacing: '0.04em', fontWeight: filled ? 600 : 400,
              }}>{i + 1}</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
            {value > 8 ? `${value} CUPS TOTAL` : 'CUPS · ~250 ML EACH'}
          </span>
          {/* 9+ controls */}
          {value > 8 && (
            <button type="button" onClick={() => onChange(value - 1)} style={{
              background: T.surf2, border: `1px solid ${T.hair}`, borderRadius: 6,
              padding: '1px 7px', cursor: 'pointer',
              fontFamily: FONT.mono, fontSize: 13, color: T.mute, lineHeight: 1.4,
            }}>−</button>
          )}
          <button type="button" onClick={() => onChange(value + 1)} style={{
            background: T.surf2, border: `1px solid ${T.hair}`, borderRadius: 6,
            padding: '1px 7px', cursor: 'pointer',
            fontFamily: FONT.mono, fontSize: 13, color: T.text, lineHeight: 1.4,
            fontWeight: 600,
          }}>+</button>
        </div>
        <button type="button" onClick={() => onChange(0)} style={{
          background: 'transparent', border: 0, padding: '2px 0', cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em',
        }}>RESET</button>
      </div>
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, goal, color = T.accent }) {
  const pct = parseFloat(goal) > 0 ? Math.min(100, (parseFloat(value) / parseFloat(goal)) * 100) : 0
  return (
    <div style={{ height: 3, background: T.hair, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

// ── Macro input ──────────────────────────────────────────────────────────────

function MacroInput({ label, value, onChange, goal, unit, placeholder }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: '0.12em', color: T.mute, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', border: 0, outline: 0, background: 'transparent',
            fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 32,
            fontWeight: 400, color: T.text, letterSpacing: '-0.02em',
            lineHeight: 1, padding: 0,
          }}
        />
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.faint, letterSpacing: '0.06em', marginTop: 2 }}>
        {unit}{goal ? ` · goal ${goal}` : ''}
      </div>
      {goal && value && <ProgressBar value={value} goal={goal} />}
    </div>
  )
}

// ── Date navigator (header date picker) ──────────────────────────────────────

function DateNavBar({ value, onChange }) {
  const inputRef = useRef(null)
  const isToday  = value === todayISO

  const dayLabel = new Date(value + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
  const dateLabel = new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={() => onChange(addDays(value, -1))}
        style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: T.mute }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button
        type="button"
        onClick={() => { try { inputRef.current?.showPicker() } catch {} }}
        style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 10, color: T.text,
          letterSpacing: '0.10em', fontWeight: 600,
        }}
      >
        DAILY LOG / {dayLabel.toUpperCase()} · {dateLabel}
        {isToday && (
          <span style={{
            marginLeft: 6, fontFamily: FONT.mono, fontSize: 8,
            background: T.accentSoft, color: T.accentDark,
            padding: '2px 5px', borderRadius: 4, letterSpacing: '0.08em',
          }}>TODAY</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value}
        max={todayISO}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => onChange(addDays(value, 1))}
        disabled={isToday}
        style={{ background: 'transparent', border: 0, padding: 4, cursor: isToday ? 'default' : 'pointer', color: isToday ? T.hair : T.mute }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogToday({ logs, updateLog, userSettings = {}, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(todayISO)

  // Core fields
  const [weight,           setWeight]           = useState('')
  const [weightEditing,    setWeightEditing]     = useState(false)
  const [weightRaw,        setWeightRaw]         = useState('')  // raw typed string while editing
  const [calories,         setCalories]          = useState('')
  const [protein,          setProtein]           = useState('')
  const [fat,              setFat]               = useState('')
  const [fiber,            setFiber]             = useState('')
  const [foods,            setFoods]             = useState([])   // logged foods (from search)
  const [foodSearchOpen,   setFoodSearchOpen]    = useState(false)
  const [water,            setWater]             = useState(0)
  const [mood,             setMood]              = useState(null)
  const [sideEffects,      setSideEffects]       = useState([])
  const [hunger,           setHunger]            = useState(40)
  const [note,             setNote]              = useState('')

  // Movement
  const [workoutName,      setWorkoutName]       = useState('')
  const [workoutDate,      setWorkoutDate]       = useState('')
  const [activityType,     setActivityType]      = useState('')
  const [activityDuration, setActivityDuration]  = useState('')

  // Steps
  const [steps,            setSteps]             = useState('')
  const [stepsGoal,        setStepsGoal]         = useState(10000)

  // Injection (carried over)
  const [injectionDate,    setInjectionDate]     = useState(todayISO)
  const [dose,             setDose]              = useState(0.5)

  // Toast
  const [showToast,        setShowToast]         = useState(false)
  const [toastIsUpdate,    setToastIsUpdate]     = useState(false)

  const weightInputRef = useRef(null)

  const { proteinGoal, fiberGoal, unitSystem = 'metric' } = userSettings
  const isMetric = unitSystem !== 'us'
  const wUnit    = isMetric ? 'kg' : 'lb'
  function wFmt(kg, dec = 1) {
    if (!kg && kg !== 0) return ''
    const v = isMetric ? parseFloat(kg) : parseFloat(kg) * 2.2046
    return v.toFixed(dec)
  }
  function wParse(display) {
    const v = parseFloat(display)
    if (isNaN(v)) return ''
    return isMetric ? String(v) : String(Math.round((v / 2.2046) * 10) / 10)
  }

  // Load form values when date changes
  useEffect(() => {
    const entry = logs[selectedDate]
    if (entry) {
      setWeight(entry.weight ?? '')
      setCalories(entry.calories ?? '')
      setProtein(entry.protein ?? '')
      setFat(entry.fat ?? '')
      setFiber(entry.fiber ?? '')
      setFoods(entry.foods ?? [])
      setWater(entry.water ?? 0)
      setMood(entry.mood ?? null)
      setSideEffects(entry.sideEffects ?? [])
      setHunger(entry.hunger ?? 40)
      setNote(entry.note ?? '')
      setWorkoutName(entry.workoutName ?? '')
      setWorkoutDate(entry.workoutDate ?? '')
      setActivityType(entry.activityType ?? '')
      setActivityDuration(entry.activityDuration ?? '')
      setSteps(entry.steps ?? '')
      setStepsGoal(entry.stepsGoal ?? 10000)
      setInjectionDate(entry.injectionDate ?? selectedDate)
      setDose(entry.dose ?? 0.5)
    } else {
      setWeight(''); setCalories(''); setProtein(''); setFat(''); setFiber(''); setFoods([])
      setWater(0); setMood(null); setSideEffects([]); setHunger(40); setNote('')
      setWorkoutName(''); setWorkoutDate(''); setActivityType(''); setActivityDuration('')
      setSteps(''); setStepsGoal(10000)
      setInjectionDate(selectedDate); setDose(0.5)
    }
    setWeightEditing(false)
    setWeightRaw('')
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const rawWeight = weight ? wParse(wFmt(weight)) || weight : ''
    updateLog(selectedDate, {
      weight:           rawWeight || null,
      calories:         calories || null,
      protein:          protein  || null,
      fat:              fat      || null,
      fiber:            fiber    || null,
      foods:            foods.length ? foods : null,
      water,
      mood,
      sideEffects,
      hunger,
      note:             note.trim() || null,
      workoutName:      workoutName.trim() || null,
      workoutDate:      workoutDate || null,
      activityType:     activityType || null,
      activityDuration: activityDuration || null,
      steps:            steps || null,
      stepsGoal,
      injectionDate:    injectionDate || null,
      dose,
    })
    setToastIsUpdate(!!logs[selectedDate])
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      onNavigate('dashboard')
    }, 1200)
  }

  // Add a food from search: append to the list and roll its macros into the
  // Calories/Protein/Fat/Fiber totals (which remain manually editable).
  function handleAddFood(food) {
    setFoods(prev => [...prev, food])
    const add = (cur, n) => String(+(Math.round(((parseFloat(cur) || 0) + (n || 0)) * 10) / 10))
    setCalories(cur => add(cur, food.kcal))
    setProtein(cur => add(cur, food.protein))
    setFat(cur => add(cur, food.fat))
    setFiber(cur => add(cur, food.fiber))
    setFoodSearchOpen(false)
  }

  // Remove a logged food and subtract its macros back out (never below 0).
  function handleRemoveFood(idx) {
    const food = foods[idx]
    if (!food) return
    setFoods(prev => prev.filter((_, i) => i !== idx))
    const sub = (cur, n) => {
      const v = Math.max(0, Math.round(((parseFloat(cur) || 0) - (n || 0)) * 10) / 10)
      return v ? String(v) : ''
    }
    setCalories(cur => sub(cur, food.kcal))
    setProtein(cur => sub(cur, food.protein))
    setFat(cur => sub(cur, food.fat))
    setFiber(cur => sub(cur, food.fiber))
  }

  const existingEntry = logs[selectedDate]
  const displayWeight = weight ? wFmt(weight) : ''
  const stepsNum = parseFloat(steps) || 0

  return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Modal header ──────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 10px',
        background: T.card, borderBottom: `1px solid ${T.hair}`,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          style={{
            background: 'transparent', border: 0, padding: '4px 0',
            fontFamily: FONT.ui, fontSize: 14, color: T.mute,
            cursor: 'pointer', letterSpacing: '-0.01em', minWidth: 52,
          }}
        >
          Cancel
        </button>

        <DateNavBar value={selectedDate} onChange={setSelectedDate} />

        <button
          type="button"
          onClick={handleSave}
          style={{
            background: 'transparent', border: 0, padding: '4px 0',
            fontFamily: FONT.ui, fontSize: 14, fontWeight: 600,
            color: T.accent, cursor: 'pointer', letterSpacing: '-0.01em',
            minWidth: 52, textAlign: 'right',
          }}
        >
          Save
        </button>
      </header>

      {/* ── Scroll content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Weight hero (inverted) ─────────────────────────────── */}
        <div
          style={{
            background: T.ink, borderRadius: 20,
            padding: '20px 22px 22px',
            cursor: weightEditing ? 'default' : 'text',
          }}
          onClick={() => {
            if (!weightEditing) {
              setWeightEditing(true)
              setWeightRaw(displayWeight)
              setTimeout(() => { weightInputRef.current?.focus(); weightInputRef.current?.select() }, 50)
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Eyebrow style={{ color: 'rgba(250,250,247,0.5)', fontSize: 9, letterSpacing: '0.14em' }}>
              Today's weight
            </Eyebrow>
            {!weightEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 10l2.5-.5 5.5-5.5-2-2L2.5 7.5 2 10Z" stroke="rgba(250,250,247,0.4)" strokeWidth="1.1" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: FONT.mono, fontSize: 8, color: 'rgba(250,250,247,0.4)', letterSpacing: '0.10em' }}>
                  TAP TO EDIT
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {weightEditing ? (
              <input
                ref={weightInputRef}
                type="number"
                inputMode="decimal"
                value={weightRaw}
                onChange={e => setWeightRaw(e.target.value)}
                onBlur={() => {
                  const parsed = parseFloat(weightRaw)
                  if (!isNaN(parsed) && parsed > 0) {
                    const kg = isMetric ? parsed : parsed / 2.2046
                    setWeight(String(parseFloat(kg.toFixed(2))))
                  } else if (weightRaw === '') {
                    setWeight('')
                  }
                  setWeightEditing(false)
                }}
                onKeyDown={e => { if (e.key === 'Enter') weightInputRef.current?.blur() }}
                placeholder="—"
                style={{
                  background: 'transparent', border: 0,
                  borderBottom: `1px solid rgba(250,250,247,0.3)`,
                  outline: 0, padding: '0 0 4px',
                  fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 64,
                  fontWeight: 400, color: T.inkText, letterSpacing: '-0.02em',
                  lineHeight: 0.9, width: 160,
                }}
              />
            ) : (
              <span style={{
                fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 64,
                fontWeight: 400, color: displayWeight ? T.inkText : 'rgba(250,250,247,0.2)',
                letterSpacing: '-0.02em', lineHeight: 0.9,
              }}>
                {displayWeight || '—'}
              </span>
            )}
            <span style={{
              fontFamily: FONT.mono, fontSize: 14, color: 'rgba(250,250,247,0.5)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{wUnit}</span>
          </div>
        </div>

        {/* ── Mood ─────────────────────────────────────────────────── */}
        <SectionCard>
          <Eyebrow style={{ marginBottom: 12 }}>Mood</Eyebrow>
          <div style={{
            display: 'flex', background: T.surf2,
            borderRadius: 10, overflow: 'hidden',
            border: `1px solid ${T.hair}`,
          }}>
            {MOODS.map(m => {
              const on = mood === m.toLowerCase()
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(prev => prev === m.toLowerCase() ? null : m.toLowerCase())}
                  style={{
                    flex: 1, padding: '12px 0', border: 0, cursor: 'pointer',
                    background: on ? T.ink : 'transparent',
                    color: on ? T.inkText : T.mute,
                    fontFamily: FONT.ui, fontSize: 13,
                    fontWeight: on ? 600 : 500, letterSpacing: '-0.01em',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >{m}</button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Side effects ─────────────────────────────────────────── */}
        <SectionCard>
          <Eyebrow style={{ marginBottom: 12 }}>Side effects</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SIDE_EFFECTS.map(se => {
              const active = sideEffects.includes(se.toLowerCase().replace(/ /g, '-'))
              return (
                <button
                  key={se}
                  type="button"
                  onClick={() => {
                    const key = se.toLowerCase().replace(/ /g, '-')
                    setSideEffects(prev =>
                      active ? prev.filter(v => v !== key) : [...prev, key]
                    )
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 13px', borderRadius: 20,
                    border: `1px solid ${active ? T.ink : T.hair}`,
                    background: active ? T.ink : T.card,
                    color: active ? T.inkText : T.text,
                    fontFamily: FONT.ui, fontSize: 12, fontWeight: 500,
                    letterSpacing: '-0.01em', cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {active && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke={T.inkText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {se}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Hunger level ─────────────────────────────────────────── */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Eyebrow>Hunger level</Eyebrow>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.text, letterSpacing: '0.04em', fontWeight: 600 }}>
              {hunger}<span style={{ opacity: 0.4 }}>/100</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: 24 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 2, background: T.hair, borderRadius: 1 }} />
            <div style={{ position: 'absolute', left: 0, top: 11, height: 2, width: `${hunger}%`, background: T.accent, borderRadius: 1 }} />
            <div style={{
              position: 'absolute', top: '50%',
              left: `${hunger}%`,
              transform: 'translate(-50%, -50%)',
              width: 20, height: 20, borderRadius: 10, background: T.ink,
              border: '3px solid #fff', boxShadow: `0 0 0 1.5px ${T.accent}`,
              pointerEvents: 'none',
            }} />
            <input
              type="range" min="0" max="100" value={hunger}
              onChange={e => setHunger(+e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT.mono, fontSize: 8, color: T.faint, letterSpacing: '0.10em' }}>
            <span>SUPPRESSED</span><span>NEUTRAL</span><span>RAVENOUS</span>
          </div>
        </SectionCard>

        {/* ── Intake ───────────────────────────────────────────────── */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Eyebrow>Intake</Eyebrow>
            <button
              type="button"
              onClick={() => setFoodSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 20,
                border: `1px solid ${T.accentHair}`, background: T.accentSoft,
                color: T.accentDark, cursor: 'pointer',
                fontFamily: FONT.mono, fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3.5 3.5"/>
              </svg>
              SEARCH FOOD
            </button>
          </div>

          {/* Logged foods (from search) */}
          {foods.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {foods.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, padding: '8px 10px', borderRadius: 10, background: T.surf2,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 500, color: T.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: T.mute, letterSpacing: '0.04em', marginTop: 1 }}>
                      {f.grams}G · {f.kcal} KCAL · {f.protein}G PROT{f.fiber ? ` · ${f.fiber}G FIBER` : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemoveFood(i)} style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 11, padding: 0, cursor: 'pointer',
                    border: `1px solid ${T.hair}`, background: T.card, color: T.mute,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'start' }}>
            <MacroInput
              label="CALORIES"
              value={calories}
              onChange={setCalories}
              goal={null}
              unit="kcal"
              placeholder="—"
            />
            <div style={{ background: T.hair, alignSelf: 'stretch', margin: '4px 12px' }} />
            <MacroInput
              label="PROTEIN"
              value={protein}
              onChange={setProtein}
              goal={proteinGoal ? `${proteinGoal}g` : null}
              unit="g"
              placeholder="—"
            />
          </div>
          <div style={{ height: 1, background: T.hair, margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'start' }}>
            <MacroInput
              label="FAT"
              value={fat}
              onChange={setFat}
              goal={null}
              unit="g"
              placeholder="—"
            />
            <div style={{ background: T.hair, alignSelf: 'stretch', margin: '4px 12px' }} />
            <MacroInput
              label="FIBER"
              value={fiber}
              onChange={setFiber}
              goal={fiberGoal ? `${fiberGoal}g` : null}
              unit="g"
              placeholder="—"
            />
          </div>
        </SectionCard>

        {/* ── Water ────────────────────────────────────────────────── */}
        <SectionCard>
          <Eyebrow style={{ marginBottom: 14 }}>Water</Eyebrow>
          <WaterCups value={water} onChange={setWater} />
        </SectionCard>

        {/* ── Movement ─────────────────────────────────────────────── */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Eyebrow>Movement</Eyebrow>
            {/* Workout date pill */}
            <WorkoutDatePill value={workoutDate} onChange={setWorkoutDate} defaultDate={selectedDate} />
          </div>

          {/* Workout name */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>
              WORKOUT
            </div>
            <input
              type="text"
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              placeholder="e.g. Morning run, leg day…"
              style={{
                width: '100%', border: 0, borderBottom: `1px solid ${T.hair}`,
                outline: 0, background: 'transparent', padding: '4px 0 8px',
                fontFamily: FONT.ui, fontSize: 15, color: T.text,
                letterSpacing: '-0.01em', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Activity chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {ACTIVITY_CHIPS.map(a => {
              const on = activityType === a
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setActivityType(prev => prev === a ? '' : a)}
                  style={{
                    padding: '7px 13px', borderRadius: 20,
                    border: `1px solid ${on ? T.ink : T.hair}`,
                    background: on ? T.ink : 'transparent',
                    color: on ? T.inkText : T.mute,
                    fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? 600 : 500,
                    letterSpacing: '-0.01em', cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >{a}</button>
              )
            })}
          </div>

          {/* Duration */}
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.12em', marginBottom: 8 }}>
            DURATION
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <input
              type="number"
              inputMode="numeric"
              value={activityDuration}
              onChange={e => setActivityDuration(e.target.value)}
              placeholder="—"
              style={{
                background: 'transparent', border: 0,
                borderBottom: `1px solid ${activityDuration ? T.hair : 'transparent'}`,
                outline: 0, padding: '0 0 2px',
                fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 48,
                fontWeight: 400, color: activityDuration ? T.text : T.faint,
                letterSpacing: '-0.02em', lineHeight: 1, width: 110,
              }}
            />
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mute, letterSpacing: '0.08em' }}>MIN</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DURATION_PRESETS.map(d => {
              const on = String(activityDuration) === String(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActivityDuration(prev => String(prev) === String(d) ? '' : String(d))}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    border: `1px solid ${on ? T.ink : T.hair}`,
                    background: on ? T.ink : 'transparent',
                    color: on ? T.inkText : T.mute,
                    fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? 600 : 500,
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >{d}</button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Daily steps ─────────────────────────────────────────── */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Eyebrow>Daily steps</Eyebrow>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
              GOAL · {fmtStepGoal(stepsGoal)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <input
              type="number"
              inputMode="numeric"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder="—"
              style={{
                background: 'transparent', border: 0,
                borderBottom: `1px solid ${steps ? T.hair : 'transparent'}`,
                outline: 0, padding: '0 0 2px',
                fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 52,
                fontWeight: 400, color: steps ? T.text : T.faint,
                letterSpacing: '-0.02em', lineHeight: 1, width: 180,
              }}
            />
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mute, letterSpacing: '0.08em' }}>STEPS</span>
          </div>

          <ProgressBar value={stepsNum} goal={stepsGoal} />

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {STEP_GOALS.map(g => {
              const on = stepsGoal === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setStepsGoal(g)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 10,
                    border: `1px solid ${on ? T.ink : T.hair}`,
                    background: on ? T.ink : 'transparent',
                    color: on ? T.inkText : T.mute,
                    fontFamily: FONT.mono, fontSize: 9, fontWeight: on ? 600 : 500,
                    letterSpacing: '0.04em', cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >{fmtStepGoal(g)}</button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Note ─────────────────────────────────────────────────── */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Eyebrow>Note</Eyebrow>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em' }}>
              {note.length}/280
            </span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 280))}
            placeholder="How did today go? Any observations…"
            rows={3}
            style={{
              width: '100%', border: `1px solid ${T.hair}`, outline: 0, resize: 'none',
              borderRadius: 10, padding: '10px 12px', boxSizing: 'border-box',
              fontFamily: FONT.ui, fontSize: 14, color: T.text, background: T.surf2,
              letterSpacing: '-0.01em', lineHeight: 1.5,
            }}
          />
        </SectionCard>

      </div>

      {/* ── Fixed Save button ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 32px',
        background: `linear-gradient(to bottom, transparent, ${T.bg} 30%)`,
        pointerEvents: 'none',
      }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 100,
            background: T.ink, color: T.inkText, border: 0,
            fontFamily: FONT.ui, fontSize: 15, fontWeight: 600,
            letterSpacing: '-0.01em', cursor: 'pointer',
            pointerEvents: 'all',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          }}
        >
          {existingEntry ? 'Update log' : 'Save log'}
        </button>
      </div>

      {/* ── Toast ────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 100, left: '50%', transform: `translateX(-50%) translateY(${showToast ? 0 : 20}px)`,
        opacity: showToast ? 1 : 0, transition: 'all 0.25s',
        background: T.ink, color: T.inkText,
        borderRadius: 20, padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: FONT.ui, fontSize: 13, fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 50,
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke={T.accent} strokeWidth="1.25"/>
          <path d="M5 8l2.5 2.5L11 5.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {toastIsUpdate ? 'Log updated' : 'Log saved'}
      </div>

      {/* ── Food search overlay ───────────────────────────────────── */}
      {foodSearchOpen && (
        <FoodSearch onAdd={handleAddFood} onClose={() => setFoodSearchOpen(false)} />
      )}

    </div>
  )
}

// ── Workout date pill ─────────────────────────────────────────────────────────

function WorkoutDatePill({ value, onChange, defaultDate }) {
  const inputRef = useRef(null)
  const active   = !!value
  const label    = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'WORKOUT DATE'

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { try { inputRef.current?.showPicker() } catch {} }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 20,
          border: `1px solid ${active ? T.ink : T.hair}`,
          background: active ? T.ink : 'transparent',
          color: active ? T.inkText : T.mute,
          fontFamily: FONT.mono, fontSize: 9,
          letterSpacing: '0.08em', cursor: 'pointer',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <rect x="1" y="1.5" width="10" height="9" rx="1.5"/>
          <path d="M4 1v1.5M8 1v1.5M1 5h10"/>
        </svg>
        {label}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value || defaultDate}
        max={todayISO}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
