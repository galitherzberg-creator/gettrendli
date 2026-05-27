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

// ── Wireframe body silhouette — stroke-only "body scan" style ────────────────
// Three views: female front, male front, profile (side). Seafoam accent stroke.
// viewBox: 200 × 500.
function WireframeSilhouette({ view = 'female', color, opacity = 1, style = {} }) {
  const c   = color || T.accent
  const w   = 1.5    // outline stroke
  const g   = 0.8    // contour ring stroke
  const gOp = 0.55   // contour opacity
  const cOp = 0.32   // centerline opacity

  const Head = ({ cx, cy, r }) => (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={w} />
      <ellipse cx={cx} cy={cy + 1} rx={r} ry={r * 0.32} fill="none" stroke={c} strokeWidth={g} opacity={gOp} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={c} strokeWidth={g} opacity={cOp} />
    </>
  )

  let figure = null

  if (view === 'female') {
    figure = (
      <>
        <Head cx={100} cy={42} r={22} />
        <path d="M 90 64 L 87 84 M 110 64 L 113 84" stroke={c} strokeWidth={w} fill="none" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 87 84 C 74 86 64 92 60 102 C 56 118 58 138 62 156 C 66 175 70 192 74 208 C 70 220 70 232 74 244 C 78 258 82 270 84 282 C 86 294 86 306 88 318 L 112 318 C 114 306 114 294 116 282 C 118 270 122 258 126 244 C 130 232 130 220 126 208 C 130 192 134 175 138 156 C 142 138 144 118 140 102 C 136 92 126 86 113 84" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 60 102 C 50 116 46 138 48 162 C 50 188 56 215 60 240 C 58 252 60 264 64 270 Q 70 274 76 270 C 76 262 72 250 70 238 C 66 215 64 188 66 162 C 66 138 68 116 70 102" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 140 102 C 150 116 154 138 152 162 C 150 188 144 215 140 240 C 142 252 140 264 136 270 Q 130 274 124 270 C 124 262 128 250 130 238 C 134 215 136 188 134 162 C 134 138 132 116 130 102" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 88 318 C 84 348 80 388 78 428 C 76 448 76 466 78 478 L 82 488 L 76 492 L 76 496 L 94 496 L 96 488 L 98 466 C 100 432 100 392 100 360" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 112 318 C 116 348 120 388 122 428 C 124 448 124 466 122 478 L 118 488 L 124 492 L 124 496 L 106 496 L 104 488 L 102 466 C 100 432 100 392 100 360" />
        <g stroke={c} strokeWidth={g} opacity={gOp} fill="none">
          <path d="M 60 102 Q 100 95 140 102" /><path d="M 56 125 Q 100 135 144 125" />
          <path d="M 60 156 Q 100 165 140 156" /><path d="M 68 190 Q 100 198 132 190" />
          <path d="M 74 220 Q 100 226 126 220" /><path d="M 78 260 Q 100 266 122 260" />
          <path d="M 80 305 Q 100 312 120 305" /><path d="M 80 360 Q 92 365 96 360" />
          <path d="M 104 360 Q 108 365 120 360" /><path d="M 80 420 Q 90 424 94 420" />
          <path d="M 106 420 Q 110 424 120 420" /><path d="M 78 470 Q 88 474 92 470" />
          <path d="M 108 470 Q 112 474 122 470" />
        </g>
        <line x1="100" y1="62" x2="100" y2="318" stroke={c} strokeWidth={g} opacity={cOp} />
      </>
    )
  } else if (view === 'male') {
    figure = (
      <>
        <Head cx={100} cy={42} r={24} />
        <path d="M 88 66 L 84 86 M 112 66 L 116 86" stroke={c} strokeWidth={w} fill="none" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 84 86 C 66 88 52 96 46 110 C 42 130 46 155 52 178 C 58 200 64 220 70 240 C 72 254 74 268 76 282 C 80 296 82 308 84 320 L 116 320 C 118 308 120 296 124 282 C 126 268 128 254 130 240 C 136 220 142 200 148 178 C 154 155 158 130 154 110 C 148 96 134 88 116 86" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 46 110 C 36 130 32 158 36 188 C 40 215 46 240 48 262 C 46 272 48 282 52 286 Q 58 290 64 285 C 64 274 60 258 58 242 C 54 218 54 188 58 162 C 60 138 64 118 66 108" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 154 110 C 164 130 168 158 164 188 C 160 215 154 240 152 262 C 154 272 152 282 148 286 Q 142 290 136 285 C 136 274 140 258 142 242 C 146 218 146 188 142 162 C 140 138 136 118 134 108" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 84 320 C 80 355 76 400 76 440 C 76 460 78 478 80 488 L 82 496 L 76 498 L 76 502 L 94 502 L 96 494 L 98 470 C 100 432 100 392 100 360" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 116 320 C 120 355 124 400 124 440 C 124 460 122 478 120 488 L 118 496 L 124 498 L 124 502 L 106 502 L 104 494 L 102 470 C 100 432 100 392 100 360" />
        <g stroke={c} strokeWidth={g} opacity={gOp} fill="none">
          <path d="M 50 110 Q 100 100 150 110" /><path d="M 46 138 Q 100 150 154 138" />
          <path d="M 52 168 Q 100 178 148 168" /><path d="M 60 200 Q 100 208 140 200" />
          <path d="M 66 232 Q 100 240 134 232" /><path d="M 74 266 Q 100 272 126 266" />
          <path d="M 80 305 Q 100 312 120 305" /><path d="M 78 360 Q 92 365 96 360" />
          <path d="M 104 360 Q 108 365 122 360" /><path d="M 78 425 Q 90 430 94 425" />
          <path d="M 106 425 Q 110 430 122 425" /><path d="M 76 478 Q 88 482 92 478" />
          <path d="M 108 478 Q 112 482 124 478" />
        </g>
        <line x1="100" y1="64" x2="100" y2="320" stroke={c} strokeWidth={g} opacity={cOp} />
      </>
    )
  } else {
    // profile (side view)
    figure = (
      <>
        <Head cx={88} cy={42} r={22} />
        <path d="M 80 62 C 78 70 80 78 86 84 M 94 62 C 96 70 96 78 96 84" stroke={c} strokeWidth={w} fill="none" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 86 84 C 74 94 68 110 70 130 C 74 152 80 175 80 195 C 80 215 76 232 78 250 C 80 268 84 285 86 305 L 86 320 L 116 320 L 116 305 C 116 285 118 268 120 250 C 122 232 122 215 122 195 C 122 175 118 152 114 132 C 110 115 108 100 102 92 C 98 86 92 84 86 84" />
        <path stroke={c} strokeWidth={w} fill="none" d="M 86 320 C 82 360 78 405 78 445 C 78 465 80 480 82 490 L 80 498 L 74 500 L 80 504 L 94 504 L 96 494 L 98 470 C 100 432 102 390 100 360" />
        <path stroke={c} strokeWidth={w} fill="none" opacity="0.65" d="M 116 320 C 118 360 120 405 122 445 C 122 465 120 480 118 490 L 120 498 L 126 500 L 120 504 L 106 504 L 104 494 L 102 470 C 100 432 100 390 100 360" />
        <g stroke={c} strokeWidth={g} opacity={gOp} fill="none">
          <path d="M 70 108 Q 100 102 124 110" /><path d="M 70 135 Q 100 128 122 138" />
          <path d="M 72 165 Q 100 158 122 168" /><path d="M 76 200 Q 100 194 124 202" />
          <path d="M 80 235 Q 100 230 122 238" /><path d="M 82 275 Q 100 270 118 278" />
          <path d="M 80 308 Q 100 302 118 310" /><path d="M 80 365 Q 90 360 100 366" />
          <path d="M 80 430 Q 92 426 100 432" /><path d="M 80 478 Q 90 474 100 480" />
        </g>
        <line x1="100" y1="64" x2="100" y2="320" stroke={c} strokeWidth={g} opacity={cOp} />
      </>
    )
  }

  return (
    <svg viewBox="0 0 200 500" width="100%" height="100%" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {figure}
    </svg>
  )
}

