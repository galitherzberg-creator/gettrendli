import { useState } from 'react'
import styles from './TipBanner.module.css'

function loadSeen() {
  try { return JSON.parse(localStorage.getItem('gt_tips_seen')) ?? {} } catch { return {} }
}

export function useTip(screen) {
  const [visible, setVisible] = useState(() => !loadSeen()[screen])
  function dismiss() {
    localStorage.setItem('gt_tips_seen', JSON.stringify({ ...loadSeen(), [screen]: true }))
    setVisible(false)
  }
  return { visible, dismiss }
}

export default function TipBanner({ text, onDismiss }) {
  return (
    <div className={styles.tip}>
      <svg className={styles.tipIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7 6.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="7" cy="4.5" r=".65" fill="currentColor"/>
      </svg>
      <p className={styles.tipText}>{text}</p>
      <button className={styles.tipClose} onClick={onDismiss} aria-label="Dismiss tip" type="button">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
