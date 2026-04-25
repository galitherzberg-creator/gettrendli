import { useState, useEffect, lazy, Suspense } from 'react'
import Dashboard from './Dashboard'
import LogToday from './LogToday'
import Insights from './Insights'
import Settings from './Settings'

const Charts = lazy(() => import('./Charts'))
import { initialLogs } from './logStore'
import { mockUser } from './mockData'

function load(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val !== null ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

const defaultSettings = {
  name: mockUser.name,
  startWeight: mockUser.startWeight,
  goalWeight: mockUser.goalWeight,
  height: 165,
}

export default function App() {
  const [screen, setScreen]           = useState('dashboard')
  const [logs, setLogs]               = useState(() => load('gt_logs', initialLogs))
  const [userSettings, setUserSettings] = useState(() => load('gt_settings', defaultSettings))
  const [theme, setTheme]             = useState(() => load('gt_theme', 'light'))

  useEffect(() => { localStorage.setItem('gt_logs',     JSON.stringify(logs))         }, [logs])
  useEffect(() => { localStorage.setItem('gt_settings', JSON.stringify(userSettings)) }, [userSettings])
  useEffect(() => {
    localStorage.setItem('gt_theme', JSON.stringify(theme))
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function updateLog(date, values) {
    setLogs(prev => ({ ...prev, [date]: values }))
  }

  if (screen === 'log')      return <LogToday logs={logs} updateLog={updateLog} onNavigate={setScreen} />
  if (screen === 'insights') return <Insights onNavigate={setScreen} />
  if (screen === 'charts')   return <Suspense fallback={null}><Charts theme={theme} onNavigate={setScreen} /></Suspense>
  if (screen === 'settings') return <Settings userSettings={userSettings} onSaveSettings={setUserSettings} theme={theme} onThemeChange={setTheme} onNavigate={setScreen} />
  return <Dashboard logs={logs} userSettings={userSettings} onNavigate={setScreen} />
}
