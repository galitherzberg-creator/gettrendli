import { useState, useEffect, useRef } from 'react'
import { T, FONT, Eyebrow } from './tokens'
import { searchFoods, scaleMacros, usingDemoKey } from './nutritionApi'

const GRAM_PRESETS = [50, 100, 150, 200]

// ── Single search result row ───────────────────────────────────────────────────
function ResultRow({ food, first, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '13px 20px', background: 'transparent', cursor: 'pointer',
        border: 0, borderTop: first ? 0 : `1px solid ${T.hair}`,
      }}
    >
      <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 500, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 3 }}>
        {food.name.charAt(0) + food.name.slice(1).toLowerCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.accentDark, letterSpacing: '0.04em', fontWeight: 600 }}>
          {food.per100.kcal} KCAL
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.04em' }}>
          {food.per100.protein}G PROT · PER 100G
        </span>
        {food.brand && (
          <span style={{ fontFamily: FONT.mono, fontSize: 8, color: T.faint, letterSpacing: '0.04em', marginLeft: 'auto', textTransform: 'uppercase', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {food.brand}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Portion sheet (after picking a food) ────────────────────────────────────────
function PortionSheet({ food, onAdd, onBack }) {
  const [grams, setGrams] = useState('100')
  const g = parseFloat(grams) || 0
  const macros = scaleMacros(food.per100, g)

  return (
    <div>
      <button type="button" onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '16px 20px 10px',
        background: 'transparent', border: 0, cursor: 'pointer',
        fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.08em',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        BACK TO RESULTS
      </button>

      <div style={{ padding: '0 20px' }}>
        <h2 style={{ fontFamily: FONT.ui, fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 4px', color: T.text, lineHeight: 1.25 }}>
          {food.name.charAt(0) + food.name.slice(1).toLowerCase()}
        </h2>
        {food.brand && (
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{food.brand}</div>
        )}

        {/* Amount */}
        <div style={{ marginTop: 22 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Amount</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <input
              type="number"
              inputMode="decimal"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              autoFocus
              style={{
                background: 'transparent', border: 0, borderBottom: `1px solid ${T.hair}`,
                outline: 0, padding: '0 0 4px', width: 130,
                fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 48, fontWeight: 400,
                color: T.text, letterSpacing: '-0.02em', lineHeight: 1,
              }}
            />
            <span style={{ fontFamily: FONT.mono, fontSize: 12, color: T.mute, letterSpacing: '0.08em' }}>GRAMS</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {GRAM_PRESETS.map(p => {
              const on = String(p) === String(grams)
              return (
                <button key={p} type="button" onClick={() => setGrams(String(p))} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10,
                  border: `1px solid ${on ? T.ink : T.hair}`,
                  background: on ? T.ink : 'transparent', color: on ? T.inkText : T.mute,
                  fontFamily: FONT.mono, fontSize: 10, fontWeight: on ? 600 : 500,
                  letterSpacing: '0.04em', cursor: 'pointer',
                }}>{p}g</button>
              )
            })}
          </div>
        </div>

        {/* Computed macros */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'KCAL',    val: macros.kcal },
            { label: 'PROTEIN', val: `${macros.protein}g` },
            { label: 'FAT',     val: `${macros.fat}g` },
            { label: 'CARBS',   val: `${macros.carbs}g` },
            { label: 'FIBER',   val: `${macros.fiber}g` },
          ].map(m => (
            <div key={m.label} style={{ background: T.surf2, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.10em', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, color: T.text, lineHeight: 1 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Add */}
        <button
          type="button"
          disabled={g <= 0}
          onClick={() => onAdd({
            name: food.name.charAt(0) + food.name.slice(1).toLowerCase(),
            grams: g, ...macros,
          })}
          style={{
            width: '100%', marginTop: 24, padding: '15px 0', borderRadius: 100,
            background: g > 0 ? T.ink : T.hair, color: g > 0 ? T.inkText : T.faint,
            border: 0, fontFamily: FONT.ui, fontSize: 15, fontWeight: 600,
            letterSpacing: '-0.01em', cursor: g > 0 ? 'pointer' : 'default',
          }}
        >
          Add to log
        </button>
      </div>
    </div>
  )
}

// ── Main overlay ────────────────────────────────────────────────────────────────
export default function FoodSearch({ onAdd, onClose }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)
  const abortRef = useRef(null)

  // Debounced search as the user types.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearched(false); setError(null); return }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true); setError(null)
      try {
        const foods = await searchFoods(q, { signal: ctrl.signal })
        setResults(foods); setSearched(true)
      } catch (err) {
        if (err.name !== 'AbortError') { setError(err.message); setResults([]) }
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80, background: T.bg,
      maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 12px', background: T.card, borderBottom: `1px solid ${T.hair}`,
      }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>
          Add food
        </span>
        <button type="button" onClick={onClose} style={{
          background: 'transparent', border: 0, padding: '4px 0', cursor: 'pointer',
          fontFamily: FONT.ui, fontSize: 14, color: T.mute, letterSpacing: '-0.01em',
        }}>Done</button>
      </header>

      {selected ? (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 32 }}>
          <PortionSheet food={selected} onBack={() => setSelected(null)}
            onAdd={f => { onAdd(f); setSelected(null) }} />
        </div>
      ) : (
        <>
          {/* Search input */}
          <div style={{ padding: '14px 20px 10px', position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={T.faint} strokeWidth="1.5" strokeLinecap="round"
              style={{ position: 'absolute', left: 33, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3"/>
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search foods — e.g. chicken breast, banana…"
              style={{
                width: '100%', padding: '12px 14px 12px 38px', borderRadius: 12, boxSizing: 'border-box',
                border: `1.5px solid ${T.accent}`, outline: 0, background: T.card,
                fontFamily: FONT.ui, fontSize: 14, color: T.text, letterSpacing: '-0.01em',
              }}
            />
          </div>

          {/* Results / states */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '30px 20px', textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: T.mute, letterSpacing: '0.10em' }}>
                SEARCHING…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: '30px 20px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 13, color: '#C62828' }}>
                {error}
              </div>
            )}
            {!loading && !error && searched && results.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 14, color: T.mute }}>
                No foods matching “{query}”
              </div>
            )}
            {!loading && !error && results.map((f, i) => (
              <ResultRow key={f.id} food={f} first={i === 0} onSelect={() => setSelected(f)} />
            ))}
            {!searched && !loading && !error && (
              <div style={{ padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, lineHeight: 1.5 }}>
                  Type a food to look up its calories and macros from the USDA nutrition database.
                </div>
                {usingDemoKey && (
                  <div style={{ marginTop: 16, fontFamily: FONT.mono, fontSize: 8.5, color: T.faint, letterSpacing: '0.06em', lineHeight: 1.6 }}>
                    USING SHARED DEMO KEY · LIMITED SEARCHES PER HOUR
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
