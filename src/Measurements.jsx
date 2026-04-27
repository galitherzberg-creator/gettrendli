import { useState, useEffect } from 'react'
import { todayISO, formatDate } from './logStore'
import styles from './Measurements.module.css'

const FIELDS = [
  { key: 'waist',  label: 'Waist',  placeholder: '80' },
  { key: 'hips',   label: 'Hips',   placeholder: '95' },
  { key: 'thighs', label: 'Thighs', placeholder: '58' },
  { key: 'chest',  label: 'Chest',  placeholder: '90' },
  { key: 'neck',   label: 'Neck',   placeholder: '35' },
  { key: 'arm',    label: 'Arm',    placeholder: '30' },
]

function emptyFields() {
  return { waist: '', hips: '', thighs: '', chest: '', neck: '', arm: '' }
}

function fieldDelta(current, reference) {
  const c = parseFloat(current)
  const r = parseFloat(reference)
  if (isNaN(c) || isNaN(r)) return null
  return (c - r).toFixed(1)
}

function DeltaBadge({ value, suffix }) {
  if (value == null) return null
  const n = parseFloat(value)
  const isNeg = n < 0
  const isZero = n === 0
  return (
    <span className={`${styles.deltaBadge} ${isNeg ? styles.deltaNeg : isZero ? styles.deltaZero : styles.deltaPos}`}>
      {isNeg ? '' : '+'}{value}&thinsp;cm
      {suffix && <span className={styles.deltaLabel}> {suffix}</span>}
    </span>
  )
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <div className={styles.inputRow}>
      <input
        className={styles.input}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        step={0.1}
      />
      <span className={styles.inputUnit}>cm</span>
    </div>
  )
}

// ── Shape silhouette ─────────────────────────────────────────────────────────

function buildSilhouette(m, sex) {
  const def = sex === 'male'
    ? { chest: 98, waist: 88, hips: 94, thighs: 57 }
    : sex === 'female'
    ? { chest: 90, waist: 74, hips: 98, thighs: 59 }
    : { chest: 94, waist: 81, hips: 96, thighs: 58 }

  const chest  = Math.max(parseFloat(m?.chest)  || def.chest,  40)
  const waist  = Math.max(parseFloat(m?.waist)  || def.waist,  40)
  const hips   = Math.max(parseFloat(m?.hips)   || def.hips,   40)
  const thighs = Math.max(parseFloat(m?.thighs) || def.thighs, 30)

  const ref = Math.max(chest, hips, waist)
  const s   = 21 / ref

  const cx  = 40
  const sW  = Math.min(chest * s * 1.1, 24)
  const cW  = chest  * s
  const wW  = Math.min(waist * s, cW - 0.5)
  const hW  = hips   * s
  const tW  = thighs * s * 0.52
  const kW  = tW * 0.8
  const aW  = tW * 0.55
  const nW  = Math.max(cW * 0.29, 4.5)

  const neckT = 23, neckB = 31, shldY = 35
  const chtY  = 57, wstY  = 82,  hipY  = 102
  const thgY  = 128, kneY = 150, ankY  = 176, botY = 182

  const f = n => n.toFixed(1)
  const R = w => f(cx + w)
  const L = w => f(cx - w)

  return [
    `M ${L(nW)},${neckT} L ${R(nW)},${neckT}`,
    `C ${R(sW * 1.6)},${neckB} ${R(sW)},${shldY} ${R(sW)},${shldY}`,
    `C ${R(sW)},${shldY + 9} ${R(cW)},${chtY - 7} ${R(cW)},${chtY}`,
    `C ${R(cW)},${chtY + 9} ${R(wW)},${wstY - 9} ${R(wW)},${wstY}`,
    `C ${R(wW)},${wstY + 9} ${R(hW)},${hipY - 9} ${R(hW)},${hipY}`,
    `C ${R(hW)},${hipY + 9} ${R(tW)},${thgY - 9} ${R(tW)},${thgY}`,
    `C ${R(tW)},${thgY + 8} ${R(kW)},${kneY - 8} ${R(kW)},${kneY}`,
    `C ${R(kW)},${kneY + 8} ${R(aW)},${ankY - 6} ${R(aW)},${ankY}`,
    `L ${cx},${botY}`,
    `L ${L(aW)},${ankY}`,
    `C ${L(aW)},${ankY - 6} ${L(kW)},${kneY + 8} ${L(kW)},${kneY}`,
    `C ${L(kW)},${kneY - 8} ${L(tW)},${thgY + 8} ${L(tW)},${thgY}`,
    `C ${L(tW)},${thgY - 9} ${L(hW)},${hipY + 9} ${L(hW)},${hipY}`,
    `C ${L(hW)},${hipY - 9} ${L(wW)},${wstY + 9} ${L(wW)},${wstY}`,
    `C ${L(wW)},${wstY - 9} ${L(cW)},${chtY + 9} ${L(cW)},${chtY}`,
    `C ${L(cW)},${chtY - 7} ${L(sW)},${shldY + 9} ${L(sW)},${shldY}`,
    `C ${L(sW)},${shldY} ${L(sW * 1.6)},${neckB} ${L(nW)},${neckT} Z`,
  ].join(' ')
}

