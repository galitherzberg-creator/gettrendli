import {
  ResponsiveContainer, AreaChart, Area, ComposedChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import styles from './Charts.module.css'
import { T, FONT, Eyebrow, Hairline, Card, TabBar } from './tokens'

// ── Mock data ─────────────────────────────────────────────────────────────────

const rawWeeklyData = [
  { week: 'Mar 3',  weight: 86.1, protein: 128, dose: 2.5 },
  { week: 'Mar 10', weight: 85.6, protein: 132, dose: 2.5 },
  { week: 'Mar 17', weight: 85.2, protein: 135, dose: 5.0 },
  { week: 'Mar 24', weight: 84.9, protein: 128, dose: 5.0 },
  { week: 'Mar 31', weight: 84.5, protein: 132, dose: 5.0 },
  { week: 'Apr 7',  weight: 84.1, protein: 141, dose: 5.0 },
  { week: 'Apr 14', weight: 83.7, protein: 142, dose: 5.0 },
  { week: 'Apr 21', weight: 83.4, protein: 139, dose: 5.0 },
]

const weeklyData = rawWeeklyData.map((row, i, arr) => {
  const window = arr.slice(Math.max(0, i - 2), i + 1)
  const avg = window.reduce((s, r) => s + r.weight, 0) / window.length
  return { ...row, weightAvg: Math.round(avg * 10) / 10 }
})

const WEIGHT_DOMAIN = [82.5, 87]
const WEIGHT_TICKS  = [83, 84, 85, 86, 87]

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

function WeightTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      <p className={styles.tipRow}><span>Weight</span><strong>{payload[0]?.value} kg</strong></p>
    </div>
  )
}

function ProteinTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className={styles.tipRow}>
          <span>{p.name === 'protein' ? 'Protein avg' : 'Weight'}</span>
          <strong>{p.name === 'protein' ? `${p.value}g` : `${p.value} kg`}</strong>
        </p>
      ))}
    </div>
  )
}

function DoseTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <p className={styles.tipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className={styles.tipRow}>
          <span>{p.name === 'dose' ? 'Dose' : 'Weight'}</span>
          <strong>{p.name === 'dose' ? `${p.value} mg` : `${p.value} kg`}</strong>
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

export default function Charts({ onNavigate }) {
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

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ padding: '18px 22px 0' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1 }}>Charts</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 6 }}>Last 8 weeks of data</div>
        </div>

        <div style={{ margin: '18px 22px 0', height: 1, background: T.hair }} />

        <div style={{ padding: '14px 16px 0' }}>

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
                <YAxis domain={WEIGHT_DOMAIN} ticks={WEIGHT_TICKS} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit=" kg" />
                <Tooltip content={<WeightTip />} cursor={{ stroke: T.hair, strokeWidth: 1 }} />
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
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.ink} strokeWidth="2"/></svg>} label="Weight (kg)" />
              </>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} tick={axisS} />
                <YAxis yAxisId="protein" domain={[100, 165]} ticks={[110, 130, 150]} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit="g" />
                <YAxis yAxisId="weight" orientation="right" domain={WEIGHT_DOMAIN} ticks={WEIGHT_TICKS} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit=" kg" />
                <Tooltip content={<ProteinTip />} cursor={{ fill: T.surf2 }} />
                <Bar yAxisId="protein" dataKey="protein" fill={T.accentSoft} stroke={T.accentHair} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={T.ink} strokeWidth={2} dot={{ r: 2.8, fill: T.ink, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: T.ink, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 3: Dose vs Weight ──────────────────────────── */}
          <ChartCard
            title="Dosage and weight"
            description="The step line shows your dose — it increased from 2.5 to 5 mg in mid-March. The weight line continues below."
            legend={
              <>
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.ink} strokeWidth="2"/></svg>} label="Weight (kg)" />
                <LegItem swatch={<svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke={T.faint} strokeWidth="1.5" strokeDasharray="3 3"/></svg>} label="Dose (mg)" />
              </>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} tick={axisS} />
                <YAxis yAxisId="weight" domain={WEIGHT_DOMAIN} ticks={WEIGHT_TICKS} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit=" kg" />
                <YAxis yAxisId="dose" orientation="right" domain={[0, 7.5]} ticks={[2.5, 5.0]} tick={axisS} axisLine={false} tickLine={false} tickMargin={4} unit=" mg" />
                <Tooltip content={<DoseTip />} cursor={{ stroke: T.hair, strokeWidth: 1 }} />
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={T.ink} strokeWidth={2} dot={{ r: 2.6, fill: T.ink, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: T.ink, strokeWidth: 2, stroke: '#fff' }} />
                <Line yAxisId="dose" type="stepAfter" dataKey="dose" stroke={T.faint} strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 4, fill: T.faint }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

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