// ── Legacy parametric silhouette (kept for measurements card) ─────────────────
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

              {/* View toggle: female / male / profile */}
              <div style={{ display: 'flex', gap: 6, padding: '0 2px 8px' }}>
                {[
                  { val: 'female',  label: 'Female'  },
                  { val: 'male',    label: 'Male'     },
                  { val: 'profile', label: 'Profile'  },
                ].map(({ val, label }) => {
                  const on = shapePreference === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setShapePreference(val)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 10,
                        border: `1px solid ${on ? T.ink : T.hair}`,
                        background: on ? T.card : '#F3F2EE',
                        color: T.text, cursor: 'pointer',
                        fontFamily: FONT.ui, fontSize: 13,
                        fontWeight: on ? 700 : 500, letterSpacing: '-0.01em',
                      }}
                    >{label}</button>
                  )
                })}
              </div>

              {/* Wireframe silhouette(s) */}
              {first && first.id !== latest.id ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'stretch', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 8px 12px' }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>
                      START · {formatDate(first.date, { month: 'short', year: 'numeric' }).toUpperCase()}
                    </div>
                    <div style={{ width: 90, height: 200 }}>
                      <WireframeSilhouette view={shapePreference} color={T.faint} />
                    </div>
                  </div>
                  <div style={{ background: T.hair, margin: '20px 0' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 8px 12px' }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.text, letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
                      NOW · {formatDate(latest.date, { month: 'short', year: 'numeric' }).toUpperCase()}
                    </div>
                    <div style={{ width: 90, height: 200 }}>
                      <WireframeSilhouette view={shapePreference} color={T.accent} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.text, letterSpacing: '0.12em', fontWeight: 600 }}>
                      CURRENT · {formatDate(latest.date, { month: 'short', year: 'numeric' }).toUpperCase()}
                    </div>
                    <div style={{ width: 110, height: 230 }}>
                      <WireframeSilhouette view={shapePreference} color={T.accent} />
                    </div>
                  </div>
                </div>
              )}

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

