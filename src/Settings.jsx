import { useState } from 'react'
import styles from './Settings.module.css'
import { TabBar, T, FONT, Eyebrow } from './tokens'

// ── TDEE logic ────────────────────────────────────────────────────────────────

const activityOptions = [
  { value: 'sedentary',   label: 'Sedentary',        sub: 'Little or no exercise',       multiplier: 1.2   },
  { value: 'light',       label: 'Lightly active',   sub: '1–3 days / week',             multiplier: 1.375 },
  { value: 'moderate',    label: 'Moderately active', sub: '3–5 days / week',            multiplier: 1.55  },
  { value: 'active',      label: 'Very active',      sub: '6–7 days / week',             multiplier: 1.725 },
  { value: 'extra',       label: 'Extra active',     sub: 'Physical job or twice daily', multiplier: 1.9   },
]

function computeTDEE(sex, age, heightCm, weightKg, activity) {
  if (!age || !heightCm || !weightKg || age <= 0 || heightCm <= 0 || weightKg <= 0) return null
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const mult = activityOptions.find(o => o.value === activity)?.multiplier ?? 1.55
  return Math.round(bmr * mult)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings({ userSettings, onSaveSettings, theme, onThemeChange, onNavigate }) {
  // Profile
  const [name, setName]                       = useState(userSettings.name)
  const [goalWeight, setGoalWeight]           = useState(String(userSettings.goalWeight))
  const [height, setHeight]                   = useState(String(userSettings.height ?? ''))
  const [injectionInterval, setInjInterval]   = useState(userSettings.injectionInterval ?? 7)
  const [goalType, setGoalType]               = useState(userSettings.goalType ?? 'lose')
  const [unitSystem, setUnitSystem]           = useState(userSettings.unitSystem ?? 'metric')
  const [proteinGoal, setProteinGoal]         = useState(String(userSettings.proteinGoal ?? ''))
  const [profileSaved, setProfileSaved]       = useState(false)

  // TDEE
  const [sex,        setSex]        = useState('female')
  const [age,        setAge]        = useState('35')
  const [tdeeHeight, setTdeeHeight] = useState(String(userSettings.height ?? '165'))
  const [tdeeWeight, setTdeeWeight] = useState(String(userSettings.startWeight ?? ''))
  const [activity,   setActivity]   = useState('moderate')

  const tdee      = computeTDEE(sex, +age, +tdeeHeight, +tdeeWeight, activity)
  const suggested = tdee
    ? goalType === 'gain'
      ? `${tdee + 300}–${tdee + 500}`
      : `${tdee - 500}–${tdee - 300}`
    : null

  function handleProfileSave() {
    const parsed = parseFloat(goalWeight)
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return
    onSaveSettings({
      ...userSettings,
      name: name.trim(),
      goalWeight: parsed,
      height: parseFloat(height) || userSettings.height,
      injectionInterval,
      goalType,
      unitSystem,
      proteinGoal: parseFloat(proteinGoal) || null,
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={styles.header}>
          <div>
            <Eyebrow>Settings</Eyebrow>
            <h1 style={{ fontFamily: FONT.ui, fontSize: 28, fontWeight: 500, letterSpacing: '-0.035em', marginTop: 4, color: T.text }}>You.</h1>
          </div>
        </header>

        <div className={styles.scrollContent}>

          {/* ── Profile ──────────────────────────────────────────── */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Profile</h2>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Name</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Goal weight</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    value={goalWeight}
                    onChange={e => setGoalWeight(e.target.value)}
                    placeholder="e.g. 75"
                  />
                  <span className={styles.unit}>kg</span>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Height</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="165"
                  />
                  <span className={styles.unit}>cm</span>
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Injection frequency</label>
              <div className={styles.toggle}>
                {[7, 14].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.toggleBtn} ${injectionInterval === n ? styles.toggleBtnActive : ''}`}
                    onClick={() => setInjInterval(n)}
                  >
                    Every {n} days
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Goal type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'lose', label: 'Lose weight',  sub: 'Body recomposition', d: 'M6 9l6 6 6-6' },
                  { id: 'gain', label: 'Build muscle',  sub: 'Gain · lean mass',   d: 'M6 15l6-6 6 6' },
                ].map(g => {
                  const on = goalType === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoalType(g.id)}
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
                        background: on ? '#1a1a1a' : '#F3F2EE',
                        border: on ? '1px solid #2a2a2a' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={g.d}/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{g.label}</div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', opacity: 0.65, marginTop: 2, textTransform: 'uppercase' }}>{g.sub}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Units</label>
              <div className={styles.toggle}>
                {[
                  { value: 'metric', label: 'Metric (kg / cm)' },
                  { value: 'us',     label: 'US (lb / in)'     },
                ].map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${styles.toggleBtn} ${unitSystem === o.value ? styles.toggleBtnActive : ''}`}
                    onClick={() => setUnitSystem(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Daily protein goal <span className={styles.optionalTag}>optional</span></label>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  value={proteinGoal}
                  onChange={e => setProteinGoal(e.target.value)}
                  placeholder="e.g. 160"
                />
                <span className={styles.unit}>g</span>
              </div>
              <p className={styles.fieldHint}>
                {goalType === 'gain'
                  ? 'Aim for ~1.6–2.2 g per kg of body weight to support muscle building.'
                  : 'Aim for ~1.2–1.6 g per kg to preserve muscle while losing.'}
              </p>
            </div>

            <button className={`${styles.saveBtn} ${profileSaved ? styles.saveBtnDone : ''}`} onClick={handleProfileSave}>
              {profileSaved ? '✓ Saved' : 'Save changes'}
            </button>
          </section>

          {/* ── TDEE Calculator ──────────────────────────────────── */}
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>TDEE calculator</h2>
              <span className={styles.cardBadge}>Estimate</span>
            </div>
            <p className={styles.cardDesc}>
              Your Total Daily Energy Expenditure is an estimate of how many calories your body
              burns in a day. Use it as a rough starting point, not a precise target.
            </p>

            {/* Sex toggle */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Biological sex</label>
              <div className={styles.toggle}>
                <button
                  className={`${styles.toggleBtn} ${sex === 'female' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setSex('female')}
                >Female</button>
                <button
                  className={`${styles.toggleBtn} ${sex === 'male' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setSex('male')}
                >Male</button>
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Age</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="35"
                  />
                  <span className={styles.unit}>yrs</span>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Height</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    value={tdeeHeight}
                    onChange={e => setTdeeHeight(e.target.value)}
                    placeholder="165"
                  />
                  <span className={styles.unit}>cm</span>
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Current weight</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  value={tdeeWeight}
                  onChange={e => setTdeeWeight(e.target.value)}
                  placeholder="83.4"
                />
                <span className={styles.unit}>kg</span>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Activity level</label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.select}
                  value={activity}
                  onChange={e => setActivity(e.target.value)}
                >
                  {activityOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} — {o.sub}</option>
                  ))}
                </select>
                <svg className={styles.selectChevron} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Result */}
            {tdee ? (
              <div className={styles.result}>
                <div className={styles.resultRow}>
                  <div className={styles.resultStat}>
                    <span className={styles.resultLabel}>Estimated TDEE</span>
                    <span className={styles.resultValue}>{tdee.toLocaleString()}</span>
                    <span className={styles.resultUnit}>kcal / day</span>
                  </div>
                  <div className={styles.resultDivider} />
                  <div className={styles.resultStat}>
                    <span className={styles.resultLabel}>Suggested range</span>
                    <span className={styles.resultValue}>{suggested}</span>
                    <span className={styles.resultUnit}>kcal / day</span>
                  </div>
                </div>
                <p className={styles.resultNote}>
                  {goalType === 'gain'
                    ? 'Suggested range is 300–500 kcal above your TDEE — a lean bulk surplus to build muscle without excess fat.'
                    : 'Suggested range is 300–500 kcal below your TDEE — a common starting point for gradual loss.'}
                  {' '}Discuss your actual target with your care team.
                </p>
              </div>
            ) : (
              <div className={styles.resultEmpty}>
                Fill in your details above to see your estimate.
              </div>
            )}
          </section>

          {/* ── Disclaimer ────────────────────────────────────────── */}
          <p className={styles.disclaimer}>
            All calculations are estimates based on general formulas and are for informational
            purposes only. They are not medical advice.
          </p>

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── Bottom nav ───────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
          <TabBar active="profile" onTab={onNavigate} />
        </div>

      </div>
    </div>
  )
}

