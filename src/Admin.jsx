import { useState, useEffect } from 'react'
import { T, FONT, Eyebrow } from './tokens'
import { adminListProfiles } from './cloudStore'

const PLUS_PRICE = 9.99

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Turn the raw rows from adminListProfiles() into the shape the console
// renders, computing everything (trend, activity, safety flags) from each
// user's own real settings/logs — no fabricated data.
function deriveUsers(rows) {
  const now = Date.now()
  return rows.map(row => {
    const s = row.settings || {}
    const logsObj = row.logs || {}
    const weightEntries = Object.entries(logsObj)
      .filter(([, e]) => e && e.weight)
      .sort(([a], [b]) => a.localeCompare(b))
    const startWeight  = weightEntries.length ? parseFloat(weightEntries[0][1].weight) : null
    const latestWeight = weightEntries.length ? parseFloat(weightEntries[weightEntries.length - 1][1].weight) : null
    const trendKg = (startWeight != null && latestWeight != null && weightEntries.length >= 2)
      ? +(latestWeight - startWeight).toFixed(1) : null

    const allDates = Object.keys(logsObj).sort()
    const lastLogDate = allDates.length ? allDates[allDates.length - 1] : null
    const daysSinceLastLog = lastLogDate
      ? Math.floor((now - new Date(lastLogDate + 'T12:00:00').getTime()) / 86400000) : null

    const createdAt = s.createdAt ? new Date(s.createdAt) : null
    const daysOn = createdAt ? Math.max(0, Math.floor((now - createdAt.getTime()) / 86400000)) : 0

    // Rapid weight loss: the two most recent weigh-ins, within 7 days of each
    // other, show a 3kg+ drop.
    let rapidLoss = false
    if (weightEntries.length >= 2) {
      const [d1, e1] = weightEntries[weightEntries.length - 2]
      const [d2, e2] = weightEntries[weightEntries.length - 1]
      const days = (new Date(d2) - new Date(d1)) / 86400000
      const drop = parseFloat(e1.weight) - parseFloat(e2.weight)
      if (days > 0 && days <= 7 && drop >= 3) rapidLoss = true
    }
    const noLogsFlag = allDates.length > 0 && daysSinceLastLog != null && daysSinceLastLog >= 14

    const status = allDates.length === 0
      ? 'new'
      : (daysSinceLastLog != null && daysSinceLastLog <= 2 ? 'active' : 'inactive')

    return {
      id: row.user_id,
      name: s.name || 'Unnamed',
      email: s.email || '—',
      plan: s.subscriptionActive ? 'Plus' : 'Free',
      days: daysOn,
      drug: s.medication ? s.medication[0].toUpperCase() + s.medication.slice(1) : 'None',
      startWeight, latestWeight,
      trend: trendKg != null ? `${trendKg > 0 ? '+' : ''}${trendKg} kg` : '—',
      status,
      hasLogs: allDates.length > 0,
      logCount: allDates.length,
      lastActive: lastLogDate ? fmtDate(lastLogDate) : 'Never logged',
      daysSinceLastLog,
      rapidLoss,
      noLogsFlag,
      adherencePct: daysOn > 0 ? Math.min(100, Math.round((allDates.length / daysOn) * 100)) : 0,
    }
  }).sort((a, b) => a.days - b.days)
}