function ShapeSilhouette({ entry, sex, accent, label, date }) {
  const d  = buildSilhouette(entry, sex)
  const cx = 40
  return (
    <div className={styles.silhouetteWrap}>
      <svg viewBox="0 0 80 186" className={styles.silhouetteSvg} aria-hidden="true">
        <circle cx={cx} cy={14} r={9} className={accent ? styles.silAccent : styles.silMuted} />
        <path d={d}                  className={accent ? styles.silAccent : styles.silMuted} />
      </svg>
      <span className={styles.silLabel}>{label}</span>
      {date && <span className={styles.silDate}>{date}</span>}
    </div>
  )
}

function historySnippet(entry) {
  return FIELDS
    .filter(f => entry[f.key])
    .map(f => `${f.label} ${entry[f.key]}`)
    .join(' · ')
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Measurements({ measurements, onUpdateMeasurements, onNavigate }) {
  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date))
  const latest   = sorted[0] ?? null
  const previous = sorted[1] ?? null
  const first    = sorted[sorted.length - 1] ?? null

  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [formDate, setFormDate]     = useState(todayISO)
  const [fields, setFields]         = useState(emptyFields)

  const [shapePreference, setShapePreference] = useState(() => {
    try { return localStorage.getItem('gt_shape_pref') || 'female' } catch { return 'female' }
  })
  useEffect(() => {
    try { localStorage.setItem('gt_shape_pref', shapePreference) } catch {}
  }, [shapePreference])

  function openAdd() {
    setEditingId(null)
    setFormDate(todayISO)
    setFields(emptyFields())
    setShowForm(true)
  }

  function openEdit(entry) {
    setEditingId(entry.id)
    setFormDate(entry.date)
    setFields({
      waist:  entry.waist  ?? '',
      hips:   entry.hips   ?? '',
      thighs: entry.thighs ?? '',
      chest:  entry.chest  ?? '',
      neck:   entry.neck   ?? '',
      arm:    entry.arm    ?? '',
    })
    setShowForm(true)
  }

  function handleSave() {
    const entry = {
      id:     editingId ?? String(Date.now()),
      date:   formDate,
      waist:  fields.waist  || null,
      hips:   fields.hips   || null,
      thighs: fields.thighs || null,
      chest:  fields.chest  || null,
      neck:   fields.neck   || null,
      arm:    fields.arm    || null,
    }
    if (editingId) {
      onUpdateMeasurements(measurements.map(m => m.id === editingId ? entry : m))
    } else {
      onUpdateMeasurements([...measurements, entry])
    }
    setShowForm(false)
  }

  function handleCancel() {
    setShowForm(false)
  }

  function setField(key, val) {
    setFields(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Measurements</h1>
          {!showForm && (
            <button className={styles.addBtn} onClick={openAdd} type="button">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Add
            </button>
          )}
        </header>

        <div className={styles.scrollContent}>

          {/* Add / Edit form */}
          {showForm && (
            <div className={styles.formCard}>
              <p className={styles.formTitle}>{editingId ? 'Edit Measurement' : 'New Measurement'}</p>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Date</span>
                <div className={styles.inputRow}>
                  <input
                    className={styles.dateInput}
                    type="date"
                    value={formDate}
                    max={todayISO}
                    onChange={e => e.target.value && setFormDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.twoCol}>
                {FIELDS.map(f => (
                  <div key={f.key} className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>{f.label}</span>
                    <NumberInput
                      value={fields[f.key]}
                      onChange={v => setField(f.key, v)}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={handleSave} type="button">Save</button>
                <button className={styles.cancelBtn} onClick={handleCancel} type="button">Cancel</button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!showForm && sorted.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="17" width="40" height="14" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M12 17V13M19 17V11M26 17V13M33 17V11M12 31v4M19 31v6M26 31v4M33 31v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className={styles.emptyTitle}>No measurements yet</p>
              <p className={styles.emptyBody}>Track waist, hips, chest and more over time to see your body composition change.</p>
              <button className={styles.emptyAddBtn} onClick={openAdd} type="button">Log first measurement</button>
            </div>
          )}

          {/* Latest snapshot */}
          {!showForm && latest && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Latest</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.cardDate}>{formatDate(latest.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <button className={styles.editBtn} onClick={() => openEdit(latest)} type="button">Edit</button>
                </div>
              </div>

              <div className={styles.metricList}>
                {FIELDS.filter(f => latest[f.key]).map(f => {
                  const prevDelta  = previous ? fieldDelta(latest[f.key], previous[f.key]) : null
                  const firstDelta = first && first.id !== latest.id ? fieldDelta(latest[f.key], first[f.key]) : null
                  const showFirst  = firstDelta != null && first?.id !== previous?.id
                  return (
                    <div key={f.key} className={styles.metricRow}>
                      <span className={styles.metricLabel}>{f.label}</span>
                      <span className={styles.metricValue}>{latest[f.key]} cm</span>
                      <div className={styles.metricDeltas}>
                        {prevDelta  != null && <DeltaBadge value={prevDelta}  suffix="vs prev" />}
                        {showFirst          && <DeltaBadge value={firstDelta} suffix="vs start" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* History */}
          {!showForm && sorted.length > 1 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>History</span>
              </div>
              <div className={styles.historyList}>
                {sorted.slice(1).map(entry => (
                  <div key={entry.id} className={styles.historyRow}>
                    <span className={styles.historyDate}>
                      {formatDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={styles.historyValues}>{historySnippet(entry)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shape Progress Preview */}
          {!showForm && latest && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Shape Progress Preview</span>
              </div>

              <div className={styles.sexToggle}>
                {[
                  { val: 'female', label: 'Female' },
                  { val: 'male',   label: 'Male'   },
                  { val: 'any',    label: 'Prefer not to say' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    className={`${styles.sexBtn} ${shapePreference === val ? styles.sexBtnActive : ''}`}
                    onClick={() => setShapePreference(val)}
                  >{label}</button>
                ))}
              </div>

              <div className={styles.silhouettePair}>
                {first && first.id !== latest.id ? (
                  <>
                    <ShapeSilhouette
                      entry={first}
                      sex={shapePreference}
                      accent={false}
                      label="Start"
                      date={formatDate(first.date, { month: 'short', year: 'numeric' })}
                    />
                    <ShapeSilhouette
                      entry={latest}
                      sex={shapePreference}
                      accent={true}
                      label="Latest"
                      date={formatDate(latest.date, { month: 'short', year: 'numeric' })}
                    />
                  </>
                ) : (
                  <ShapeSilhouette
                    entry={latest}
                    sex={shapePreference}
                    accent={true}
                    label="Current"
                    date={formatDate(latest.date, { month: 'short', year: 'numeric' })}
                  />
                )}
              </div>

              <p className={styles.previewDisclaimer}>
                This preview is a simplified visual aid based on your measurements. It is not an exact body model.
              </p>
            </div>
          )}

          <div className={styles.bottomSpacer} />
        </div>

        {/* Bottom nav */}
        <nav className={styles.bottomNav}>
          {[
            { icon: homeIcon,     label: 'Home',     action: 'dashboard' },
            { icon: chartIcon,    label: 'Charts',   action: 'charts'   },
            { icon: plusIcon,     label: 'Log',      action: 'log',      center: true },
            { icon: measureIcon,  label: 'Measure',  action: 'measurements', active: true },
            { icon: settingsIcon, label: 'Settings', action: 'settings' },
          ].map(({ icon, label, active, center, action }) => (
            <button key={label} onClick={() => onNavigate(action)}
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
