import { useState } from 'react'
import { T, FONT, Eyebrow, Toggle } from './tokens'

// ── Constants ──────────────────────────────────────────────────────────────────

const MEDICATIONS = [
  { id: 'semaglutide', name: 'Semaglutide', brands: 'OZEMPIC · WEGOVY'    },
  { id: 'tirzepatide', name: 'Tirzepatide', brands: 'MOUNJARO · ZEPBOUND' },
  { id: 'liraglutide', name: 'Liraglutide', brands: 'SAXENDA · VICTOZA'   },
]

const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PACE_MAP   = [0.5, 1.0, 2.0]
const PACE_LABEL = ['Gentle · 0.5', 'Steady · 1.0', 'Aggressive · 2.0']

/** Returns the ISO date of the most-recent occurrence of dayIndex (0=Sun…6=Sat) */
function lastOccurrence(dayIndex) {
  const today = new Date()
  const diff  = (today.getDay() - dayIndex + 7) % 7
  const d     = new Date(today)
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

// ── Shared UI pieces ───────────────────────────────────────────────────────────

function StepShell({ step, onBack, children, footer }) {
  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 430, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 22px 0' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? T.accent : T.hair,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Back / step counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 0' }}>
          {step > 1 ? (
            <button onClick={onBack} style={{
              background: 'none', border: 0, padding: 0, cursor: 'pointer',
              fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
              BACK
            </button>
          ) : <div style={{ width: 48 }} />}
          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.1em' }}>
            STEP 0{step} / 03
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 22px 0' }}>
          {children}
          <div style={{ height: 24 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 22px 44px' }}>{footer}</div>
      </div>
    </div>
  )
}

function BigBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 52, borderRadius: 26,
      background: T.ink, color: T.inkText, border: 0, cursor: 'pointer',
      fontFamily: FONT.ui, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      {label}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  )
}

function GhostBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'center', marginBottom: 12,
      background: 'none', border: 0, cursor: 'pointer',
      fontFamily: FONT.ui, fontSize: 13, color: T.mute,
      textDecoration: 'underline', textDecorationColor: T.hair,
      textUnderlineOffset: 3,
    }}>
      {label}
    </button>
  )
}

// ── Step 1 — Welcome ───────────────────────────────────────────────────────────

