// Shared design tokens and primitive components — mirrors the Claude Design file.
// All screens import from here so type/colors/layout stay coherent.

export const T = {
  bg:         '#FAFAF7',
  card:       '#FFFFFF',
  ink:        '#0A0A0A',
  text:       '#1A1A1A',
  mute:       '#8A8A8A',
  faint:      '#BFBFBF',
  hair:       '#ECECEC',
  hair2:      '#E5E5E1',
  inkText:    '#FAFAF7',
  accent:     '#3FCAA5',
  accentDark: '#2BA384',
  accentSoft: 'rgba(63, 202, 165, 0.18)',
  accentHair: 'rgba(63, 202, 165, 0.38)',
  surf2:      '#F3F2EE',
};

export const FONT = {
  ui:    '"Inter Tight", -apple-system, system-ui, sans-serif',
  serif: '"Instrument Serif", "Times New Roman", serif',
  mono:  '"JetBrains Mono", ui-monospace, monospace',
};

// ── Primitives ──────────────────────────────────────────────────────────────

/** Tracked-caps mono section label */
export function Eyebrow({ children, color, style = {} }) {
  return (
    <div style={{
      fontFamily: FONT.mono,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: color || T.mute,
      ...style,
    }}>
      {children}
    </div>
  );
}

/** 1px hairline divider */
export function Hairline({ color, style = {} }) {
  return <div style={{ height: 1, background: color || T.hair, ...style }} />;
}

/** Generic card surface */
export function Card({ inverted, padding = 20, radius = 14, style = {}, children }) {
  return (
    <div style={{
      background:   inverted ? T.ink   : T.card,
      color:        inverted ? T.inkText : T.text,
      border:       inverted ? '1px solid #1A1A1A' : `1px solid ${T.hair}`,
      borderRadius: radius,
      padding,
      ...style,
    }}>
      {children}
    </div>
  );
}

/** Big display number — Instrument Serif italic */
export function BigNumber({ value, unit, size = 64, color, italic = true, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color, ...style }}>
      <span style={{
        fontFamily: FONT.serif,
        fontWeight: 400,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      {unit && (
        <span style={{
          fontFamily: FONT.mono,
          fontSize: Math.max(11, size * 0.18),
          color: 'inherit',
          opacity: 0.6,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {unit}
        </span>
      )}
    </div>
  );
}

/** Bottom tab bar — 5 tabs, seafoam active */
export function TabBar({ active = 'home', onTab }) {
  const items = [
    { id: 'home',         label: 'Home',    d: 'M3 11l9-8 9 8M5 9.5V20h14V9.5' },
    { id: 'log',          label: 'Log',     d: 'M12 5v14M5 12h14' },
    { id: 'insights',     label: 'Insights',d: 'M4 19h16M7 16V9M12 16V5M17 16v-4' },
    { id: 'measurements', label: 'Body',    d: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 9a5 5 0 0 1 10 0v2H7v-2zm-1 4h12v2H6v-2z' },
    { id: 'profile',      label: 'You',     d: 'M5 21c0-4 3-7 7-7s7 3 7 7M12 12a4 4 0 100-8 4 4 0 000 8z' },
  ];

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 24, paddingTop: 10,
      background: T.card,
      borderTop: `1px solid ${T.hair}`,
      display: 'flex', justifyContent: 'space-around', zIndex: 40,
    }}>
      {items.map((it) => {
        const on = it.id === active;
        // Use different chart icon for charts tab
        const d = it.d;
        return (
          <button key={it.id} onClick={() => onTab && onTab(it.id)} style={{
            background: 'none', border: 0, padding: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, width: 56, fontFamily: FONT.ui,
            color: on ? T.accent : T.faint,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={on ? 2 : 1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d={d} />
            </svg>
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, letterSpacing: '-0.01em' }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact status-bar mock */
export function StatusBar({ dark = false }) {
  const c = dark ? T.inkText : T.ink;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 44,
      fontFamily: FONT.ui, color: c, fontSize: 15, fontWeight: 600,
      letterSpacing: '-0.02em',
    }}>
      <span>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* signal bars */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill={c}>
          <rect x="0" y="7" width="3" height="4" rx="0.5"/>
          <rect x="4.5" y="5" width="3" height="6" rx="0.5"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.5"/>
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} strokeOpacity="0.4"/>
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={c}/>
          <path d="M24 4v4c.7-.2 1.2-.9 1.2-2s-.5-1.8-1.2-2z" fill={c} fillOpacity="0.4"/>
        </svg>
      </span>
    </div>
  );
}

/** Dynamic island notch */
export function DynamicIsland() {
  return (
    <div style={{
      position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
      width: 124, height: 36, borderRadius: 22, background: '#000', zIndex: 50,
      pointerEvents: 'none',
    }} />
  );
}

/** Avatar initials circle */
export function Avatar({ initials = 'U', size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: T.ink, color: T.inkText,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT.ui, fontWeight: 600, fontSize: size * 0.36,
      letterSpacing: '-0.02em', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/** Toggle switch */
export function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange && onChange(!on)}
      style={{
        width: 40, height: 24, borderRadius: 12, padding: 0, border: 0,
        background: on ? T.accent : T.hair, position: 'relative',
        cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 20, height: 20, borderRadius: 10, background: T.card,
        transition: 'left 0.15s',
      }} />
    </button>
  );
}
