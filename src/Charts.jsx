import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, ComposedChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import styles from './Charts.module.css'
import { T, FONT, Eyebrow, Hairline, Card, TabBar } from './tokens'
import { TrialBanner } from './entitlements'

// ── Real data aggregation ───────────────────────────────────────────────────
// Logs are stored as { [isoDate]: { weight(kg), protein(g), dose(mg), … } }.
// We bucket them into weeks (Mon-start) within the selected range and average.

const KG_TO_LB = 2.2046
const RANGE_WEEKS = { '4W': 4, '8W': 8, '3M': 13, '6M': 26, '1Y': 52 }

function mondayOf(iso) {
  const dt = new Date(iso + 'T12:00:00')
  const day = (dt.getDay() + 6) % 7   // Mon = 0
  dt.setDate(dt.getDate() - day)
  return dt
}
const fmtMon = dt => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const avg = arr => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null)

function buildWeekly(logs, weeks, isMetric) {
  const now = new Date()
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - weeks * 7)
  const buckets = new Map()
  for (const [date, v] of Object.entries(logs || {})) {
    const dt = new Date(date + 'T12:00:00')
    if (isNaN(dt) || dt < cutoff || dt > now) continue
    const mon = mondayOf(date)
    const key = mon.toISOString().split('T')[0]
    if (!buckets.has(key)) buckets.set(key, { dt: mon, weights: [], proteins: [], doses: [] })
    const b = buckets.get(key)
    if (v.weight)  b.weights.push(parseFloat(v.weight))
    if (v.protein) b.proteins.push(parseFloat(v.protein))
    if (v.dose)    b.doses.push(parseFloat(v.dose))
  }
  const rows = [...buckets.values()].sort((a, b) => a.dt - b.dt).map(b => {
    let w = avg(b.weights)
    if (w != null && !isMetric) w *= KG_TO_LB
    return {
      week:    fmtMon(b.dt),
      weight:  w != null ? Math.round(w * 10) / 10 : null,
      protein: b.proteins.length ? Math.round(avg(b.proteins)) : null,
      dose:    b.doses.length ? b.doses[b.doses.length - 1] : null,
    }
  })
  rows.forEach((r, i) => {
    const win = rows.slice(Math.max(0, i - 2), i + 1).map(x => x.weight).filter(v => v != null)
    r.weightAvg = win.length ? Math.round((win.reduce((s, n) => s + n, 0) / win.length) * 10) / 10 : null
  })
  return rows
}

function niceDomain(vals, pad) {
  if (!vals.length) return [0, 1]
  return [Math.floor(Math.min(...vals) - pad), Math.ceil(Math.max(...vals) + pad)]
}

// ── Shared chart config ───────────────────────────────────────────────────────

const axisStyle  = { fontSize: 11, fill: '#888888', fontFamily: 'Inter, sans-serif' }
const xAxisProps = {
  dataKey: 'week',
  tick: axisStyle,
  axisLine: false,
  tickLine: false,
  tickMargin: 8,
}

// ── Custom tooltips ───────────────────────────────────────────────────────────

function WeightTip({ active, payload, label, unit = 'kg' }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      <p className={styles.tipRow}><span>Weight</span><strong>{payload[0]?.value} {unit}</strong></p>
    </div>
  )
}

function ProteinTip({ active, payload, label, unit = 'kg' }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className={styles.tipRow}>
          <span>{p.name === 'protein' ? 'Protein avg' : 'Weight'}</span>
          <strong>{p.name === 'protein' ? `${p.value}g` : `${p.value} ${unit}`}</strong>
        </p>
      ))}
    </div>
  )
}