const ADMIN_EMAIL = 'galit.herzberg@gmail.com'
const ADMIN_SETUP_SQL = `create policy "admin can view all profiles"
on public.profiles for select
using ( (auth.jwt() ->> 'email') = '${ADMIN_EMAIL}' );`

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
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.email} · {item.drug} · DAY {String(item.days).padStart(3, '0')}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: item.trend.startsWith('-') || item.trend.startsWith('−') ? T.accentDark : T.mute, letterSpacing: '-0.01em' }}>
          {item.trend}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: item.noLogsFlag ? '#C62828' : T.faint, letterSpacing: '0.06em', marginTop: 2 }}>
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
  return (
    <div>
      <BackBar label="BACK TO USERS" onBack={onBack} />
      <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: T.ink, color: T.inkText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.ui, fontWeight: 700, fontSize: 16 }}>
          {item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontFamily: FONT.ui, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: T.text }}>{item.name}</h2>
            <PlanBadge plan={item.plan} />
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em', marginTop: 3 }}>
            {item.email} · LAST ACTIVE {item.lastActive.toUpperCase()}
          </div>
        </div>
      </div>

      <MetaRow label="MEDICATION" value={item.drug} />
      <MetaRow label="DAYS ON PROGRAM" value={String(item.days).padStart(3, '0')} />
      <MetaRow label="START WEIGHT" value={item.startWeight != null ? `${item.startWeight} kg` : '—'} />
      <MetaRow label="TOTAL CHANGE" value={item.trend} accent={item.trend !== '—'} />
      <MetaRow label="LOG ADHERENCE" value={item.hasLogs ? `${item.adherencePct}%` : '—'} />
      {item.rapidLoss && (
        <MetaRow label="⚠ SAFETY FLAG" value="Rapid weight loss" />
      )}
      {item.noLogsFlag && (
        <MetaRow label="⚠ SAFETY FLAG" value={`No logs for ${item.daysSinceLastLog}+ days`} />
      )}

      <div style={{ padding: '18px 20px 0', display: 'flex', gap: 8 }}>
        <ActionBtn label="Message" onClick={() => notify(`(Demo) Message sent to ${item.name}`)} />
        {item.plan !== 'Plus'
          ? <ActionBtn dark label="Comp Plus" onClick={() => notify(`(Demo) ${item.name} would be upgraded to Plus`)} />
          : <ActionBtn label="Manage plan" onClick={() => notify('(Demo) Plan management')} />}
      </div>
      <div style={{ padding: '8px 20px 0', fontFamily: FONT.ui, fontSize: 10.5, color: T.faint, textAlign: 'center' }}>
        Actions here are demo-only for now — no real message or billing change is sent.
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Admin({ onNavigate, adminName, adminEmail }) {
  const [activeTab,   setActiveTab]   = useState('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching,   setSearching]   = useState(false)
  const [resolvedIds, setResolvedIds] = useState({})   // { [ticketId]: true } — queue tickets (none yet)
  const [priFilter,   setPriFilter]   = useState('ALL') // ALL | HIGH | MID | LOW
  const [detail,      setDetail]      = useState(null)  // { kind:'ticket'|'user', item }
  const [toast,       setToast]       = useState(null)

  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setLoadError(null)
    adminListProfiles()
      .then(rows => { if (!cancelled) setUsers(deriveUsers(rows)) })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Failed to load user data.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleResolved = id => setResolvedIds(prev => ({ ...prev, [id]: !prev[id] }))
  const notify = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  // No support-ticket system is built yet — the Queue tab is honestly empty
  // rather than showing fabricated tickets.
  const queueItems = []
  const openCount = queueItems.filter(i => !resolvedIds[i.id]).length
  const highCount = queueItems.filter(i => i.priority === 'HIGH' && !resolvedIds[i.id]).length
  const filteredQueue = queueItems.filter(i => {
    if (priFilter !== 'ALL' && i.priority !== priFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return i.title.toLowerCase().includes(q) || i.user.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)
  })

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users

  // Safety flags — derived from each user's own real logs (rapid weight loss,
  // long gaps with no logging), not a separate fabricated list.
  const flagItems = users.flatMap(u => {
    const items = []
    if (u.rapidLoss) items.push({ id: `${u.id}-rapid`, type: 'RAPID LOSS', title: 'Weight drop of 3kg+ within a 7-day window', user: u.name, time: u.lastActive, severity: 'HIGH' })
    if (u.noLogsFlag) items.push({ id: `${u.id}-nolog`, type: 'NO LOGS', title: `No logs for ${u.daysSinceLastLog}+ days`, user: u.name, time: u.lastActive, severity: 'MID' })
    return items
  })

  // Real subscription snapshot from each user's own stored entitlement flag.
  const totalUsers  = users.length
  const plusCount   = users.filter(u => u.plan === 'Plus').length
  const freeCount   = totalUsers - plusCount
  const new7d       = users.filter(u => u.days <= 7).length
  const inactiveCount = users.filter(u => u.noLogsFlag).length
  const withLogsCount = users.filter(u => u.hasLogs).length
  const retentionPct  = totalUsers ? Math.round((withLogsCount / totalUsers) * 100) : 0
  const trialActiveCount = users.filter(u => u.plan === 'Free' && u.days <= 90).length
  const mrrVal  = plusCount * PLUS_PRICE
  const arpuVal = totalUsers ? mrrVal / totalUsers : 0
  const paidPct = totalUsers ? Math.round((plusCount / totalUsers) * 100) : 0

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
                {(adminName || adminEmail || '?').trim().slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', margin: 0, color: T.text, lineHeight: 1 }}>
              Operations
            </h1>
            {flagItems.some(f => f.severity === 'HIGH') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: FONT.mono, fontSize: 9, color: '#C62828', letterSpacing: '0.08em',
                background: 'rgba(198,40,40,0.08)', padding: '4px 8px', borderRadius: 8,
                border: '1px solid rgba(198,40,40,0.15)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#C62828', display: 'inline-block' }} />
                {flagItems.filter(f => f.severity === 'HIGH').length} SAFETY FLAG{flagItems.filter(f => f.severity === 'HIGH').length !== 1 ? 'S' : ''}
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
            <StatCard label="TOTAL USERS" value={loading ? '—' : totalUsers} />
            <StatCard label="NEW 7D"      value={loading ? '—' : new7d} />
            <StatCard label="LOGGING"     value={loading ? '—' : retentionPct} unit="%" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.hair}` }}>
            <TabChip id="users" label="Users"  count={loading ? null : totalUsers} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
            <TabChip id="flags" label="Flags"  count={loading ? null : flagItems.length}  active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} />
            <TabChip id="queue" label="Queue"  count={openCount} active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
            <TabChip id="revenue" label="Revenue" active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} />
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────── */}
        <div style={{ flex: 1 }}>

          {/* Loading / setup-needed states apply to any data-driven tab */}
          {activeTab !== 'queue' && loading && (
            <div style={{ padding: '50px 20px', textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.10em' }}>
              LOADING…
            </div>
          )}
          {activeTab !== 'queue' && !loading && loadError && (
            <div style={{ padding: '20px' }}>
              <div style={{ background: T.surf2, borderRadius: 14, padding: '18px 16px', textAlign: 'left' }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                  Couldn't load user data
                </div>
                <div style={{ fontFamily: FONT.ui, fontSize: 12.5, color: T.mute, lineHeight: 1.5, marginBottom: 10 }}>
                  This usually means the one-time admin database policy hasn't been added yet. Run this in your Supabase SQL Editor (with your own email in place of the placeholder):
                </div>
                <pre style={{
                  background: T.ink, color: T.accent, padding: '10px 12px', borderRadius: 8,
                  fontFamily: FONT.mono, fontSize: 10, lineHeight: 1.5, overflowX: 'auto', margin: 0,
                }}>{ADMIN_SETUP_SQL}</pre>
              </div>
            </div>
          )}

          {/* Queue */}
          {activeTab === 'queue' && (
            <div>
              <div style={{ padding: '48px 28px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                  No support tickets yet
                </div>
                <div style={{ fontFamily: FONT.ui, fontSize: 12.5, color: T.mute, lineHeight: 1.5 }}>
                  This is where user-submitted feedback and support requests will appear once in-app reporting is added.
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && !loading && !loadError && (
            <div>
              {/* Summary row */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.hair}` }}>
                {[
                  { label: 'PLUS',     val: plusCount },
                  { label: 'FREE',     val: freeCount },
                  { label: 'NEW 7D',   val: new7d },
                  { label: 'INACTIVE', val: inactiveCount },
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
              {filteredUsers.map((item, i) => (
                <UserItem key={item.id} item={item} first={i === 0}
                  onOpen={() => setDetail({ kind: 'user', item })} />
              ))}
              {filteredUsers.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 14, color: T.mute }}>
                  {searchQuery ? `No users matching "${searchQuery}"` : 'No one has signed up yet — check back once your pilot testers create accounts.'}
                </div>
              )}
            </div>
          )}

          {/* Flags */}
          {activeTab === 'flags' && !loading && !loadError && (
            <div>
              {flagItems.length > 0 ? (
                <>
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
                        {flagItems.length} automated flag{flagItems.length !== 1 ? 's' : ''} — computed from real logs
                      </span>
                    </div>
                  </div>
                  {flagItems.map((item, i) => (
                    <FlagItem key={item.id} item={item} first={i === 0} />
                  ))}
                </>
              ) : (
                <div style={{ padding: '48px 28px', textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                    All clear
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 12.5, color: T.mute, lineHeight: 1.5 }}>
                    No one is currently flagged for rapid weight loss or a long gap without logging.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Revenue */}
          {activeTab === 'revenue' && !loading && !loadError && (
            <div style={{ padding: '14px 16px 0' }}>
              {/* Headline MRR */}
              <div style={{ background: T.ink, color: T.inkText, borderRadius: 16, padding: '18px 18px 16px', marginBottom: 10 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: 'rgba(250,250,247,0.5)', letterSpacing: '0.12em', marginBottom: 6 }}>MONTHLY RECURRING REVENUE (EST.)</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em' }}>${mrrVal.toFixed(2)}</span>
                </div>
              </div>
              {/* Metric grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <StatCard label="PLUS SUBSCRIBERS" value={plusCount} />
                <StatCard label="FREE USERS"       value={freeCount} />
                <StatCard label="ACTIVE TRIALS"    value={trialActiveCount} delta="3-month" />
                <StatCard label="ARPU"             value={`$${arpuVal.toFixed(2)}`} />
              </div>
              {/* Plus vs Free split bar */}
              {totalUsers > 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.hair}`, borderRadius: 14, padding: '14px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>PLUS VS FREE</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint }}>{paidPct}% PAID</span>
                  </div>
                  <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: T.surf2 }}>
                    <div style={{ width: `${paidPct}%`, background: T.accent }} />
                  </div>
                </div>
              )}
              <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: T.faint, lineHeight: 1.5, padding: '4px 4px 0' }}>
                Reflects each account's stored subscription flag, not a connected payment processor. Churn isn't tracked yet.
              </div>
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

      {/* ── Signed-in-as banner (fixed bottom) ───────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#111', borderTop: '1px solid #222',
        padding: '12px 20px 28px',
        maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 8, color: 'rgba(250,250,247,0.35)', letterSpacing: '0.14em', marginBottom: 3 }}>
          SIGNED IN AS
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 700, color: '#FAFAF7', letterSpacing: '-0.01em' }}>
          {adminName || 'Admin'}{adminEmail ? ` · ${adminEmail}` : ''}
        </div>
      </div>
    </div>
  )
}
