import { useState } from 'react'
import { T, FONT, Eyebrow } from './tokens'

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = {
  active:    { value: '12,408', delta: '+184',  label: 'ACTIVE'    },
  new7d:     { value: '326',    delta: '+9%',   label: 'NEW 7D'    },
  retention: { value: '78',     delta: null,    label: 'RETENTION', unit: '%' },
}

const QUEUE_ITEMS = [
  { id: 'T-2418', cat: 'SIDE EFFECT', priority: 'HIGH', title: 'Nausea increased after titration to 1.7 mg',          user: 'Rachel Park',    time: '12M AGO' },
  { id: 'T-2417', cat: 'BILLING',     priority: 'MID',  title: 'Annual plan downgrade — wants refund difference',      user: 'Mateo Rivera',   time: '47M AGO' },
  { id: 'T-2416', cat: 'ACCOUNT',     priority: 'MID',  title: 'Lost access to 2FA, would like to export data',        user: 'Hannah Yu',      time: '1H AGO'  },
  { id: 'T-2412', cat: 'BUG',         priority: 'LOW',  title: 'Streak reset after timezone change',                   user: 'Will Andersson', time: '3H AGO'  },
  { id: 'T-2411', cat: 'SIDE EFFECT', priority: 'HIGH', title: 'Vomiting episode 6h after dose escalation',            user: 'Priya Mehta',    time: '5H AGO'  },
  { id: 'T-2410', cat: 'ACCOUNT',     priority: 'LOW',  title: "Can't change injection day from app settings",         user: 'Sam Torres',     time: '7H AGO'  },
  { id: 'T-2409', cat: 'BILLING',     priority: 'MID',  title: 'Double-charged for December subscription',             user: 'Nina Kowalski',  time: '1D AGO'  },
  { id: 'T-2408', cat: 'FEATURE',     priority: 'LOW',  title: 'Request: add BMI tracking to measurements',            user: 'James Liu',      time: '1D AGO'  },
  { id: 'T-2407', cat: 'SIDE EFFECT', priority: 'MID',  title: 'Persistent heartburn started week 3 of semaglutide',   user: 'Carla Ferreira', time: '2D AGO'  },
  { id: 'T-2406', cat: 'BILLING',     priority: 'LOW',  title: 'Receipt not delivered after annual renewal',            user: 'Omar Patel',     time: '2D AGO'  },
  { id: 'T-2405', cat: 'BUG',         priority: 'MID',  title: 'Weight chart shows wrong unit after switching to LB',  user: 'Yuki Tanaka',    time: '3D AGO'  },
  { id: 'T-2404', cat: 'ACCOUNT',     priority: 'LOW',  title: 'Wants to merge two separate accounts',                  user: 'Marcus Webb',    time: '4D AGO'  },
  { id: 'T-2403', cat: 'FEATURE',     priority: 'LOW',  title: 'Add Apple Health sync for steps data',                  user: 'Sofia Andersen', time: '5D AGO'  },
  { id: 'T-2402', cat: 'SIDE EFFECT', priority: 'HIGH', title: 'Severe dizziness — pausing medication',                 user: 'Tyler Brooks',   time: '6D AGO'  },
]

const USER_ITEMS = [
  { id: 'U-1042', name: 'Elena Marchetti', plan: 'Plus', days: 87,  drug: 'Semaglutide', trend: '−12.4 kg', status: 'active',   lastActive: '2H AGO'   },
  { id: 'U-1041', name: 'Marcus Webb',     plan: 'Plus', days: 124, drug: 'Tirzepatide', trend: '−18.2 kg', status: 'active',   lastActive: '4H AGO'   },
  { id: 'U-1040', name: 'Sofia Andersen',  plan: 'Free', days: 31,  drug: 'Semaglutide', trend: '−3.1 kg',  status: 'inactive', lastActive: '1D AGO'   },
  { id: 'U-1039', name: 'Tyler Brooks',    plan: 'Plus', days: 210, drug: 'Tirzepatide', trend: '−24.0 kg', status: 'active',   lastActive: '3H AGO'   },
  { id: 'U-1038', name: 'Yuki Tanaka',     plan: 'Free', days: 14,  drug: 'Liraglutide', trend: '−1.2 kg',  status: 'active',   lastActive: '6H AGO'   },
  { id: 'U-1037', name: 'Priya Mehta',     plan: 'Plus', days: 63,  drug: 'Semaglutide', trend: '−8.8 kg',  status: 'active',   lastActive: 'NOW'      },
  { id: 'U-1036', name: 'James Liu',       plan: 'Free', days: 7,   drug: 'None',         trend: '—',        status: 'new',      lastActive: '12H AGO'  },
  { id: 'U-1035', name: 'Carla Ferreira',  plan: 'Plus', days: 45,  drug: 'Semaglutide', trend: '−5.4 kg',  status: 'active',   lastActive: '1D AGO'   },
]