function DoseTip({ active, payload, label, unit = 'kg' }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className={styles.tipRow}>
          <span>{p.name === 'dose' ? 'Dose' : 'Weight'}</span>
          <strong>{p.name === 'dose' ? `${p.value} mg` : `${p.value} ${unit}`}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Chart cards ───────────────────────────────────────────────────────────────

function ChartCard({ title, description, children, legend }) {
  return (
    <Card padding={18} radius={16} style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: FONT.ui, fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
      <p style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, margin: '6px 0 14px', lineHeight: 1.5 }}>{description}</p>
      <div>{children}</div>
      {legend && (
        <>
          <Hairline style={{ margin: '12px 0 10px' }} />
          <div style={{ display: 'flex', gap: 18, fontFamily: FONT.ui, fontSize: 12, color: T.text }}>{legend}</div>
        </>
      )}
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Charts({ onNavigate, entitlements, onUpgrade, logs = {}, userSettings = {} }) {
  const hasPremium = !entitlements || entitlements.hasPremium
  // Free plan: weight history limited to the most recent 4 weeks.
  const FREE_RANGE = '4W'
  const [range, setRange]           = useState(hasPremium ? '8W' : FREE_RANGE)
  const [bannerOpen, setBannerOpen] = useState(true)

  const isMetric = (userSettings.unitSystem ?? 'metric') !== 'us'
  const wUnit    = isMetric ? 'kg' : 'lb'

  const weeklyData = useMemo(
    () => buildWeekly(logs, RANGE_WEEKS[range] ?? 8, isMetric),
    [logs, range, isMetric]
  )
  const weightVals  = weeklyData.filter(r => r.weight != null).map(r => r.weight)
  const proteinVals = weeklyData.filter(r => r.protein != null).map(r => r.protein)
  const doseVals    = weeklyData.filter(r => r.dose != null).map(r => r.dose)
  const weightDomain  = niceDomain(weightVals, 1)
  const proteinDomain = [0, proteinVals.length ? Math.ceil(Math.max(...proteinVals) + 20) : 160]
  const doseDomain    = [0, doseVals.length ? Math.ceil(Math.max(...doseVals) + 2.5) : 7.5]
  const hasData = weightVals.length > 0

  const gridColor    = T.hair
  const gridProps    = { stroke: gridColor, strokeDasharray: '3 3' }
  const axisS        = { fontSize: 11, fill: T.mute, fontFamily: FONT.ui }

  const LegItem = ({ swatch, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {swatch}
      <span style={{ fontSize: 12, color: T.text }}>{label}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui }}>
      <div style={{ maxWidth: 430, margin: '0 auto', paddingBottom: 100 }}>

        <TrialBanner entitlements={entitlements} onUpgrade={onUpgrade} />

        {/* ── Info banner (only while there's little data) ─────────── */}
        {bannerOpen && weightVals.length < 2 && (
          <div style={{
            margin: '12px 16px 0', padding: '12px 14px',
            background: T.surf2, borderRadius: 10,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.mute} strokeWidth="1.8" style={{ marginTop: 2, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5" strokeLinecap="round"/>
            </svg>
            <div style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, color: T.text, lineHeight: 1.45 }}>
              Log your weight over a few weeks and your trends will appear here automatically.
            </div>
            <button onClick={() => setBannerOpen(false)} style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: T.mute, lineHeight: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ padding: '18px 22px 0' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1 }}>Charts</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 6 }}>
            {hasData ? `${weeklyData.length} week${weeklyData.length === 1 ? '' : 's'} of your data` : 'Your logged trends'}
          </div>
        </div>

        {/* ── Range chips ────────────────────────────────────────── */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 6 }}>
          {['4W','8W','3M','6M','1Y'].map(r => {
            const locked = !hasPremium && r !== FREE_RANGE
            return (
              <button key={r}
                onClick={() => locked ? onUpgrade?.() : setRange(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 14,
                  border: `1px solid ${r === range ? T.ink : T.hair}`,
                  background: r === range ? T.ink : 'transparent',
                  color: locked ? T.faint : r === range ? T.inkText : T.text,
                  fontFamily: FONT.mono, fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}>
                {r}
                {locked && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ margin: '18px 22px 0', height: 1, background: T.hair }} />

        <div style={{ padding: '14px 16px 0' }}>

          {!hasData && (
            <Card padding={28} radius={16} style={{ marginBottom: 10, textAlign: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="1.6" style={{ margin: '0 auto 12px' }}>
                <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" strokeLinecap="round"/>
              </svg>
              <div style={{ fontFamily: FONT.ui, fontSize: 16, fontWeight: 600, color: T.text }}>No data to chart yet</div>
              <p style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, lineHeight: 1.5, margin: '8px auto 16px', maxWidth: 280 }}>
                Log your weight a few times and your trends will appear here.
              </p>
              <button type="button" onClick={() => onNavigate('log')} style={{
                padding: '11px 20px', border: 0, borderRadius: 10, background: T.ink, color: T.inkText,
                fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Log today</button>
            </Card>
          )}

          {hasData && <>

          {/* ── Chart 1: Weight over time ────────────────────────── */}
          <ChartCard
            title="Weight over time"
            description="Dots show your weekly weight. The dashed line is a 3-week rolling average — it smooths out natural day-to-day variation."
            legend={
              <>
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.accent} strokeWidth="2.4"/></svg>} label="Weekly weight" />
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.faint} strokeWidth="1.5" strokeDasharray="3 3"/></svg>} label="3-week avg" />
              </>
            }
          >
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={T.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={T.accent} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} tick={axisS} />
                <YAxis domain={weightDomain} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit={` ${wUnit}`} allowDecimals={false} />
                <Tooltip content={<WeightTip unit={wUnit} />} cursor={{ stroke: T.hair, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="weight" stroke={T.accent} strokeWidth={2.4} fill="url(#weightGrad)"
                  dot={{ r: 2.6, fill: T.accent, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: T.accent, strokeWidth: 1.5, stroke: '#fff' }} />
                <Line type="monotone" dataKey="weightAvg" stroke={T.faint} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 2: Protein vs Weight ───────────────────────── */}
          <ChartCard
            title="Protein and weight patterns"
            description="Bars show your average weekly protein. The line follows your weight — weeks with higher protein tend to align with steadier trends."
            legend={
              <>
                <LegItem swatch={<svg width="16" height="12"><rect x="0.5" y="0.5" width="15" height="11" rx="1.5" fill={T.accentSoft} stroke={T.accentHair} strokeWidth="1"/></svg>} label="Protein (g)" />
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.ink} strokeWidth="2"/></svg>} label={`Weight (${wUnit})`} />
              </>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} tick={axisS} />
                <YAxis yAxisId="protein" domain={proteinDomain} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit="g" allowDecimals={false} />
                <YAxis yAxisId="weight" orientation="right" domain={weightDomain} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit={` ${wUnit}`} allowDecimals={false} />
                <Tooltip content={<ProteinTip unit={wUnit} />} cursor={{ fill: T.surf2 }} />
                <Bar yAxisId="protein" dataKey="protein" fill={T.accentSoft} stroke={T.accentHair} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={T.ink} strokeWidth={2} dot={{ r: 2.8, fill: T.ink, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: T.ink, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 3: Dose vs Weight ──────────────────────────── */}
          <ChartCard
            title="Dosage and weight"
            description="The step line shows your logged dose; the solid line follows your weight over the same weeks."
            legend={
              <>
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.ink} strokeWidth="2"/></svg>} label={`Weight (${wUnit})`} />
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.faint} strokeWidth="1.5" strokeDasharray="3 3"/></svg>} label="Dose (mg)" />
              </>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} tick={axisS} />
                <YAxis yAxisId="weight" domain={weightDomain} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit={` ${wUnit}`} allowDecimals={false} />
                <YAxis yAxisId="dose" orientation="right" domain={doseDomain} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit=" mg" />
                <Tooltip content={<DoseTip unit={wUnit} />} cursor={{ stroke: T.hair, strokeWidth: 1 }} />
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={T.ink} strokeWidth={2} dot={{ r: 2.6, fill: T.ink, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: T.ink, strokeWidth: 2, stroke: '#fff' }} />
                <Line yAxisId="dose" type="stepAfter" dataKey="dose" stroke={T.faint} strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 4, fill: T.faint }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          </>}

          <p style={{ fontFamily: FONT.ui, fontSize: 11, color: T.faint, lineHeight: 1.6, textAlign: 'center', padding: '12px 0 0', margin: 0 }}>
            Charts reflect your logged data and are not medical advice.
          </p>
        </div>

      </div>

      {/* ── Bottom tab bar ───────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <TabBar active="charts" onTab={onNavigate} />
      </div>
    </div>
  )
}
