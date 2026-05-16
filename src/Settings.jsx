import { useState } from 'react'
import styles from './Settings.module.css'
import TipBanner, { useTip } from './TipBanner'

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
  const tip = useTip('settings')
  // Profile
  const [name, setName]                       = useState(userSettings.name)
  const [goalWeight, setGoalWeight]           = useState(String(userSettings.goalWeight))
  const [height, setHeight]                   = useState(String(userSettings.height ?? ''))
  const [injectionInterval, setInjInterval]   = useState(userSettings.injectionInterval ?? 7)
  const [goalType, setGoalType]               = useState(userSettings.goalType ?? 'lose')
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
          <h1 className={styles.headerTitle}>Settings</h1>
        </header>

        {tip.visible && (
          <TipBanner
            text="Set your goal type and daily protein target in Profile to unlock direction-aware tracking on the dashboard."
            onDismiss={tip.dismiss}
          />
        )}

        <div className={styles.scrollContent}>

          {/* ── Appearance ───────────────────────────────────────── */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Appearance</h2>
            <div className={styles.themeGrid}>
              <button
                className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                onClick={() => onThemeChange('light')}
              >
                <div className={styles.themePreviewLight}>
                  <div className={styles.previewBar} />
                  <div className={styles.previewCardLight} />
                  <div className={styles.previewCardLight} style={{ width: '60%' }} />
                </div>
                <span className={styles.themeLabel}>Light</span>
                {theme === 'light' && <span className={styles.themeCheck}>✓</span>}
              </button>

              <button
                className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                onClick={() => onThemeChange('dark')}
              >
                <div className={styles.themePreviewDark}>
                  <div className={styles.previewBarDark} />
                  <div className={styles.previewCardDark} />
                  <div className={styles.previewCardDark} style={{ width: '60%' }} />
                </div>
                <span className={styles.themeLabel}>Dark</span>
                {theme === 'dark' && <span className={styles.themeCheck}>✓</span>}
              </button>
            </div>
          </section>

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
              <div className={styles.toggle}>
                {[
                  { value: 'lose', label: 'Lose fat' },
                  { value: 'gain', label: 'Gain / build muscle' },
                ].map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${styles.toggleBtn} ${goalType === o.value ? styles.toggleBtnActive : ''}`}
                    onClick={() => setGoalType(o.value)}
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
        <nav className={styles.bottomNav}>
          {[
            { icon: homeIcon,     label: 'Home',     action: 'dashboard' },
            { icon: chartIcon,    label: 'Charts',   action: 'charts'   },
            { icon: plusIcon,     label: 'Log',      action: 'log',      center: true },
            { icon: measureIcon,  label: 'Measure',  action: 'measurements' },
            { icon: settingsIcon, label: 'Settings', action: 'settings', active: true },
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