function Step1({ name, setName, pronouns, setPronouns, onNext, onAnonymous, onBack }) {
  const [err, setErr] = useState(false)

  function handleNext() {
    if (!name.trim()) { setErr(true); return }
    onNext()
  }

  return (
    <StepShell step={1} onBack={onBack}
      footer={
        <>
          <GhostBtn label="I'd rather stay anonymous" onClick={onAnonymous} />
          <BigBtn label="Continue" onClick={handleNext} />
        </>
      }
    >
      <Eyebrow style={{ marginBottom: 16 }}>01 · Welcome</Eyebrow>

      <h1 style={{
        fontFamily: FONT.ui, fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 10, color: T.text,
      }}>
        Let's start with your name.
      </h1>
      <p style={{ fontFamily: FONT.ui, fontSize: 15, color: T.mute, lineHeight: 1.5, marginBottom: 36 }}>
        Trendli is a quiet companion through your protocol.
      </p>

      {/* Name — large serif italic input */}
      <div style={{ position: 'relative', marginBottom: 36 }}>
        <span style={{
          position: 'absolute', right: 0, top: 0,
          fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em',
        }}>NAME</span>
        <input
          value={name}
          autoFocus
          placeholder="Elena"
          onChange={e => { setName(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none', outline: 'none',
            borderBottom: `1.5px solid ${err ? '#C0392B' : T.hair}`,
            paddingTop: 22, paddingBottom: 10,
            fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 36,
            color: T.text, letterSpacing: '-0.02em',
          }}
        />
        {err && (
          <p style={{ fontFamily: FONT.ui, fontSize: 12, color: '#C0392B', marginTop: 6 }}>
            Please enter your name to continue.
          </p>
        )}
      </div>

      {/* Pronouns */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 12 }}>
          PRONOUNS (OPTIONAL)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['She / her', 'He / him', 'They / them', 'Custom'].map(p => {
            const on = pronouns === p
            return (
              <button key={p} onClick={() => setPronouns(on ? '' : p)} style={{
                padding: '8px 14px', borderRadius: 20,
                border: `1px solid ${on ? T.ink : T.hair}`,
                background: on ? T.ink : 'transparent',
                color: on ? T.inkText : T.text,
                fontFamily: FONT.ui, fontSize: 13, fontWeight: on ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{p}</button>
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: '#F3F2EE', borderRadius: 10, padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.mute} strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/>
        </svg>
        <p style={{ fontFamily: FONT.ui, fontSize: 12, color: T.text, lineHeight: 1.5, margin: 0 }}>
          Trendli isn't a diagnosis tool. Always follow your prescribing clinician's plan.
        </p>
      </div>
    </StepShell>
  )
}

// ── Step 2 — The Numbers ───────────────────────────────────────────────────────

function Step2({ goalType, setGoalType, startWeight, setStartWeight, goalWeight, setGoalWeight, pace, setPace, onNext, onBack }) {
  const [err, setErr] = useState(false)

  function handleNext() {
    if (!startWeight || !goalWeight) { setErr(true); return }
    onNext()
  }

  const Stepper = ({ value, onChange, color = T.mute }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <button onClick={() => onChange(v => Math.max(30, +(v - 0.5).toFixed(1)))}
        style={{ background: 'none', border: 0, color, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>−</button>
      <span style={{ fontFamily: FONT.mono, fontSize: 9, color, letterSpacing: '0.12em' }}>EDIT</span>
      <button onClick={() => onChange(v => +(v + 0.5).toFixed(1))}
        style={{ background: 'none', border: 0, color, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>+</button>
    </div>
  )

  return (
    <StepShell step={2} onBack={onBack}
      footer={<BigBtn label="Continue" onClick={handleNext} />}
    >
      <Eyebrow style={{ marginBottom: 16 }}>02 · The Numbers</Eyebrow>

      <h1 style={{
        fontFamily: FONT.ui, fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 28, color: T.text,
      }}>
        Where you are, where you're going.
      </h1>

      {/* Goal type tiles */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 10 }}>
          WHAT'S YOUR GOAL?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { id: 'lose', label: 'Lose weight', sub: 'BODY RECOMPOSITION', d: 'M6 9l6 6 6-6' },
            { id: 'gain', label: 'Build muscle', sub: 'GAIN · LEAN MASS',  d: 'M6 15l6-6 6 6' },
          ].map(g => {
            const on = goalType === g.id
            return (
              <button key={g.id} onClick={() => setGoalType(g.id)} style={{
                padding: 14, textAlign: 'left', cursor: 'pointer',
                background: on ? T.ink : 'transparent',
                color: on ? T.inkText : T.text,
                border: `1px solid ${on ? T.ink : T.hair}`,
                borderRadius: 14, fontFamily: FONT.ui,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: on ? '#1a1a1a' : '#F3F2EE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={g.d}/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{g.label}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: '0.08em', opacity: 0.6, marginTop: 3 }}>{g.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Weight — TODAY / GOAL side-by-side cards */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 10 }}>WEIGHT</div>
        {err && <p style={{ fontFamily: FONT.ui, fontSize: 12, color: '#C0392B', marginBottom: 8 }}>Please set your current and goal weight.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TODAY — inverted black */}
          <div style={{ background: T.ink, borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: '#7a7a7a', letterSpacing: '0.12em', marginBottom: 6 }}>TODAY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 44, color: T.inkText, letterSpacing: '-0.02em', lineHeight: 1 }}>{startWeight}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: '#7a7a7a', letterSpacing: '0.08em' }}>KG</span>
            </div>
            <Stepper value={startWeight} onChange={setStartWeight} color="#7a7a7a" />
          </div>

          {/* GOAL — light */}
          <div style={{ border: `1px solid ${T.hair}`, background: T.card, borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>GOAL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 44, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{goalWeight}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>KG</span>
            </div>
            <Stepper value={goalWeight} onChange={setGoalWeight} />
          </div>
        </div>
      </div>

      {/* Pace slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em' }}>PACE</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: T.text, letterSpacing: '0.06em' }}>
            {PACE_MAP[pace]} KG / WK
          </div>
        </div>
        <input
          type="range" min={0} max={2} step={1} value={pace}
          onChange={e => setPace(+e.target.value)}
          style={{ width: '100%', accentColor: T.accent, cursor: 'pointer', height: 4 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em' }}>
          <span>GENTLE 0.5</span>
          <span>STEADY 1.0</span>
          <span>AGGRESSIVE 2.0</span>
        </div>
      </div>
    </StepShell>
  )
}

// ── Step 3 — Your Protocol ─────────────────────────────────────────────────────

function Step3({ medication, setMedication, dose, setDose, injectionDay, setInjectionDay, reminderEnabled, setReminderEnabled, onFinish, onNoMed, onBack }) {
  return (
    <StepShell step={3} onBack={onBack}
      footer={
        <>
          <GhostBtn label="I'm not on medication yet" onClick={onNoMed} />
          <BigBtn label="Finish setup" onClick={onFinish} />
        </>
      }
    >
      <Eyebrow style={{ marginBottom: 16 }}>03 · Your Protocol</Eyebrow>

      <h1 style={{
        fontFamily: FONT.ui, fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 20, color: T.text,
      }}>
        What are you taking?
      </h1>

      {/* Medication radio list */}
      <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 10 }}>MEDICATION</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {MEDICATIONS.map(med => {
          const on = medication === med.id
          return (
            <button key={med.id} onClick={() => setMedication(med.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: on ? T.ink : T.card,
              border: `1px solid ${on ? T.ink : T.hair}`,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            }}>
              <div>
                <div style={{ fontFamily: FONT.ui, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: on ? T.inkText : T.text }}>{med.name}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: on ? '#7a7a7a' : T.mute, letterSpacing: '0.08em', marginTop: 3 }}>{med.brands}</div>
              </div>
              {/* Radio dot */}
              <div style={{
                width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                border: on ? 'none' : `1.5px solid ${T.hair}`,
                background: on ? T.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <div style={{ width: 6, height: 6, borderRadius: 3, background: T.ink }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Dose + Day */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>

        {/* Dose */}
        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, padding: '14px 16px', background: T.card }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>DOSE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
            <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1 }}>{dose.toFixed(1)}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>MG</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setDose(d => Math.max(0.25, +(d - 0.25).toFixed(2)))}
              style={{ background: 'none', border: 0, color: T.mute, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>−</button>
            <button onClick={() => setDose(d => Math.min(10, +(d + 0.25).toFixed(2)))}
              style={{ background: 'none', border: 0, color: T.mute, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>+</button>
          </div>
        </div>

        {/* Day */}
        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, padding: '14px 16px', background: T.card }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>DAY</div>
          <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>
            {DAY_NAMES[injectionDay]}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setInjectionDay(d => (d + 6) % 7)}
              style={{ background: 'none', border: 0, color: T.mute, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>←</button>
            <button onClick={() => setInjectionDay(d => (d + 1) % 7)}
              style={{ background: 'none', border: 0, color: T.mute, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>→</button>
          </div>
        </div>
      </div>

      {/* Reminder */}
      <div style={{
        border: `1px solid ${T.hair}`, borderRadius: 12, padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.card,
      }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 4 }}>REMINDER</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, color: T.text }}>9:00 PM · 30 min before</div>
        </div>
        <Toggle on={reminderEnabled} onChange={setReminderEnabled} />
      </div>
    </StepShell>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [name,     setName]     = useState('')
  const [pronouns, setPronouns] = useState('')

  // Step 2
  const [goalType,     setGoalType]     = useState('lose')
  const [startWeight,  setStartWeight]  = useState(96)
  const [goalWeight,   setGoalWeight]   = useState(75)
  const [pace,         setPace]         = useState(1)   // index into PACE_MAP

  // Step 3
  const [medication,       setMedication]       = useState('semaglutide')
  const [dose,             setDose]             = useState(1.0)
  const [injectionDay,     setInjectionDay]     = useState(5)   // 5 = Friday
  const [reminderEnabled,  setReminderEnabled]  = useState(true)

  function finish(noMed = false) {
    onComplete({
      name:             name.trim() || 'Friend',
      pronouns,
      startWeight,
      goalWeight,
      height:           165,   // adjustable in Settings
      goalType,
      pace:             PACE_MAP[pace],
      medication:       noMed ? null : medication,
      dose:             noMed ? null : dose,
      injectionDay:     noMed ? null : DAY_NAMES[injectionDay],
      injectionInterval: 7,
      lastInjectionDate: noMed ? null : lastOccurrence(injectionDay),
      reminderEnabled:  !noMed && reminderEnabled,
      proteinGoal:      null,
      unitSystem:       'metric',
    })
  }

  if (step === 1) return (
    <Step1
      name={name} setName={setName}
      pronouns={pronouns} setPronouns={setPronouns}
      onNext={() => setStep(2)}
      onAnonymous={() => { setName('Friend'); setStep(2) }}
      onBack={() => {}}
    />
  )

  if (step === 2) return (
    <Step2
      goalType={goalType}   setGoalType={setGoalType}
      startWeight={startWeight} setStartWeight={setStartWeight}
      goalWeight={goalWeight}   setGoalWeight={setGoalWeight}
      pace={pace}           setPace={setPace}
      onNext={() => setStep(3)}
      onBack={() => setStep(1)}
    />
  )

  return (
    <Step3
      medication={medication}     setMedication={setMedication}
      dose={dose}                 setDose={setDose}
      injectionDay={injectionDay} setInjectionDay={setInjectionDay}
      reminderEnabled={reminderEnabled} setReminderEnabled={setReminderEnabled}
      onFinish={() => finish(false)}
      onNoMed={() => finish(true)}
      onBack={() => setStep(2)}
    />
  )
}
