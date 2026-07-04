// ── Subscription / free-trial entitlements ─────────────────────────────────────
// Model: every user gets a 3-month free trial of ALL features, starting the
// moment their account is created (settings.createdAt). After the trial they
// need an active subscription (settings.subscriptionActive) to keep premium
// features. Core + safety-critical features stay free forever.

import { T, FONT, TabBar } from './tokens'

export const TRIAL_DAYS = 90
export const PLAN_NAME   = 'GetTrendli Plus'
export const PLAN_PRICE  = '$9.99/mo'

// ── USER-TEST SWITCH ────────────────────────────────────────────────────────
// While true: every feature is unlocked and the trial/upgrade banner is hidden,
// so test users get full, unfettered access for the whole pilot — no paywall,
// no nagging. Flip to false when you go live to turn the real trial + paywall
// back on. (The 90-day trial logic is unchanged underneath.)
export const TEST_MODE = true

// Premium features included with GetTrendli Plus (shown on the paywall).
export const PREMIUM_PERKS = [
  'Body Measurements & 3-D Body Scan',
  'Cup size & side-by-side progress',
  'Insights, trends & non-scale victories',
  'Full chart history — every range',
]

/**
 * Derive subscription state from user settings.
 * @returns {{ subscribed:boolean, trialActive:boolean, trialEnded:boolean,
 *             daysLeft:number, hasPremium:boolean, trialEndsAt:Date|null }}
 */
export function getEntitlements(settings) {
  // Pilot/user-test: unlock everything, suppress the banner.
  if (TEST_MODE) {
    return { subscribed: false, trialActive: true, trialEnded: false, daysLeft: TRIAL_DAYS, hasPremium: true, trialEndsAt: null, testMode: true }
  }

  const created    = settings?.createdAt
  const subscribed = !!settings?.subscriptionActive

  let trialEndsAt = null
  let daysLeft    = 0
  let trialActive = false

  if (created) {
    trialEndsAt = new Date(new Date(created).getTime() + TRIAL_DAYS * 86400000)
    const msLeft = trialEndsAt.getTime() - Date.now()
    daysLeft     = Math.max(0, Math.ceil(msLeft / 86400000))
    trialActive  = msLeft > 0
  }

  const hasPremium = subscribed || trialActive
  return {
    subscribed,
    trialActive,
    trialEnded: !!created && !trialActive && !subscribed,
    daysLeft,
    hasPremium,
    trialEndsAt,
  }
}

const lockIcon = (size = 14, color = T.accentDark) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

const sparkIcon = (size = 13, color = T.accentDark) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
  </svg>
)

/**
 * Thin status bar shown on free screens while a user is in (or past) trial.
 * Hidden entirely for active subscribers.
 */
export function TrialBanner({ entitlements, onUpgrade }) {
  const { subscribed, trialActive, trialEnded, daysLeft, testMode } = entitlements
  if (testMode) return null   // hidden during the user test
  if (subscribed) return null
  if (!trialActive && !trialEnded) return null

  const ended = trialEnded
  return (
    <button
      type="button"
      onClick={onUpgrade}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        margin: 0, padding: '9px 16px', border: 0, cursor: 'pointer',
        background: ended ? T.ink : T.accentSoft,
        color: ended ? T.inkText : T.accentDark,
        fontFamily: FONT.ui, fontSize: 12.5, fontWeight: 600,
        letterSpacing: '-0.01em', textAlign: 'left',
      }}
    >
      {ended ? lockIcon(13, T.inkText) : sparkIcon(13, T.accentDark)}
      <span style={{ flex: 1 }}>
        {ended
          ? 'Your free trial has ended'
          : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`}
      </span>
      <span style={{
        fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.08em',
        fontWeight: 700, textTransform: 'uppercase', opacity: 0.95,
      }}>
        {ended ? 'Subscribe' : 'Upgrade'}
      </span>
    </button>
  )
}

/**
 * Full-screen paywall shown in place of a premium screen once the trial has
 * ended and the user has not subscribed. Keeps the tab bar so the user can
 * still navigate the free parts of the app.
 */
export function Paywall({ feature, entitlements, onUpgrade, onNavigate, active = 'home' }) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: T.bg, fontFamily: FONT.ui }}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 120px' }}>

        {/* Header */}
        <div style={{ padding: '28px 22px 8px' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', color: T.mute, textTransform: 'uppercase' }}>
            {PLAN_NAME}
          </div>
          <h1 style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', margin: '6px 0 0', color: T.text }}>
            {feature}
          </h1>
        </div>

        {/* Lock card */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            background: T.card, border: `1px solid ${T.hair}`, borderRadius: 18,
            padding: '24px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.accentSoft,
            }}>
              {lockIcon(24, T.accentDark)}
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>
              {entitlements.trialEnded ? 'Your free trial has ended' : 'A GetTrendli Plus feature'}
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 13.5, color: T.mute, lineHeight: 1.5, margin: '8px auto 0', maxWidth: 300 }}>
              Subscribe to {PLAN_NAME} to unlock {feature.toLowerCase()} and everything below.
            </div>

            {/* Perks */}
            <div style={{ textAlign: 'left', margin: '20px auto 0', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {PREMIUM_PERKS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flexShrink: 0, color: T.accentDark }}>{sparkIcon(13, T.accentDark)}</span>
                  <span style={{ fontFamily: FONT.ui, fontSize: 13.5, color: T.text, letterSpacing: '-0.01em' }}>{p}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={onUpgrade}
              style={{
                width: '100%', marginTop: 22, padding: '14px 16px', border: 0,
                borderRadius: 12, background: T.ink, color: T.inkText, cursor: 'pointer',
                fontFamily: FONT.ui, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              }}
            >
              Subscribe · {PLAN_PRICE}
            </button>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.faint, letterSpacing: '0.06em', marginTop: 10 }}>
              CANCEL ANYTIME
            </div>
          </div>
        </div>
      </div>

      <TabBar active={active} onTab={onNavigate} />
    </div>
  )
}
