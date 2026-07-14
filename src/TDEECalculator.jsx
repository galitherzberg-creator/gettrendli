// Calorie (TDEE) calculator — helps the user find how many calories to eat to
// lose (or maintain / gain) weight. Uses the Mifflin-St Jeor BMR equation ×
// an activity multiplier, then applies a sensible deficit for weight loss.
// Self-contained modal styled to match WeeklyReport; persists its inputs back
// to settings (sex, age, activityLevel) so they're remembered.
import { useState } from 'react'
import { T, FONT, Eyebrow, Hairline } from './tokens'

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary',        sub: 'Little or no exercise',       multiplier: 1.2   },
  { value: 'light',     label: 'Lightly active',   sub: '1–3 days / week',             multiplier: 1.375 },
  { value: 'moderate',  label: 'Moderately active',sub: '3–5 days / week',             multiplier: 1.55  },
  { value: 'active',    label: 'Very active',      sub: '6–7 days / week',             multiplier: 1.725 },
  { value: 'extra',     label: 'Extra active',     sub: 'Physical job / 2× daily',     multiplier: 1.9   },
]

// Mifflin-St Jeor. Inputs in metric (kg, cm).
export function computeTDEE(sex, age, heightCm, weightKg, activity) {
  if (!age || !heightCm || !weightKg || age <= 0 || heightCm <= 0 || weightKg <= 0) return null
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const mult = ACTIVITY_OPTIONS.find(o => o.value === activity)?.multiplier ?? 1.55
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * mult) }
}

const LB_PER_KG = 2.20462
const CM_PER_IN = 2.54

export default function TDEECalculator({ open, onClose, userSettings, onSaveSettings, latestWeight }) {
  const us = userSettings.unitSystem === 'us'
  const startKg = latestWeight || userSettings.startWeight || null

  // Seed inputs from settings, converting to the display unit.
  const [sex, setSex]           = useState(userSettings.sex || 'female')
  const [age, setAge]           = useState(userSettings.age ? String(userSettings.age) : '')
  const [height, setHeight]     = useState(() => {
    const cm = userSettings.height || 165
    return us ? String(Math.round(cm / CM_PER_IN)) : String(cm)
  })
  const [weight, setWeight]     = useState(() => {
    if (!startKg) return ''
    return us ? String(Math.round(startKg * LB_PER_KG)) : String(Math.round(startKg))
  })
  const [activity, setActivity] = useState(userSettings.activityLevel || 'moderate')

  if (!open) return null

  const heightCm = us ? (parseFloat(height) * CM_PER_IN) : parseFloat(height)
  const weightKg = us ? (parseFloat(weight) / LB_PER_KG) : parseFloat(weight)
  const result   = computeTDEE(sex, parseInt(age, 10), heightCm, weightKg, activity)

  // Loss targets. ~0.5 kg/wk ≈ 500 kcal/day deficit; gentler start ≈ 300.
  const tdee = result?.tdee ?? null
  const lossLow  = tdee ? Math.max(1200, tdee - 500) : null // steadier ~0.5kg/wk
  const lossHigh = tdee ? Math.max(1200, tdee - 300) : null // gentler start

  function save() {
    if (onSaveSettings) {
      onSaveSettings(prev => ({
        ...prev,
        sex,
        age: parseInt(age, 10) || prev.age || null,
        activityLevel: activity,
      }))
    }
    onClose()
  }

  const inputStyle = {
    width: '100%', border: `1px solid ${T.hair}`, borderRadius: 10,
    padding: '10px 12px', fontFamily: FONT.ui, fontSize: 15,
    background: T.card, outline: 'none', boxSizing: 'border-box', color: T.text,
  }
  const fieldLabel = { fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'rgba(10,10,10,0.45)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, width: '100%',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.hair2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 20px 12px' }}>
          <Eyebrow color={T.accentDark}>Calorie target</Eyebrow>
          <div style={{ fontFamily: FONT.serif, fontSize: 28, fontStyle: 'italic', lineHeight: 1.05, marginTop: 8, color: T.ink }}>
            How much to eat to lose weight
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, marginTop: 8, lineHeight: 1.45 }}>
            We estimate your daily burn (TDEE) and suggest a calorie range for steady loss.
          </div>
        </div>
        <Hairline />

        {/* Inputs */}
        <div style={{ overflowY: 'auto', padding: '16px 20px 4px', flex: 1 }}>
          {/* Sex */}
          <div style={fieldLabel}>SEX</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
              <button key={v} onClick={() => setSex(v)} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${sex === v ? T.ink : T.hair}`,
                background: sex === v ? T.ink : 'transparent',
                color: sex === v ? T.inkText : T.text,
                fontFamily: FONT.ui, fontSize: 14, fontWeight: 500,
              }}>{l}</button>
            ))}
          </div>

          {/* Age + Activity row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 110 }}>
              <div style={fieldLabel}>AGE</div>
              <input type="number" inputMode="numeric" value={age} placeholder="35"
                onChange={e => setAge(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={fieldLabel}>HEIGHT ({us ? 'IN' : 'CM'})</div>
              <input type="number" inputMode="decimal" value={height} placeholder={us ? '65' : '165'}
                onChange={e => setHeight(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={fieldLabel}>WEIGHT ({us ? 'LB' : 'KG'})</div>
              <input type="number" inputMode="decimal" value={weight} placeholder={us ? '175' : '80'}
                onChange={e => setWeight(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Activity */}
          <div style={fieldLabel}>ACTIVITY LEVEL</div>
          <div style={{ marginBottom: 18 }}>
            {ACTIVITY_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setActivity(o.value)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 12px', marginBottom: 6, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${activity === o.value ? T.accent : T.hair}`,
                background: activity === o.value ? T.accentSoft : T.card,
              }}>
                <span style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, color: T.text }}>{o.label}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute }}>{o.sub}</span>
              </button>
            ))}
          </div>

          {/* Result */}
          {result ? (
            <div style={{ background: T.card, border: `1px solid ${T.hair}`, borderRadius: 14, padding: 16, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.1em' }}>MAINTENANCE (TDEE)</span>
                <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 26, color: T.text }}>
                  {tdee.toLocaleString()}<span style={{ fontFamily: FONT.mono, fontSize: 11, fontStyle: 'normal', color: T.mute }}> kcal</span>
                </span>
              </div>
              <Hairline style={{ margin: '12px 0' }} />
              <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                To lose weight, aim for
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 34, color: T.accentDark }}>
                  {lossLow.toLocaleString()}–{lossHigh.toLocaleString()}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: T.mute }}>kcal / day</span>
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 12, color: T.mute, marginTop: 8, lineHeight: 1.45 }}>
                A 300–500 kcal daily deficit is a common, sustainable pace (~0.3–0.5 kg / week).
                On GLP-1 meds your appetite may already be lower — don’t drop below ~1,200 kcal without medical advice.
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, padding: '8px 0 16px' }}>
              Fill in your age, height and weight to see your calorie target.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px 26px', borderTop: `1px solid ${T.hair}`, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px 0', borderRadius: 12, border: `1px solid ${T.hair}`,
            background: 'transparent', color: T.mute, cursor: 'pointer',
            fontFamily: FONT.ui, fontSize: 15,
          }}>Close</button>
          <button onClick={save} style={{
            flex: 2, padding: '13px 0', borderRadius: 12, border: 0,
            background: T.ink, color: T.inkText, cursor: 'pointer',
            fontFamily: FONT.ui, fontSize: 15, fontWeight: 600,
          }}>Save my details</button>
        </div>
      </div>
    </div>
  )
}