const FLAG_ITEMS = [
  { id: 'F-031', type: 'RAPID LOSS',    title: 'Weight drop > 3 kg in 7 days',              user: 'Marcus Webb',    time: '1H AGO',  severity: 'HIGH' },
  { id: 'F-030', type: 'NO LOGS',       title: 'Zero logs for 21+ days',                    user: 'Sofia Andersen', time: '2D AGO',  severity: 'MID'  },
  { id: 'F-029', type: 'DOSE GAP',      title: 'Missed 2 consecutive injections',            user: 'James Liu',      time: '3D AGO',  severity: 'MID'  },
]

const ADMIN = { name: 'Sarah Reyes', role: 'Clinical Admin', initials: 'SR' }

// Subscription / revenue metrics (GetTrendli Plus = $9.99/mo).
const SUB = {
  mrr:        '$48,210',
  mrrDelta:   '+6.2%',
  plusUsers:  4842,
  freeUsers:  7566,
  trialsActive: 1284,
  trialConv:  '41%',
  churn:      '3.1%',
  arpu:       '$3.89',
}

// ── Priority badge ─────────────────────────────────────────────────────────────
function PriorityBadge({ level }) {
  const styles = {
    HIGH: { background: T.ink, color: T.inkText, border: 'none' },
    MID:  { background: 'transparent', color: T.mute, border: `1px solid ${T.hair}` },
    LOW:  { background: 'transparent', color: T.faint, border: `1px solid ${T.hair}` },
  }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 6,
      fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      flexShrink: 0, ...styles[level],
    }}>{level}</span>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
  const isPlus = plan === 'Plus'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 6,
      fontFamily: FONT.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
      background: isPlus ? T.accentSoft : T.surf2,
      color: isPlus ? T.accentDark : T.faint,
      border: isPlus ? `1px solid ${T.accentHair}` : `1px solid ${T.hair}`,
    }}>{plan.toUpperCase()}</span>
  )
}

// ── Tab chip (Queue / Users / Flags) ──────────────────────────────────────────
function TabChip({ id, label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 4px', background: 'transparent', border: 0,
        borderBottom: `2px solid ${active ? T.accent : 'transparent'}`,
        cursor: 'pointer', fontFamily: FONT.ui, fontSize: 14,
        fontWeight: active ? 700 : 500, color: active ? T.text : T.mute,
        letterSpacing: '-0.01em', marginRight: 16,
        transition: 'color 0.15s',
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 600,
          padding: '2px 6px', borderRadius: 20,
          background: active ? T.accent : T.hair,
          color: active ? T.inkText : T.mute,
          letterSpacing: '0.02em',
        }}>
          {count.toLocaleString()}
        </span>
      )}
    </button>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, unit }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: '12px 14px',
      background: T.card, border: `1px solid ${T.hair}`, borderRadius: 14,
    }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: T.mute, letterSpacing: '0.12em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <span style={{
          fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 30,
          fontWeight: 400, color: T.text, letterSpacing: '-0.02em', lineHeight: 1,
        }}>{value}</span>
        {unit && (
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mute, letterSpacing: '0.04em' }}>{unit}</span>
        )}
      </div>
      {delta && (
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.accentDark, letterSpacing: '0.04em', marginTop: 4, fontWeight: 600 }}>
          {delta}
        </div>
      )}
    </div>
  )
}

