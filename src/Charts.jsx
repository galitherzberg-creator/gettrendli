import {
  ResponsiveContainer, AreaChart, Area, ComposedChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import styles from './Charts.module.css'

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

function ChartCard({ title, description, children }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartCardHeader}>
        <h2 className={styles.chartTitle}>{title}</h2>
        <p className={styles.chartDesc}>{description}</p>
      </div>
      <div className={styles.chartArea}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Charts({ theme, onNavigate }) {
  const isDark   = theme === 'dark'
  const gridColor   = isDark ? '#2C2C2C' : '#E8E7E3'
  const cursorFill  = isDark ? '#1C1C1C' : '#F2F1EE'
  const cursorStroke = isDark ? '#2C2C2C' : '#E8E7E3'
  const gridProps   = { stroke: gridColor, strokeDasharray: '3 3' }

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Charts</h1>
          <p className={styles.headerSub}>Last 8 weeks of data</p>
        </header>

        <div className={styles.scrollContent}>

          {/* ── Chart 1: Weight over time ────────────────────────── */}
          <ChartCard
            title="Weight over time"
            description="Dots show your weekly weight. The dashed line is a 3-week rolling average — it smooths out natural day-to-day variation."
          >
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2D5BE3" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#2D5BE3" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} />
                <YAxis
                  domain={WEIGHT_DOMAIN}
                  ticks={WEIGHT_TICKS}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  unit=" kg"
                />
                <Tooltip content={<WeightTip />} cursor={{ stroke: cursorStroke, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#2D5BE3"
                  strokeWidth={2}
                  fill="url(#weightGrad)"
                  dot={{ r: 3, fill: '#2D5BE3', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#2D5BE3', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="weightAvg"
                  stroke="#2D5BE3"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={styles.legend}>
              <span className={styles.legendLine} style={{ background: '#2D5BE3' }} />
              <span className={styles.legendText}>Weekly weight</span>
              <span className={styles.legendDash} style={{ backgroundImage: 'repeating-linear-gradient(to right, #2D5BE3 0px, #2D5BE3 5px, transparent 5px, transparent 8px)', opacity: 0.5 }} />
              <span className={styles.legendText}>3-week avg</span>
            </div>
          </ChartCard>

          {/* ── Chart 2: Protein vs Weight ───────────────────────── */}
          <ChartCard
            title="Protein and weight patterns"
            description="Bars show your average weekly protein. The line follows your weight — weeks with higher protein tend to align with steadier trends."
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} />
                <YAxis
                  yAxisId="protein"
                  domain={[100, 165]}
                  ticks={[110, 130, 150]}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  unit="g"
                />
                <YAxis
                  yAxisId="weight"
                  orientation="right"
                  domain={WEIGHT_DOMAIN}
                  ticks={WEIGHT_TICKS}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  unit=" kg"
                />
                <Tooltip content={<ProteinTip />} cursor={{ fill: cursorFill }} />
                <Bar
                  yAxisId="protein"
                  dataKey="protein"
                  fill="#EEF2FD"
                  stroke="#2D5BE3"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#1A1A1A', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#1A1A1A', strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={styles.legend}>
              <span className={styles.legendBar} />
              <span className={styles.legendText}>Protein (g)</span>
              <span className={styles.legendLine} />
              <span className={styles.legendText}>Weight (kg)</span>
            </div>
          </ChartCard>

          {/* ── Chart 3: Dose vs Weight ──────────────────────────── */}
          <ChartCard
            title="Dosage and weight"
            description="The step line shows your dose — it increased from 2.5 to 5 mg in mid-March. The weight line continues below."
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis {...xAxisProps} interval={1} />
                <YAxis
                  yAxisId="weight"
                  domain={WEIGHT_DOMAIN}
                  ticks={WEIGHT_TICKS}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  unit=" kg"
                />
                <YAxis
                  yAxisId="dose"
                  orientation="right"
                  domain={[0, 7.5]}
                  ticks={[2.5, 5.0]}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  unit=" mg"
                />
                <Tooltip content={<DoseTip />} cursor={{ stroke: cursorStroke, strokeWidth: 1 }} />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#1A1A1A', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#1A1A1A', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  yAxisId="dose"
                  type="stepAfter"
                  dataKey="dose"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 5, fill: '#D97706', strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={styles.legend}>
              <span className={styles.legendLine} />
              <span className={styles.legendText}>Weight (kg)</span>
              <span className={styles.legendDash} />
              <span className={styles.legendText}>Dose (mg)</span>
            </div>
          </ChartCard>

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── Bottom nav ───────────────────────────────────────────── */}
        <nav className={styles.bottomNav}>
          {[
            { icon: homeIcon,       label: 'Home',     action: 'dashboard' },
            { icon: chartIcon,      label: 'Charts',   action: 'charts',   active: true },
            { icon: plusIcon,       label: 'Log',      action: 'log',      center: true },
            { icon: insightNavIcon, label: 'Insights', action: 'insights' },
            { icon: settingsIcon,   label: 'Settings', action: 'settings' },
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
const insightNavIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 7v3M10 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const settingsIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14 14l1.06 1.06M4.93 15.07l1.06-1.06M14 6l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
