import { useState, useEffect } from 'react'
import { todayISO, formatDate } from './logStore'
import styles from './Measurements.module.css'
import { T, FONT, Eyebrow, TabBar } from './tokens'

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
//
// Builds a single closed SVG path tracing:
//   right neck → right shoulder → right chest → waist → right hip →
//   right outer leg (down) → right foot → right inner leg (up) → crotch →
//   left inner leg (down) → left foot → left outer leg (up) →
//   left hip → waist → left chest → left shoulder → left neck → Z
//
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

  // Normalize: max half-width 21 px in 80 px-wide viewBox
  const ref = Math.max(chest, hips, waist)
  const s   = 21 / ref
  const cx  = 40

  const isFemale = sex === 'female'
  const isMale   = sex === 'male'

  // ── Half-widths from centre ──
  const nW = Math.max(chest * s * 0.27, 4.5)

  // Shoulders: male clearly wider (inverted triangle), female close to chest
  const sW = isMale
    ? Math.min(chest * s * 1.32, 25)
    : isFemale
    ? Math.min(chest * s * 1.04, 22)
    : Math.min(chest * s * 1.15, 23)

  const cW = chest * s

  // Hips: female boosted for hourglass, male compressed for straight silhouette
  const hW = Math.min(
    isFemale ? hips * s * 1.06 : isMale ? hips * s * 0.86 : hips * s,
    22
  )

  // Waist: female deeply cinched, male barely narrower than hips
  const waistMult = isFemale ? 0.76 : isMale ? 0.94 : 0.85
  const wW = Math.min(Math.max(waist * s * waistMult, nW + 2), Math.min(cW, hW) - 1)

  // Outer thigh half-width per leg
  const tOutW = Math.min(thighs * s * 0.78, hW * 0.90)
  const tInnW = Math.max(tOutW * 0.38, 3.5)
  const kOutW = tOutW * 0.84
  const kInnW = Math.max(kOutW * 0.40, 3.0)
  const aOutW = tOutW * 0.58
  const aInnW = Math.max(aOutW * 0.42, 2.0)
  const gapHW = 2.5

  // Curve tension: female = more pronounced bends, male = straighter lines
  const bend     = isFemale ? 13 : isMale ? 6 : 10
  const hipFlare = isFemale ? 15 : isMale ? 7 : 11

  // ── Y coordinates (top = 0) ──
  const headCY  = 13
  const neckT   = headCY + 9   // 22 — bottom of head circle
  const neckB   = 30
  const shldY   = 33
  const chtY    = 55
  const wstY    = 79
  const hipY    = 100
  const crotchY = 114
  const thgY    = 134
  const kneY    = 155
  const ankY    = 175

  const f = n => n.toFixed(1)
  const R = w => f(cx + w)
  const L = w => f(cx - w)
  // Shoulder control-point capped to stay inside viewBox
  const scpR = f(Math.min(cx + sW * 1.42, 73))
  const scpL = f(Math.max(cx - sW * 1.42, 7))

  return [
    // ── Right neck ──
    `M ${R(nW)},${neckT}`,
    // ── Right shoulder sweep ──
    `C ${scpR},${neckB} ${R(sW)},${shldY - 1} ${R(sW)},${shldY}`,
    // ── Right armhole → chest ──
    `C ${R(sW)},${shldY + 10} ${R(cW)},${chtY - 7} ${R(cW)},${chtY}`,
    // ── Right chest → waist (inward) ──
    `C ${R(cW)},${chtY + bend} ${R(wW)},${wstY - bend} ${R(wW)},${wstY}`,
    // ── Right waist → hip (outward) ──
    `C ${R(wW)},${wstY + bend} ${R(hW)},${hipY - bend} ${R(hW)},${hipY}`,
    // ── Right OUTER leg: hip → outer thigh → outer knee → outer ankle ──
    `C ${R(hW)},${hipY + hipFlare} ${R(tOutW)},${thgY - 10} ${R(tOutW)},${thgY}`,
    `C ${R(tOutW)},${thgY + 8} ${R(kOutW)},${kneY - 8} ${R(kOutW)},${kneY}`,
    `C ${R(kOutW)},${kneY + 8} ${R(aOutW)},${ankY - 5} ${R(aOutW)},${ankY}`,
    // ── Right foot (flat step to inner ankle) ──
    `L ${R(aInnW)},${ankY}`,
    // ── Right INNER leg going UP: ankle → knee → thigh → crotch ──
    `C ${R(aInnW)},${ankY - 5} ${R(kInnW)},${kneY + 8} ${R(kInnW)},${kneY}`,
    `C ${R(kInnW)},${kneY - 8} ${R(tInnW)},${thgY + 8} ${R(tInnW)},${thgY}`,
    `C ${R(tInnW)},${thgY - 10} ${R(gapHW)},${crotchY + 6} ${R(gapHW)},${crotchY}`,
    // ── Crotch: gentle Q-curve connecting the two legs ──
    `Q ${cx},${crotchY + 5} ${L(gapHW)},${crotchY}`,
    // ── Left INNER leg going DOWN: crotch → thigh → knee → ankle ──
    `C ${L(gapHW)},${crotchY + 6} ${L(tInnW)},${thgY - 10} ${L(tInnW)},${thgY}`,
    `C ${L(tInnW)},${thgY + 8} ${L(kInnW)},${kneY - 8} ${L(kInnW)},${kneY}`,
    `C ${L(kInnW)},${kneY + 8} ${L(aInnW)},${ankY - 5} ${L(aInnW)},${ankY}`,
    // ── Left foot (flat step to outer ankle) ──
    `L ${L(aOutW)},${ankY}`,
    // ── Left OUTER leg going UP: ankle → knee → thigh → hip ──
    `C ${L(aOutW)},${ankY - 5} ${L(kOutW)},${kneY + 8} ${L(kOutW)},${kneY}`,
    `C ${L(kOutW)},${kneY - 8} ${L(tOutW)},${thgY + 8} ${L(tOutW)},${thgY}`,
    `C ${L(tOutW)},${thgY - 10} ${L(hW)},${hipY + hipFlare} ${L(hW)},${hipY}`,
    // ── Left torso: hip → waist → chest → shoulder ──
    `C ${L(hW)},${hipY - bend} ${L(wW)},${wstY + bend} ${L(wW)},${wstY}`,
    `C ${L(wW)},${wstY - bend} ${L(cW)},${chtY + bend} ${L(cW)},${chtY}`,
    `C ${L(cW)},${chtY - 7} ${L(sW)},${shldY + 10} ${L(sW)},${shldY}`,
    // ── Left shoulder back to neck ──
    `C ${L(sW)},${shldY - 1} ${scpL},${neckB} ${L(nW)},${neckT}`,
    'Z',
  ].join(' ')
}

function ShapeSilhouette({ entry, sex, accent, label, date }) {
  const d = buildSilhouette(entry, sex)
  return (
    <div className={styles.silhouetteWrap}>
      <svg viewBox="0 0 80 180" className={styles.silhouetteSvg} aria-hidden="true">
        <circle cx={40} cy={13} r={9} className={accent ? styles.silAccent : styles.silMuted} />
        <path d={d}             className={accent ? styles.silAccent : styles.silMuted} />
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
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, color: T.text }}>Measurements</div>
          {!showForm && (
            <button
              onClick={openAdd}
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 18,
                background: T.ink, color: T.inkText, border: 0, cursor: 'pointer',
                fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
          <TabBar active="log" onTab={onNavigate} />
        </div>

      </div>
    </div>
  )
}