// ── Queue item (controlled — resolve state lives in Admin) ─────────────────────
function QueueItem({ item, first, resolved, onToggle, onOpen }) {
  return (
    <div
      style={{
        padding: '14px 20px',
        borderTop: first ? 0 : `1px solid ${T.hair}`,
        opacity: resolved ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div onClick={onOpen} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.10em' }}>
            {item.id} · {item.cat}
          </span>
          <PriorityBadge level={item.priority} />
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 5 }}>
          {item.title}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 12, color: T.mute }}>{item.user}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onToggle}
            style={{
              fontFamily: FONT.mono, fontSize: 8, color: resolved ? T.accentDark : T.faint,
              letterSpacing: '0.08em', background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
            }}
          >{resolved ? 'RESOLVED ✓' : 'RESOLVE'}</button>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
            {item.time}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Priority filter chip ───────────────────────────────────────────────────────
function FilterChip({ label, count, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '5px 11px', borderRadius: 16, cursor: 'pointer',
      border: `1px solid ${active ? T.ink : T.hair}`,
      background: active ? T.ink : 'transparent',
      color: active ? T.inkText : T.mute,
      fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em',
    }}>
      {label}{count != null ? ` ${count}` : ''}
    </button>
  )
}

// ── User item ─────────────────────────────────────────────────────────────────
function UserItem({ item, first, onOpen }) {
  return (
    <div onClick={onOpen} style={{
      padding: '13px 20px',
      borderTop: first ? 0 : `1px solid ${T.hair}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      cursor: 'pointer',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>
            {item.name}
          </span>
          <PlanBadge plan={item.plan} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em' }}>
          {item.id} · {item.drug} · DAY {String(item.days).padStart(3, '0')}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.accentDark, letterSpacing: '-0.01em' }}>
          {item.trend}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em', marginTop: 2 }}>
          {item.lastActive}
        </div>
      </div>
    </div>
  )
}

// ── Flag item ─────────────────────────────────────────────────────────────────
function FlagItem({ item, first }) {
  return (
    <div style={{
      padding: '14px 20px',
      borderTop: first ? 0 : `1px solid ${T.hair}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.10em' }}>
          {item.id} · {item.type}
        </span>
        <PriorityBadge level={item.severity} />
      </div>
      <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: '-0.01em', marginBottom: 5 }}>
        {item.title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 12, color: T.mute }}>{item.user}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>{item.time}</span>
      </div>
    </div>
  )
}

// ── Detail helpers ──────────────────────────────────────────────────────────────
function BackBar({ label, onBack }) {
  return (
    <button type="button" onClick={onBack} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '16px 20px 10px',
      background: 'transparent', border: 0, cursor: 'pointer',
      fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.08em',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
      {label}
    </button>
  )
}

function MetaRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderTop: `1px solid ${T.hair}` }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: accent ? T.accentDark : T.text, letterSpacing: '-0.01em' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ label, onClick, dark }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '11px 8px', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${dark ? T.ink : T.hair}`,
      background: dark ? T.ink : T.card, color: dark ? T.inkText : T.text,
      fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
    }}>{label}</button>
  )
}

// ── Ticket detail ────────────────────────────────────────────────────────────
function TicketDetail({ item, resolved, onToggle, onBack, notify }) {
  return (
    <div>
      <BackBar label="BACK TO QUEUE" onBack={onBack} />
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.10em' }}>{item.id} · {item.cat}</span>
          <PriorityBadge level={item.priority} />
        </div>
        <h2 style={{ fontFamily: FONT.ui, fontSize: 21, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: T.text, lineHeight: 1.25 }}>
          {item.title}
        </h2>
      </div>

      <MetaRow label="REPORTED BY" value={item.user} />
      <MetaRow label="OPENED" value={item.time} />
      <MetaRow label="PLAN" value="GetTrendli Plus" accent />
      <MetaRow label="STATUS" value={resolved ? 'Resolved' : 'Open'} accent={resolved} />

      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.10em', marginBottom: 8 }}>MESSAGE</div>
        <div style={{ background: T.surf2, borderRadius: 12, padding: '12px 14px', fontFamily: FONT.ui, fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
          {item.title}. Could you help me understand what to do next?
        </div>
      </div>

      <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Send guidance', 'Escalate to clinician', 'Request more info'].map(a => (
          <button key={a} type="button" onClick={() => notify(`${a} — sent`)} style={{
            padding: '8px 13px', borderRadius: 20, border: `1px solid ${T.hair}`, background: T.card,
            color: T.text, fontFamily: FONT.ui, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>{a}</button>
        ))}
      </div>

      <div style={{ padding: '18px 20px 0', display: 'flex', gap: 8 }}>
        <ActionBtn dark label={resolved ? 'Reopen ticket' : 'Mark resolved'} onClick={() => { onToggle(); notify(resolved ? 'Ticket reopened' : 'Ticket resolved'); }} />
      </div>
    </div>
  )
}

// ── User detail ───────────────────────────────────────────────────────────────
function UserDetail({ item, onBack, notify }) {
  const startW = item.trend !== '—' ? '92.0 kg' : '—'
  return (
    <div>
      <BackBar label="BACK TO USERS" onBack={onBack} />
      <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: T.ink, color: T.inkText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.ui, fontWeight: 700, fontSize: 16 }}>
          {item.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontFamily: FONT.ui, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: T.text }}>{item.name}</h2>
            <PlanBadge plan={item.plan} />
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em', marginTop: 3 }}>
            {item.id} · {item.status.toUpperCase()} · LAST ACTIVE {item.lastActive}
          </div>
        </div>
      </div>

      <MetaRow label="MEDICATION" value={item.drug} />
      <MetaRow label="DAYS ON PROGRAM" value={String(item.days).padStart(3, '0')} />
      <MetaRow label="START WEIGHT" value={startW} />
      <MetaRow label="TOTAL CHANGE" value={item.trend} accent />
      <MetaRow label="LOG ADHERENCE" value={`${Math.min(99, 60 + (item.days % 40))}%`} />

      <div style={{ padding: '18px 20px 0', display: 'flex', gap: 8 }}>
        <ActionBtn label="Message" onClick={() => notify(`Message sent to ${item.name}`)} />
        {item.plan !== 'Plus'
          ? <ActionBtn dark label="Comp Plus" onClick={() => notify(`${item.name} upgraded to Plus (comp)`)} />
          : <ActionBtn label="Manage plan" onClick={() => notify('Opened plan management')} />}
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        <button type="button" onClick={() => notify('Streak reset')} style={{
          width: '100%', padding: '11px 8px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${T.hair}`, background: T.card, color: '#C62828',
          fontFamily: FONT.ui, fontSize: 13, fontWeight: 600,
        }}>Reset streak</button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Admin({ onNavigate }) {
  const [activeTab,   setActiveTab]   = useState('queue')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching,   setSearching]   = useState(false)
  const [resolvedIds, setResolvedIds] = useState({})   // { [ticketId]: true }
  const [priFilter,   setPriFilter]   = useState('ALL') // ALL | HIGH | MID | LOW
  const [detail,      setDetail]      = useState(null)  // { kind:'ticket'|'user', item }
  const [toast,       setToast]       = useState(null)

  const toggleResolved = id => setResolvedIds(prev => ({ ...prev, [id]: !prev[id] }))
  const notify = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const openCount = QUEUE_ITEMS.filter(i => !resolvedIds[i.id]).length
  const highCount = QUEUE_ITEMS.filter(i => i.priority === 'HIGH' && !resolvedIds[i.id]).length

  const filteredQueue = QUEUE_ITEMS.filter(i => {
    if (priFilter !== 'ALL' && i.priority !== priFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return i.title.toLowerCase().includes(q) || i.user.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)
  })

  const filteredUsers = searchQuery
    ? USER_ITEMS.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : USER_ITEMS

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column' }}>

      {/* ── Detail overlay (ticket / user) ───────────────────── */}
      {detail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60, background: T.bg, overflowY: 'auto',
          maxWidth: 430, margin: '0 auto',
        }}>
          {detail.kind === 'ticket'
            ? <TicketDetail item={detail.item} resolved={!!resolvedIds[detail.item.id]}
                onToggle={() => toggleResolved(detail.item.id)} onBack={() => setDetail(null)} notify={notify} />
            : <UserDetail item={detail.item} onBack={() => setDetail(null)} notify={notify} />}
        </div>
      )}

      {/* ── Action toast ─────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
          background: T.ink, color: T.inkText, padding: '10px 18px', borderRadius: 22,
          fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      <div style={{ maxWidth: 430, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 86 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Eyebrow style={{ letterSpacing: '0.12em', fontSize: 9 }}>GETTRENDLI · ADMIN</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Search toggle */}
              <button
                type="button"
                onClick={() => { setSearching(s => !s); if (searching) setSearchQuery('') }}
                style={{
                  width: 34, height: 34, borderRadius: 17, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: searching ? T.accentSoft : 'transparent',
                  border: `1px solid ${searching ? T.accentHair : T.hair}`,
                  color: searching ? T.accentDark : T.mute, cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="6.5" cy="6.5" r="4"/>
                  <path d="M11 11l3 3"/>
                </svg>
              </button>
              {/* Admin avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: 17,
                background: T.ink, color: T.inkText,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.ui, fontWeight: 700, fontSize: 12, letterSpacing: '-0.01em',
              }}>
                {ADMIN.initials}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', margin: 0, color: T.text, lineHeight: 1 }}>
              Operations
            </h1>
            {highCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: FONT.mono, fontSize: 9, color: '#C62828', letterSpacing: '0.08em',
                background: 'rgba(198,40,40,0.08)', padding: '4px 8px', borderRadius: 8,
                border: '1px solid rgba(198,40,40,0.15)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#C62828', display: 'inline-block' }} />
                {highCount} HIGH PRIORITY
              </div>
            )}
          </div>

          {/* Search bar */}
          {searching && (
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={T.faint} strokeWidth="1.5" strokeLinecap="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="6.5" cy="6.5" r="4"/>
                <path d="M11 11l3 3"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tickets, users…"
                style={{
                  width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, boxSizing: 'border-box',
                  border: `1.5px solid ${T.accent}`, outline: 0, background: T.card,
                  fontFamily: FONT.ui, fontSize: 14, color: T.text, letterSpacing: '-0.01em',
                }}
              />
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {Object.values(STATS).map(s => (
              <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} unit={s.unit} />
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.hair}` }}>
            <TabChip id="queue" label="Queue"  count={openCount} active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
            <TabChip id="users" label="Users"  count={12408}              active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
            <TabChip id="flags" label="Flags"  count={FLAG_ITEMS.length}  active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} />
            <TabChip id="revenue" label="Revenue" active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} />
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────── */}
        <div style={{ flex: 1 }}>

          {/* Queue */}
          {activeTab === 'queue' && (
            <div>
              {/* Priority filter + open count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 10px', flexWrap: 'wrap' }}>
                {['ALL', 'HIGH', 'MID', 'LOW'].map(p => (
                  <FilterChip key={p} label={p} active={priFilter === p}
                    count={p === 'ALL' ? openCount : QUEUE_ITEMS.filter(i => i.priority === p && !resolvedIds[i.id]).length}
                    onClick={() => setPriFilter(p)} />
                ))}
                <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.08em' }}>
                  {openCount} OPEN
                </span>
              </div>
              {filteredQueue.map((item, i) => (
                <QueueItem key={item.id} item={item} first={i === 0}
                  resolved={!!resolvedIds[item.id]} onToggle={() => toggleResolved(item.id)}
                  onOpen={() => setDetail({ kind: 'ticket', item })} />
              ))}
              {filteredQueue.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 14, color: T.mute }}>
                  {searchQuery ? `No tickets matching "${searchQuery}"` : 'No tickets in this filter'}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div>
              {/* Summary row */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.hair}` }}>
                {[
                  { label: 'PLUS',     val: USER_ITEMS.filter(u => u.plan === 'Plus').length.toString() },
                  { label: 'FREE',     val: USER_ITEMS.filter(u => u.plan === 'Free').length.toString() },
                  { label: 'NEW 7D',   val: '47' },
                  { label: 'CHURNED',  val: '12' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1, padding: '12px 0', textAlign: 'center',
                    borderRight: i < 3 ? `1px solid ${T.hair}` : 'none',
                  }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.faint, letterSpacing: '0.10em', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontFamily: FONT.ui, fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {(searchQuery ? filteredUsers : USER_ITEMS).map((item, i) => (
                <UserItem key={item.id} item={item} first={i === 0}
                  onOpen={() => setDetail({ kind: 'user', item })} />
              ))}
              {searchQuery && filteredUsers.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 14, color: T.mute }}>
                  No users matching "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {/* Flags */}
          {activeTab === 'flags' && (
            <div>
              <div style={{ padding: '10px 20px 8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(198,40,40,0.06)', border: '1px solid rgba(198,40,40,0.12)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2l6 12H2L8 2Z" stroke="#C62828" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 7v3" stroke="#C62828" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="12" r="0.8" fill="#C62828"/>
                  </svg>
                  <span style={{ fontFamily: FONT.ui, fontSize: 12, color: '#C62828', letterSpacing: '-0.01em' }}>
                    {FLAG_ITEMS.length} automated flag{FLAG_ITEMS.length !== 1 ? 's' : ''} require review
                  </span>
                </div>
              </div>
              {FLAG_ITEMS.map((item, i) => (
                <FlagItem key={item.id} item={item} first={i === 0} />
              ))}
            </div>
          )}

          {/* Revenue */}
          {activeTab === 'revenue' && (
            <div style={{ padding: '14px 16px 0' }}>
              {/* Headline MRR */}
              <div style={{ background: T.ink, color: T.inkText, borderRadius: 16, padding: '18px 18px 16px', marginBottom: 10 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: 'rgba(250,250,247,0.5)', letterSpacing: '0.12em', marginBottom: 6 }}>MONTHLY RECURRING REVENUE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em' }}>{SUB.mrr}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.accent, fontWeight: 600 }}>{SUB.mrrDelta}</span>
                </div>
              </div>
              {/* Metric grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <StatCard label="PLUS SUBSCRIBERS" value={SUB.plusUsers.toLocaleString()} delta={`${SUB.trialConv} trial conv.`} />
                <StatCard label="FREE USERS"       value={SUB.freeUsers.toLocaleString()} />
                <StatCard label="ACTIVE TRIALS"    value={SUB.trialsActive.toLocaleString()} delta="3-month" />
                <StatCard label="ARPU"             value={SUB.arpu} />
              </div>
              {/* Plus vs Free split bar */}
              <div style={{ background: T.card, border: `1px solid ${T.hair}`, borderRadius: 14, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>PLUS VS FREE</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint }}>{Math.round(SUB.plusUsers / (SUB.plusUsers + SUB.freeUsers) * 100)}% PAID</span>
                </div>
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: T.surf2 }}>
                  <div style={{ width: `${SUB.plusUsers / (SUB.plusUsers + SUB.freeUsers) * 100}%`, background: T.accent }} />
                </div>
              </div>
              <MetaRow label="CHURN (30D)" value={SUB.churn} />
            </div>
          )}

        </div>

        {/* ── Back to app ─────────────────────────────────────── */}
        <div style={{ padding: '8px 20px 0', borderTop: `1px solid ${T.hair}` }}>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              background: 'transparent', border: 0, padding: '8px 0',
              fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.10em',
              cursor: 'pointer',
            }}
          >
            ← BACK TO APP
          </button>
        </div>

      </div>

      {/* ── Acting-as banner (fixed bottom) ───────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#111', borderTop: '1px solid #222',
        padding: '12px 20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 430, margin: '0 auto',
      }}>
        {/* Fake inner centering so fixed works */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 8, color: 'rgba(250,250,247,0.35)', letterSpacing: '0.14em', marginBottom: 3 }}>
              ACTING AS
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 700, color: '#FAFAF7', letterSpacing: '-0.01em' }}>
              {ADMIN.name} · {ADMIN.role}
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: '8px 18px', borderRadius: 20,
              border: '1px solid rgba(250,250,247,0.3)',
              background: 'transparent', color: '#FAFAF7',
              fontFamily: FONT.mono, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.08em', cursor: 'pointer',
            }}
          >SWITCH ROLE</button>
        </div>
      </div>
    </div>
  )
}
