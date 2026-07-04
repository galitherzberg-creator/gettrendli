import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Dashboard from './Dashboard'
import LogToday from './LogToday'
import Insights from './Insights'
import Settings from './Settings'
import Measurements from './Measurements'
import Onboarding from './Onboarding'
import Admin from './Admin'
import Auth from './Auth'
import { getEntitlements } from './entitlements'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { loadCloud, saveCloud } from './cloudStore'

const Charts = lazy(() => import('./Charts'))

function load(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val !== null ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

const defaultSettings = {
  name: '',
  email: '',
  startWeight: 0,
  goalWeight: 0,
  height: 165,
  injectionInterval: 7,
  lastInjectionDate: null,
  startDate: null,
  goalType: 'lose',        // 'lose' | 'gain'
  proteinGoal: null,       // optional grams/day
  fiberGoal: null,         // optional grams/day (GLP-1 constipation management)
  unitSystem: 'metric',    // 'metric' | 'us'
  medication: 'semaglutide',
  dose: 1.0,               // mg
  injectionDay: 'Friday',
  reminderEnabled: true,
  autoTitrationAlert: false,
  pace: 0.5,               // kg / wk (stored metric)
  dailyWaterGoal: 8,       // cups
}

// Simple centered loading splash (cloud auth/data fetch).
function Splash() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7' }}>
      <div style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 34, color: '#8A8A8A' }}>GetTrendli</div>
    </div>
  )
}

export default function App() {
  const cloud = isSupabaseConfigured

  const [screen, setScreen]               = useState('dashboard')
  const [logs, setLogs]                   = useState(() => load('gt_logs', {}))
  const [userSettings, setUserSettings]   = useState(() => load('gt_settings', defaultSettings))
  const [theme, setTheme]                 = useState(() => load('gt_theme', 'light'))
  const [measurements, setMeasurements]   = useState(() => load('gt_measurements', []))

  // Local-only onboarding flag (cloud mode derives onboarding from settings.name)
  const [onboardedLocal, setOnboardedLocal] = useState(() => !!(load('gt_settings', null)?.name))

  // ── Auth / cloud state (only meaningful when Supabase is configured) ──
  const [session, setSession]         = useState(null)
  const [authChecked, setAuthChecked] = useState(!cloud)  // local mode: nothing to check
  const [cloudLoaded, setCloudLoaded] = useState(!cloud)  // local mode: data already "loaded"

  // Track the current auth session + react to login/logout.
  useEffect(() => {
    if (!cloud) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // Ignore no-op session updates for the same user (e.g. a background token
      // refresh) — returning the identical object skips the re-render, so the
      // "load cloud data" effect below (keyed on `session`) won't re-fire and
      // flash the loading splash. Only a real login/logout/user change should
      // trigger a reload.
      setSession(prev => (prev && s && prev.user.id === s.user.id) ? prev : s)
      if (!s) setCloudLoaded(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [cloud])

  // Load this user's data from the cloud when they log in.
  useEffect(() => {
    if (!cloud || !session) return
    let cancelled = false
    setCloudLoaded(false)
    loadCloud(session.user.id)
      .then(row => {
        if (cancelled) return
        if (row) {
          setUserSettings({ ...defaultSettings, ...(row.settings || {}) })
          setLogs(row.logs || {})
          setMeasurements(row.measurements || [])
        } else {
          setUserSettings({ ...defaultSettings, email: session.user.email || '' })
          setLogs({})
          setMeasurements([])
        }
        setCloudLoaded(true)
      })
      .catch(() => { if (!cancelled) setCloudLoaded(true) })  // fail open — don't lock the user out
    return () => { cancelled = true }
  }, [cloud, session])

  // Persist — localStorage in local mode, debounced cloud upsert in cloud mode.
  const saveTimer = useRef(null)
  useEffect(() => { if (!cloud) localStorage.setItem('gt_logs',         JSON.stringify(logs)) },         [logs, cloud])
  useEffect(() => { if (!cloud) localStorage.setItem('gt_settings',     JSON.stringify(userSettings)) }, [userSettings, cloud])
  useEffect(() => { if (!cloud) localStorage.setItem('gt_measurements', JSON.stringify(measurements)) }, [measurements, cloud])
  useEffect(() => {
    if (!cloud || !session || !cloudLoaded) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCloud(session.user.id, { settings: userSettings, logs, measurements }).catch(() => {})
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [cloud, session, cloudLoaded, userSettings, logs, measurements])

  // Theme is a UI preference — always local.
  useEffect(() => {
    localStorage.setItem('gt_theme', JSON.stringify(theme))
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Backfill a trial start date for accounts that predate the trial system.
  useEffect(() => {
    if (userSettings?.name && !userSettings.createdAt) {
      setUserSettings(prev => ({ ...prev, createdAt: new Date().toISOString() }))
    }
  }, [userSettings?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const entitlements = getEntitlements(userSettings)

  function handleUpgrade() {
    setUserSettings(prev => ({ ...prev, subscriptionActive: true, subscribedAt: new Date().toISOString() }))
  }

  function updateLog(date, values) {
    setLogs(prev => ({ ...prev, [date]: values }))
  }

  function handleOnboardingComplete(settings) {
    setUserSettings(prev => ({ ...settings, email: settings.email || prev.email }))
    setOnboardedLocal(true)
  }

  async function handleSignOut() {
    if (cloud) { try { await supabase.auth.signOut() } catch {} }
    try {
      localStorage.removeItem('gt_logs'); localStorage.removeItem('gt_settings'); localStorage.removeItem('gt_measurements')
    } catch {}
    if (!cloud) window.location.reload()
  }

  // ── Gates (cloud mode) ──
  if (cloud && !authChecked) return <Splash />
  if (cloud && !session)     return <Auth />
  if (cloud && !cloudLoaded) return <Splash />

  const onboarded = cloud ? !!userSettings?.name : onboardedLocal
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />

  // Map tab bar IDs + legacy screen names to internal screen keys
  function handleNav(tab) {
    const map = {
      home:         'dashboard',
      log:          'log',
      insights:     'insights',
      charts:       'charts',
      profile:      'settings',
      settings:     'settings',
      dashboard:    'dashboard',
      measurements: 'measurements',
      admin:        'admin',
    }
    setScreen(map[tab] ?? tab)
  }

  const gate = { entitlements, onUpgrade: handleUpgrade }

  const screenEl = (() => {
    if (screen === 'log')          return <LogToday logs={logs} updateLog={updateLog} userSettings={userSettings} onNavigate={handleNav} {...gate} />
    if (screen === 'insights')     return <Insights logs={logs} userSettings={userSettings} onNavigate={handleNav} {...gate} />
    if (screen === 'charts')       return <Suspense fallback={null}><Charts onNavigate={handleNav} logs={logs} userSettings={userSettings} {...gate} /></Suspense>
    if (screen === 'settings')     return <Settings userSettings={userSettings} onSaveSettings={setUserSettings} logs={logs} onNavigate={handleNav} onSignOut={handleSignOut} {...gate} />
    if (screen === 'measurements') return <Measurements measurements={measurements} onUpdateMeasurements={setMeasurements} userSettings={userSettings} logs={logs} onNavigate={handleNav} {...gate} />
    if (screen === 'admin')        return <Admin onNavigate={handleNav} />
    return <Dashboard logs={logs} userSettings={userSettings} onNavigate={handleNav} updateLog={updateLog} {...gate} />
  })()

  return <div key={screen} className="screen-transition">{screenEl}</div>
}
