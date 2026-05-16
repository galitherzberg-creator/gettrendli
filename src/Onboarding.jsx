import { useState } from 'react'
import styles from './Onboarding.module.css'

const TOTAL_STEPS = 3
const todayStr = new Date().toISOString().split('T')[0]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)

  // Step 2
  const [goalType, setGoalType] = useState('lose')
  const [startWeight, setStartWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [height, setHeight] = useState('')
  const [weightError, setWeightError] = useState(false)

  // Step 3
  const [lastInjDate, setLastInjDate] = useState(todayStr)
  const [injInterval, setInjInterval] = useState(7)

  function goNext() {
    if (step === 1) {
      if (!name.trim()) { setNameError(true); return }
      setStep(2)
    } else if (step === 2) {
      if (!startWeight || !goalWeight || !height) { setWeightError(true); return }
      setStep(3)
    } else {
      onComplete({
        name: name.trim(),
        startWeight: parseFloat(startWeight),
        goalWeight: parseFloat(goalWeight),
        height: parseFloat(height),
        lastInjectionDate: lastInjDate,
        injectionInterval: injInterval,
        goalType,
        proteinGoal: null,
      })
    }
  }

  function goBack() {
    setStep(s => s - 1)
  }

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        <div className={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`${styles.progressSegment} ${i + 1 <= step ? styles.progressSegmentFilled : ''}`}
            />
          ))}
        </div>

        <div className={styles.content}>

          {step === 1 && (
            <div className={styles.stepWrap}>
              <div className={styles.heroEmoji}>👋</div>
              <h1 className={styles.stepTitle}>Welcome to Gettrendli</h1>
              <p className={styles.stepDesc}>
                Your GLP-1 companion. Let's personalise your experience — it only takes a minute.
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>What's your name?</label>
                <input
                  className={`${styles.input} ${nameError ? styles.inputError : ''}`}
                  type="text"
                  placeholder="e.g. Sarah"
                  value={name}
                  autoFocus
                  onChange={e => { setName(e.target.value); setNameError(false) }}
                  onKeyDown={e => e.key === 'Enter' && goNext()}
                />
                {nameError && <p className={styles.fieldError}>Please enter your name</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepWrap}>
              <div className={styles.heroEmoji}>⚖️</div>
              <h1 className={styles.stepTitle}>Your weight goal</h1>
              <p className={styles.stepDesc}>
                {goalType === 'gain'
                  ? "We'll track your progress and flip the metrics so gaining feels like winning."
                  : 'We use this to track progress and show goal projections.'}
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>What's your goal?</label>
                <div className={styles.intervalToggle}>
                  {[
                    { value: 'lose', label: '🔥 Lose fat' },
                    { value: 'gain', label: '💪 Gain / build muscle' },
                  ].map(o => (
                    <button
                      key={o.value}
                      type="button"
                      className={`${styles.intervalBtn} ${goalType === o.value ? styles.intervalBtnActive : ''}`}
                      onClick={() => setGoalType(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {weightError && <p className={styles.fieldError}>Please fill in all three fields</p>}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Current weight</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    placeholder="85.0"
                    value={startWeight}
                    onChange={e => { setStartWeight(e.target.value); setWeightError(false) }}
                  />
                  <span className={styles.unit}>kg</span>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Goal weight</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    placeholder="70.0"
                    value={goalWeight}
                    onChange={e => { setGoalWeight(e.target.value); setWeightError(false) }}
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
                    placeholder="165"
                    value={height}
                    onChange={e => { setHeight(e.target.value); setWeightError(false) }}
                  />
                  <span className={styles.unit}>cm</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepWrap}>
              <div className={styles.heroEmoji}>💉</div>
              <h1 className={styles.stepTitle}>Injection schedule</h1>
              <p className={styles.stepDesc}>
                We'll show a countdown so you always know when your next dose is due.
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Last injection date</label>
                <input
                  className={styles.dateInput}
                  type="date"
                  value={lastInjDate}
                  max={todayStr}
                  onChange={e => setLastInjDate(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>How often do you inject?</label>
                <div className={styles.intervalToggle}>
                  {[7, 14].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.intervalBtn} ${injInterval === n ? styles.intervalBtnActive : ''}`}
                      onClick={() => setInjInterval(n)}
                    >
                      Every {n} days
                    </button>
                  ))}
                </div>
              </div>
              <p className={styles.skipNote}>You can change this anytime in Settings.</p>
            </div>
          )}

        </div>

        <div className={styles.actions}>
          {step > 1 && (
            <button className={styles.backBtn} type="button" onClick={goBack}>Back</button>
          )}
          <button className={styles.nextBtn} type="button" onClick={goNext}>
            {step === TOTAL_STEPS ? 'Get started' : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  )
}
