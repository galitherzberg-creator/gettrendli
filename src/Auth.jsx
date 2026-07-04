import { useState } from 'react'
import { T, FONT } from './tokens'
import { supabase } from './supabaseClient'

// Email + password sign-in / sign-up screen. Supabase persists the session, so
// once a user logs in they stay logged in (and their data follows them).
export default function Auth() {
  const [mode, setMode]   = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [pw, setPw]       = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null); setNotice(null)
    const mail = email.trim()
    if (!mail || pw.length < 6) { setError('Enter your email and a password of at least 6 characters.'); return }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password: pw })
        if (error) throw error
        // If email confirmation is on, there's no session yet.
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw })
        if (error) throw error
      }
      // On success with a session, App's auth listener swaps to the app.
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 430, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 38, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>GetTrendli</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 8 }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em' }}>EMAIL</label>
          <input
            type="email" inputMode="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
            style={inputStyle}
          />
          <label style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.12em', marginTop: 6 }}>PASSWORD</label>
          <input
            type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={pw}
            onChange={e => setPw(e.target.value)} placeholder="At least 6 characters"
            style={inputStyle}
          />

          {error && <div style={{ fontFamily: FONT.ui, fontSize: 12.5, color: '#C62828', lineHeight: 1.4 }}>{error}</div>}
          {notice && <div style={{ fontFamily: FONT.ui, fontSize: 12.5, color: T.accentDark, lineHeight: 1.4 }}>{notice}</div>}

          <button type="submit" disabled={busy} style={{
            marginTop: 8, padding: '14px 0', borderRadius: 12, border: 0,
            background: T.ink, color: T.inkText, cursor: busy ? 'default' : 'pointer',
            fontFamily: FONT.ui, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', opacity: busy ? 0.6 : 1,
          }}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); setNotice(null) }}
          style={{ marginTop: 20, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: FONT.ui, fontSize: 13, color: T.mute }}>
          {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
  border: `1px solid ${T.hair}`, outline: 'none', background: T.card,
  fontFamily: FONT.ui, fontSize: 15, color: T.text, letterSpacing: '-0.01em',
}
