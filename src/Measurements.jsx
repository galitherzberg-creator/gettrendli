import { useState, lazy, Suspense, Component } from 'react'
import { todayISO, formatDate } from './logStore'
import styles from './Measurements.module.css'
import { T, FONT, Eyebrow, TabBar } from './tokens'
import { Paywall } from './entitlements'

// 3-D body model is heavy (three.js) — load it only when the 3D view is opened.
const BodyModel3D = lazy(() => import('./BodyModel3D'))
// Static-image snapshot of the 3-D body (for the small comparison thumbnails,
// so they match the main view's style without keeping live WebGL canvases).
const BodyThumbnail = lazy(() => import('./BodyModel3D').then(m => ({ default: m.BodyThumbnail })))

function Scan3DMessage({ text }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT.mono, fontSize: 9, color: 'rgba(63,202,165,0.55)', letterSpacing: '0.12em' }}>
      {text}
    </div>
  )
}

// Keeps a WebGL / 3-D failure from taking down the whole Measurements screen.
class Canvas3DBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() {}
  render() {
    if (this.state.failed) return <Scan3DMessage text="3-D VIEW UNAVAILABLE" />
    return this.props.children
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'waist',  label: 'Waist',  placeholder: '80'  },
  { key: 'hips',   label: 'Hips',   placeholder: '95'  },
  { key: 'thighs', label: 'Thighs', placeholder: '58'  },
  { key: 'chest',  label: 'Chest',  placeholder: '90'  },
  { key: 'neck',   label: 'Neck',   placeholder: '35'  },
  { key: 'arm',    label: 'Arm',    placeholder: '30'  },
]

// Bra cup sizes (categorical, not a cm measurement) — shown right after Chest.
const CUP_SIZES = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H']

// Breast-projection multiplier per cup size (C ≈ 1.0 baseline). Used to scale the
// bust in the simulator so picking a cup visibly changes the figure. Unset → 1.
const CUP_FACTOR = { AA:0.45, A:0.65, B:0.82, C:1, D:1.2, DD:1.4, E:1.55, F:1.7, G:1.85, H:2 }
function cupScale(cup) { return CUP_FACTOR[cup] ?? 1 }

const BODY_TYPES = [
  { id: 'hourglass', label: 'Hourglass' },
  { id: 'pear',      label: 'Pear'      },
  { id: 'apple',     label: 'Apple'     },
  { id: 'rectangle', label: 'Rectangle' },
]

// Half-widths in 200×500 viewBox (cx = 100).
// Keys: sW=shoulder, cW=chest, wW=waist, hW=hip, tW=thigh
const BODY_PROPS = {
  female: {
    hourglass:  { sW: 37, cW: 33, wW: 20, hW: 38, tW: 22 },
    pear:       { sW: 26, cW: 26, wW: 22, hW: 43, tW: 26 },
    apple:      { sW: 31, cW: 30, wW: 34, hW: 30, tW: 19 },
    rectangle:  { sW: 30, cW: 28, wW: 26, hW: 29, tW: 18 },
  },
  male: {
    hourglass:  { sW: 43, cW: 38, wW: 27, hW: 35, tW: 22 },
    pear:       { sW: 29, cW: 29, wW: 26, hW: 40, tW: 24 },
    apple:      { sW: 35, cW: 33, wW: 37, hW: 32, tW: 20 },
    rectangle:  { sW: 38, cW: 34, wW: 30, hW: 33, tW: 21 },
  },
}

const SCAN_BG = '#061410'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fieldDelta(current, reference) {
  const c = parseFloat(current)
  const r = parseFloat(reference)
  if (isNaN(c) || isNaN(r)) return null
  return (c - r).toFixed(1)
}

function emptyFields() {
  return { waist: '', hips: '', thighs: '', chest: '', cup: '', neck: '', arm: '' }
}

function historySnippet(entry) {
  const parts = FIELDS.filter(f => entry[f.key]).map(f => `${f.label} ${entry[f.key]}`)
  if (entry.cup) parts.push(`Cup ${entry.cup}`)
  return parts.join(' · ')
}

// ── Parametric front path ─────────────────────────────────────────────────────
// 200×500 viewBox, cx=100.
// Control points use % of segment span so curves scale correctly with body type.
// At each width-extreme (shoulder, waist, hip) the tangent is nearly horizontal,
// giving organic "melting" transitions rather than geometric S-bends.
function buildFrontPath(p) {
  const cx = 100
  const { sW, cW, wW, hW, tW } = p
  const nW = 9, kW = 12, aW = 6.5, gW = 3.5

  // Y landmarks
  const nt = 65, sh = 90, ch = 142, wa = 200, hi = 240
  const cr = 268, th = 318, kn = 390, an = 462

  const R = w => +(cx + w).toFixed(1)
  const L = w => +(cx - w).toFixed(1)
  const f = n => +n.toFixed(1)

  // Segment heights
  const H_ns = sh - nt          // 25  neck → shoulder
  const H_sc = ch - sh          // 52  shoulder → chest
  const H_cw = wa - ch          // 58  chest → waist
  const H_wh = hi - wa          // 40  waist → hip
  const H_ht = th - hi          // 78  hip → outer thigh
  const H_tk = kn - th          // 72  thigh → knee
  const H_ka = an - kn          // 72  knee → ankle

  // ---------- right side, top → bottom ----------
  return [
    `M ${R(nW)},${nt}`,

    // Neck → Shoulder: gentle outward sweep, no spike
    // P1 steers the curve laterally; P2 arrives at shoulder with slight downward angle
    `C ${f(cx + nW + (sW - nW) * 0.35)},${f(nt + H_ns * 0.55)}` +
    ` ${R(sW * 0.97)},${f(sh - H_ns * 0.12)}` +
    ` ${R(sW)},${sh}`,

    // Shoulder → Chest: 42% tension → nice round inward taper
    `C ${R(sW)},${f(sh + H_sc * 0.42)}` +
    ` ${R(cW)},${f(ch - H_sc * 0.42)}` +
    ` ${R(cW)},${ch}`,

    // Chest → Waist: 44% tension
    `C ${R(cW)},${f(ch + H_cw * 0.44)}` +
    ` ${R(wW)},${f(wa - H_cw * 0.44)}` +
    ` ${R(wW)},${wa}`,

    // Waist → Hip: 50% tension — very round flare
    `C ${R(wW)},${f(wa + H_wh * 0.50)}` +
    ` ${R(hW)},${f(hi - H_wh * 0.50)}` +
    ` ${R(hW)},${hi}`,

    // Hip → Outer Thigh: 32% tension
    `C ${R(hW)},${f(hi + H_ht * 0.32)}` +
    ` ${R(tW)},${f(th - H_ht * 0.32)}` +
    ` ${R(tW)},${th}`,

    // Outer Thigh → Knee: 38% tension
    `C ${R(tW)},${f(th + H_tk * 0.38)}` +
    ` ${R(kW)},${f(kn - H_tk * 0.38)}` +
    ` ${R(kW)},${kn}`,

    // Knee → Outer Ankle: 26% tension (leg tapers gently)
    `C ${R(kW)},${f(kn + H_ka * 0.26)}` +
    ` ${R(aW)},${f(an - H_ka * 0.26)}` +
    ` ${R(aW)},${an}`,

    // ---------- inner right leg, bottom → crotch ----------
    `L ${R(3.5)},${an}`,

    `C ${R(3.5)},${f(an - H_ka * 0.26)}` +
    ` ${R(6)},${f(kn + H_ka * 0.26)}` +
    ` ${R(6)},${kn}`,

    `C ${R(6)},${f(kn - H_tk * 0.36)}` +
    ` ${R(9)},${f(th + H_tk * 0.36)}` +
    ` ${R(9)},${th}`,

    `C ${R(9)},${f(th - (th - cr) * 0.34)}` +
    ` ${R(gW + 1)},${f(cr + (th - cr) * 0.18)}` +
    ` ${R(gW)},${cr}`,

    // Crotch bridge — slightly deeper curve for organic look
    `Q ${cx},${cr + 10} ${L(gW)},${cr}`,

    // ---------- inner left leg, crotch → bottom ----------
    `C ${L(gW + 1)},${f(cr + (th - cr) * 0.18)}` +
    ` ${L(9)},${f(th - (th - cr) * 0.34)}` +
    ` ${L(9)},${th}`,

    `C ${L(9)},${f(th + H_tk * 0.36)}` +
    ` ${L(6)},${f(kn - H_tk * 0.36)}` +
    ` ${L(6)},${kn}`,

    `C ${L(6)},${f(kn + H_ka * 0.26)}` +
    ` ${L(3.5)},${f(an - H_ka * 0.26)}` +
    ` ${L(3.5)},${an}`,

    // ---------- left outer leg, bottom → top ----------
    `L ${L(aW)},${an}`,

    `C ${L(aW)},${f(an - H_ka * 0.26)}` +
    ` ${L(kW)},${f(kn + H_ka * 0.26)}` +
    ` ${L(kW)},${kn}`,

    `C ${L(kW)},${f(kn - H_tk * 0.38)}` +
    ` ${L(tW)},${f(th + H_tk * 0.38)}` +
    ` ${L(tW)},${th}`,

    `C ${L(tW)},${f(th - H_ht * 0.32)}` +
    ` ${L(hW)},${f(hi + H_ht * 0.32)}` +
    ` ${L(hW)},${hi}`,

    `C ${L(hW)},${f(hi - H_wh * 0.50)}` +
    ` ${L(wW)},${f(wa + H_wh * 0.50)}` +
    ` ${L(wW)},${wa}`,

    `C ${L(wW)},${f(wa - H_cw * 0.44)}` +
    ` ${L(cW)},${f(ch + H_cw * 0.44)}` +
    ` ${L(cW)},${ch}`,

    `C ${L(cW)},${f(ch - H_sc * 0.42)}` +
    ` ${L(sW)},${f(sh + H_sc * 0.42)}` +
    ` ${L(sW)},${sh}`,

    // Shoulder → Neck (mirror of entry)
    `C ${L(sW * 0.97)},${f(sh - H_ns * 0.12)}` +
    ` ${f(cx - nW - (sW - nW) * 0.35)},${f(nt + H_ns * 0.55)}` +
    ` ${L(nW)},${nt}`,

    'Z',
  ].join(' ')
}

// ── Parametric arm path ───────────────────────────────────────────────────────
// Corrected proportions: elbow at waist level, fingertip at mid-thigh.
// Three bezier segments: outer edge, rounded hand bottom, inner edge.
// side: 'right' | 'left'  (s = ±1 mirrors all X)
function buildArmPath(props, side) {
  const { sW } = props
  const cx  = 100
  const s   = side === 'right' ? 1 : -1
  const hw  = Math.max(4, sW * 0.15)    // arm half-width at shoulder
  const hwB = Math.max(2.6, hw * 0.46)  // arm half-width at hand (tapers in)
  const gap = -1.5                        // slight overlap so the arm joins the torso (no floating gap)

  // Anatomically correct Y positions in a 500-unit-tall body:
  // Shoulder y=90, elbow just above waist y=192, fingertip at mid-thigh y=308
  const shY = 90, elY = 192, fiY = 308

  const base = sW + gap
  const xi = dx => +(cx + s * (base + dx)).toFixed(1)
  const f  = n  => +n.toFixed(1)
  const H  = elY - shY    // upper-arm span

  const iSh = xi(0)           // inner shoulder
  const oSh = xi(hw * 2)      // outer shoulder
  const iEl = xi(hw * 0.22)   // inner elbow (slight taper)
  const oEl = xi(hw * 2.08)   // outer elbow (gentle bow)
  const iBt = xi(hw - hwB)    // inner hand edge
  const oBt = xi(hw + hwB)    // outer hand edge
  const cBt = xi(hw)          // hand centre (Q anchor)

  return [
    `M ${iSh},${shY}`,
    `L ${oSh},${shY}`,
    // Outer edge: gentle outward bow at elbow, tapers to hand
    `C ${oEl},${f(shY + H * 0.36)} ${oEl},${f(elY + (fiY - elY) * 0.32)} ${oBt},${fiY}`,
    // Rounded hand (shallow arc)
    `Q ${cBt},${fiY + 6} ${iBt},${fiY}`,
    // Inner edge: hand → elbow → shoulder
    `C ${iEl},${f(elY + (fiY - elY) * 0.32)} ${iEl},${f(shY + H * 0.44)} ${iSh},${shY}`,
    'Z',
  ].join(' ')
}

// ── Profile path (ground-up rewrite) ─────────────────────────────────────────
// ViewBox 0 0 200 500. Figure faces RIGHT: front = higher x, back = lower x.
// Spine reference sp=88. Body has ~50-60 px front-to-back depth at chest.
// Key anatomical features:
//   • Lumbar lordosis: wabX barely behind spine; butX far behind → S-curve back
//   • Separate chest / belly / waist x-values → front S-curve
//   • Calf muscle protrusion, rounded heel, full foot
//   • Female: breast droops to belly, wider hip/glute flare
//   • Male:   chest-to-waist more direct, narrower glute, broader back
// Per-sex × bodyType offsets from the spine (px), shared by the profile path
// builder and the breast-cup helper.
// shf=shoulder forward  ch=chest/breast forward  bl=belly forward
// waf=waist front       buOf=buttock backward     wab=waist back (tiny → lordosis)
// Rule: chest protrudes ~sp+ch, buttock ~sp-buOf. wab stays tiny (lordosis).
const PROFILE_CFG = {
  female: {
    hourglass: { shf:16, ch:30, bl:18, waf:12, buOf:24, wab:6 },
    pear:      { shf:14, ch:24, bl:16, waf:11, buOf:27, wab:7 },
    apple:     { shf:16, ch:27, bl:29, waf:21, buOf:25, wab:9 },
    rectangle: { shf:15, ch:22, bl:16, waf:14, buOf:18, wab:6 },
  },
  male: {
    hourglass: { shf:20, ch:28, bl:18, waf:16, buOf:22, wab:5 },
    pear:      { shf:16, ch:22, bl:18, waf:14, buOf:26, wab:5 },
    apple:     { shf:18, ch:26, bl:32, waf:26, buOf:18, wab:8 },
    rectangle: { shf:18, ch:24, bl:20, waf:18, buOf:18, wab:5 },
  },
}

// Profile breast-cup line — an internal contour that separates the breast mound
// from the ribcage, so the bust reads as a defined cup (females only). Returns
// null for males. Geometry mirrors the female branch of buildProfilePath.
function profileBreastCup(sex, bodyType, cup) {
  if (sex !== 'female') return null
  const sp = 88
  const { ch, bl } = PROFILE_CFG.female?.[bodyType] ?? PROFILE_CFG.female.hourglass
  const cf   = cupScale(cup)
  const chY  = 128
  const chfX = sp + ch
  const apple = bl >= ch
  // Underbust crease drops a little lower for bigger cups.
  const ubX = apple ? chfX - 3 : chfX - ch * 0.4 // underbust crease point on the outline
  const ubY = (apple ? chY + 24 : chY + 30) + (cf - 1) * 8
  const f = n => +n.toFixed(1)
  // Inframammary fold: from the underbust point on the front outline, curve back
  // toward the ribcage — a shallow crease that defines the underside of the
  // breast. Stays well INSIDE the silhouette (never crosses the outline), so it
  // adds cup definition without distorting the body edge.
  const endX = sp + ch * 0.18
  const endY = ubY - 16
  return `M ${f(ubX)},${f(ubY)} C ${f(ubX-3)},${f(ubY-2)} ${f(endX+6)},${f(endY+3)} ${f(endX)},${f(endY)}`
}

function buildProfilePath(sex, bodyType, cup) {
  const isM = sex === 'male'
  const sp  = 88   // spine x

  const CFG = PROFILE_CFG
  const { shf, ch, bl, waf, buOf, wab } = CFG[sex]?.[bodyType] ?? CFG.female.hourglass
  const cf = cupScale(cup)   // breast-size multiplier from chosen cup size

  // ── Front x anchors ────────────────────────────────────────
  const thrX  = sp + 15          // front of throat
  const shfX  = sp + shf         // front of shoulder / clavicle
  const chfX  = sp + ch          // chest / breast peak
  const blfX  = sp + bl          // maximum belly protrusion
  const wafX  = sp + waf         // waist front
  const hifX  = sp + 16          // hip / pubic front
  const crfX  = sp + 12          // crotch front
  const knfX  = sp + 16          // front of knee
  const anfX  = sp + 12          // front ankle
  const toeX  = sp + 38          // toe tip

  // ── Back x anchors ─────────────────────────────────────────
  const napeX = sp - 3                         // nape of neck
  const shbX  = isM ? sp - 22 : sp - 20        // shoulder blade (male slightly deeper)
  const wabX  = sp - wab                        // waist BACK — nearly at spine!
  const butX  = sp - buOf                       // buttock peak (behind spine)
  const gfX   = sp - 5                           // gluteal fold (buttock meets thigh)
  const knbX  = sp - 10                         // back of knee
  const cabX  = sp - 16                         // calf peak (gastrocnemius)
  const anbX  = sp - 8                          // back ankle
  const heelX = sp - 22                         // heel

  // ── Y landmarks ────────────────────────────────────────────
  const ntY = 62   // neck top / chin
  const shY = 90   // shoulder
  const chY = isM ? 112 : 128   // chest peak (male pec higher; female breast lower)
  const blY = ((chY + 205) / 2) | 0  // belly midpoint
  const waY = 205  // waist
  const hiY = 242  // hip crest
  const buY = 260  // buttock peak Y (seat level)
  const gfY = 290  // gluteal fold Y (below crotch — buttock undercurve)
  const crY = 272  // crotch
  const knY = 362  // knee
  const caY = 402  // calf peak
  const anY = 450  // ankle
  const ftY = 465  // top of foot / toe height
  const soY = 474  // sole (ground)

  const f = n => +n.toFixed(1)
  const s = []

  // ── FRONT SIDE (top → bottom) ───────────────────────────────
  s.push(`M ${thrX},${ntY}`)

  // Throat → front of shoulder (neck opens outward and down)
  s.push(`C ${f(thrX+4)},${f(ntY+14)} ${shfX},${f(shY-10)} ${shfX},${shY}`)

  // Shoulder → chest / breast peak.
  // For females the chest arrives at the peak already heading down-AND-forward
  // (control point pulled back to chfX-6), matching the direction the breast
  // then departs in. That makes the chest and breast meet as one gradual swell
  // instead of a sharp shelf. Males keep a straight-down arrival.
  if (isM) {
    s.push(`C ${f(shfX+6)},${f(shY+20)} ${chfX},${f(chY-18)} ${chfX},${chY}`)
  } else {
    s.push(`C ${f(shfX+6)},${f(shY+20)} ${f(chfX-6)},${f(chY-18)} ${chfX},${chY}`)
  }

  if (bl >= ch && isM) {
    // Male apple (belly protrudes as far or further than the chest): one smooth,
    // dominant forward curve from chest down to the lower abdomen, then back to
    // the waist. No breast.
    s.push(`C ${chfX},${f(chY+18)} ${blfX},${f(blY-22)} ${blfX},${blY}`)
    // Belly → taper to waist
    s.push(`C ${blfX},${f(blY+18)} ${f(wafX+8)},${f(waY-20)} ${wafX},${waY}`)
  } else if (bl >= ch) {
    // Female apple: a soft breast at the chest, THEN a dominant rounded belly.
    // The underbust crease is shallow (just enough to define the breast) so it
    // gently flows into the larger belly below rather than forming a sharp notch.
    const buX = f(chfX + 4 * cf)     // breast apex (sits just above the belly)
    const buY = f(chY + 8 + (cf - 1) * 6)
    const ubX = f(chfX - 3)          // shallow underbust crease
    const ubY = f(chY + 24 + (cf - 1) * 8)
    // Upper chest → breast apex (vertical tangent at apex = forward-most)
    s.push(`C ${f(chfX+1)},${f(chY+3)} ${buX},${f(buY-5)} ${buX},${buY}`)
    // Breast apex → shallow underbust crease
    s.push(`C ${buX},${f(buY+6)} ${f(ubX+6)},${f(ubY-4)} ${ubX},${ubY}`)
    // Underbust → dominant belly protrusion
    s.push(`C ${f(ubX+1)},${f(ubY+10)} ${blfX},${f(blY-12)} ${blfX},${blY}`)
    // Belly → taper to waist
    s.push(`C ${blfX},${f(blY+18)} ${f(wafX+8)},${f(waY-20)} ${wafX},${waY}`)
  } else if (isM) {
    // Male non-apple: chest curves more directly to waist
    s.push(`C ${chfX},${f(chY+28)} ${f(wafX+6)},${f(waY-28)} ${wafX},${waY}`)
  } else {
    // Female: distinct rounded breast → underbust crease → belly → waist.
    // The bust apex (buX) is the forward-most point and is reached with a
    // VERTICAL tangent, so the breast is a smooth rounded curve (no backward
    // loop/bump). A clear underbust crease then tucks back toward the ribcage.
    const buX  = f(chfX + 8 * cf)     // breast apex — projects forward of the chest
    const buY  = f(chY + 12 + (cf - 1) * 6)
    const ubX  = f(chfX - ch * 0.4)   // underbust crease, tucked toward ribcage
    const ubY  = f(chY + 30 + (cf - 1) * 8)
    // Upper chest → rounded bust apex (apex reached vertically = forward-most)
    s.push(`C ${f(chfX+1)},${f(chY+3)} ${buX},${f(buY-6)} ${buX},${buY}`)
    // Bust apex → underbust crease (continues down from apex, then tucks in)
    s.push(`C ${buX},${f(buY+6)} ${f(ubX+10)},${f(ubY-4)} ${ubX},${ubY}`)
    // Underbust → belly protrusion (curves back outward)
    s.push(`C ${f(ubX-2)},${f(ubY+9)} ${blfX},${f(blY-10)} ${blfX},${blY}`)
    // Belly → taper to waist
    s.push(`C ${blfX},${f(blY+16)} ${f(wafX+6)},${f(waY-18)} ${wafX},${waY}`)
  }

  // Waist → hip front
  s.push(`C ${wafX},${f(waY+20)} ${hifX},${f(hiY-16)} ${hifX},${hiY}`)

  // Hip → crotch front
  s.push(`C ${hifX},${f(hiY+14)} ${crfX},${f(crY-10)} ${crfX},${crY}`)

  // Crotch → front of thigh → front of knee (slight forward lean)
  s.push(`L ${knfX},${f(knY-52)}`)
  s.push(`C ${knfX},${f(knY-28)} ${knfX},${f(knY-8)} ${knfX},${knY}`)

  // Front of knee → front ankle (shin is nearly straight)
  s.push(`L ${anfX},${anY}`)

  // Ankle → toe (dorsal foot curves forward)
  s.push(`C ${anfX},${f(anY+10)} ${f(toeX-12)},${f(ftY-2)} ${f(toeX-4)},${ftY}`)
  s.push(`L ${toeX},${ftY}`, `L ${toeX},${soY}`)

  // ── SOLE (toe → heel) ────────────────────────────────────────
  s.push(`L ${heelX},${soY}`)

  // ── HEEL CURVE ───────────────────────────────────────────────
  s.push(`C ${f(heelX-8)},${soY} ${f(heelX-10)},${ftY} ${heelX},${ftY}`)

  // ── BACK SIDE (bottom → top) ─────────────────────────────────
  // Heel → back ankle
  s.push(`C ${f(heelX+4)},${f(ftY-12)} ${f(anbX-4)},${f(anY+16)} ${anbX},${anY}`)

  // Back ankle → calf peak (gastrocnemius protrudes backward)
  s.push(`C ${anbX},${f(anY-28)} ${cabX},${f(caY+18)} ${cabX},${caY}`)

  // Calf peak → back of knee
  s.push(`C ${cabX},${f(caY-18)} ${knbX},${f(knY+8)} ${knbX},${knY}`)

  // Back of knee → posterior thigh (hamstring) → gluteal fold.
  // The fold (gfX, gfY) sits close to the spine and BELOW the buttock peak —
  // this is the crease where the buttock meets the thigh.
  s.push(`C ${f(knbX-2)},${f(knY-44)} ${f(gfX-7)},${f(gfY+34)} ${gfX},${gfY}`)

  // ── GLUTE + LORDOSIS (anatomical, C1-smooth at the peak) ─────────────
  // A real buttock in profile = a rounded undercurve lifting from the fold up
  // to the seat (peak), then a concave lumbar sweep in to the waist. Keeping
  // the projection moderate (buOf) and the fold close to the spine avoids the
  // exaggerated, pointed look.

  // Gluteal fold → buttock peak (rounded undercurve, near-vertical at the peak)
  s.push(`C ${f(gfX+1)},${f(gfY-14)} ${f(butX+3)},${f(buY+20)} ${butX},${buY}`)

  // Buttock peak → waist back (lumbar lordosis; C1-continuous at the peak)
  s.push(`C ${f(butX-3)},${f(buY-20)} ${f(wabX-7)},${f(waY+32)} ${wabX},${waY}`)

  // Waist back → shoulder blade (thoracic kyphosis bows backward).
  // CP1 must be at x < wabX so the curve immediately sweeps backward from the waist.
  s.push(`C ${f(wabX-4)},${f(waY-28)} ${shbX},${f(chY+32)} ${shbX},${shY}`)

  // Shoulder blade → nape (sweeps forward and up)
  s.push(`C ${f(shbX+4)},${f(shY-16)} ${napeX},${f(ntY+12)} ${napeX},${ntY}`)

  // Z closes napeX,ntY → thrX,ntY: the neck cross-section (~18 px wide)
  s.push('Z')

  return s.join(' ')
}

// Compute scan line widths by interpolating between body landmarks
function scanLines(p) {
  const { sW, cW, wW, hW, tW } = p
  const knots = [
    [65, 9], [83, 9], [90, sW], [116, (sW + cW) / 2], [142, cW],
    [171, (cW + wW) / 2], [200, wW], [220, (wW + hW) / 2], [240, hW],
    [268, hW * 0.88], [293, tW + 3], [318, tW],
    [354, (tW + 12) / 2], [390, 12], [426, 9.5], [462, 6.5],
  ]
  const ys = Array.from({ length: 25 }, (_, i) => 90 + i * 15)
  return ys.map(y => {
    let i = knots.findIndex(([ky]) => ky > y) - 1
    if (i < 0) i = 0
    if (i >= knots.length - 1) i = knots.length - 2
    const [y0, w0] = knots[i], [y1, w1] = knots[i + 1]
    const t = (y - y0) / (y1 - y0)
    return { y, w: w0 + (w1 - w0) * t }
  }).filter(({ w }) => w > 5)
}

// ── Wireframe-mesh helpers ─────────────────────────────────────────────────────
// The "human 3-D wireframe" look comes from a dense quad-mesh that WRAPS the body:
//   • vertical meridians that pinch at the waist and bow out at chest / hips
//   • tight horizontal latitude rings, arced upward for cylindrical depth
// Both are derived from one outer-envelope half-width profile, then clipped to the
// body outline so the inter-leg gap is carved out automatically.

// Outer half-width (centre → silhouette edge) of the FRONT body at height y.
function frontWidthKnots(p) {
  const { sW, cW, wW, hW, tW } = p
  return [
    [62, 7], [65, 9], [80, sW * 0.66], [90, sW],
    [116, (sW + cW) / 2], [142, cW], [172, (cW + wW) / 2], [200, wW],
    [220, (wW + hW) / 2], [240, hW], [268, hW * 0.90], [300, (hW * 0.90 + tW) / 2],
    [318, tW], [354, (tW + 12) / 2], [390, 12], [426, 9.5], [462, 6.5],
  ]
}

// Linear interpolation of a [y,w] knot table at height y.
function widthAt(knots, y) {
  if (y <= knots[0][0]) return knots[0][1]
  const last = knots[knots.length - 1]
  if (y >= last[0]) return last[1]
  for (let i = 0; i < knots.length - 1; i++) {
    const [y0, w0] = knots[i], [y1, w1] = knots[i + 1]
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0)
      return w0 + (w1 - w0) * t
    }
  }
  return last[1]
}

// A vertical meridian that follows the body contour at fraction f of half-width.
// s = +1 (right) / -1 (left). Sampled densely → smooth polyline.
function meridianPath(knots, cx, f, s, y0 = 66, y1 = 478, step = 8) {
  const pts = []
  for (let y = y0; y <= y1; y += step) {
    const x = cx + s * f * widthAt(knots, y)
    pts.push(`${x.toFixed(1)},${y}`)
  }
  return 'M ' + pts.join(' L ')
}

// ── Body-type selector icon (abstract shape) ──────────────────────────────────
function BodyTypeIcon({ type, color }) {
  const paths = {
    hourglass: 'M2 1 L14 1 L12 8 L11 10 L13 22 L3 22 L5 10 L4 8 Z',
    pear:      'M5 1 L11 1 L12 8 L14 22 L2 22 L4 8 Z',
    apple:     'M3 1 L13 1 L15 8 L15 14 L13 22 L3 22 L1 14 L1 8 Z',
    rectangle: 'M4 1 L12 1 L12 22 L4 22 Z',
  }
  return (
    <svg width="12" height="18" viewBox="0 0 16 23" fill="none">
      <path d={paths[type]} stroke={color} strokeWidth="1.3" strokeLinejoin="round"
        fill={color} fillOpacity="0.12" />
    </svg>
  )
}

// ── Wireframe silhouette (used in body scan + progress cards) ─────────────────
// uid: unique string per instance — prevents SVG defs ID collisions in the DOM
function WireframeSilhouette({ view = 'front', sex = 'female', bodyType = 'hourglass', color, showLabels = false, measurements = {}, uid = 'x', cup }) {
  const c  = color || T.accent
  const sw = 1.6
  const props = BODY_PROPS[sex]?.[bodyType] ?? BODY_PROPS.female.hourglass

  if (view === 'profile') {
    return <ProfileSilhouette sex={sex} bodyType={bodyType} color={c} strokeWidth={sw} uid={uid} cup={cup} />
  }

  const bodyPath = buildFrontPath(props)
  const cx = 100
  const { sW, cW, wW, hW } = props

  // Unique IDs for this SVG instance
  const filtId  = `gw-${uid}`
  const bClip   = `bc-${uid}`
  const hClip   = `hc-${uid}`
  const aRClip  = `arc-${uid}`
  const aLClip  = `alc-${uid}`
  const armR    = buildArmPath(props, 'right')
  const armL    = buildArmPath(props, 'left')

  // Contour-mesh data: outer half-width profile + dense latitude ring heights
  const wKnots = frontWidthKnots(props)
  const latYs  = Array.from({ length: 44 }, (_, i) => 92 + i * 9).filter(y => y <= 474)

  // Measurement label positions
  const chestY = 142, waistY = 200, hipY = 240, labelX = cx + cW + 14

  return (
    <svg viewBox="0 0 200 500" width="100%" height="100%"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        {/* Cyan glow — applied to outlines only for performance */}
        <filter id={filtId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <clipPath id={bClip}><path d={bodyPath}/></clipPath>
        <clipPath id={hClip}><circle cx={cx} cy={42} r={22}/></clipPath>
        <clipPath id={aRClip}><path d={armR}/></clipPath>
        <clipPath id={aLClip}><path d={armL}/></clipPath>
      </defs>

      {/* ── SCANNER PAD (concentric ground ellipses) ── */}
      <g fill="none" stroke={c} strokeLinecap="round">
        <ellipse cx={cx} cy={487} rx={84} ry={10} opacity={0.10}/>
        <ellipse cx={cx} cy={487} rx={54} ry={6.5} opacity={0.16}/>
        <ellipse cx={cx} cy={487} rx={26} ry={3.5} opacity={0.22}/>
      </g>

      {/* ── HEAD ── */}
      <circle cx={cx} cy={42} r={22} fill="rgba(3,12,9,0.82)"/>
      {/* Head mesh (clipped to circle) */}
      <g clipPath={`url(#${hClip})`} stroke={c} strokeWidth={0.55} opacity={0.42} fill="none">
        {/* Latitude lines */}
        {[-10, -2, 6, 14].map(dy => {
          const y  = 42 + dy
          const rr = Math.sqrt(Math.max(0, 484 - dy * dy))
          return <path key={`hl${dy}`} d={`M ${+(cx-rr).toFixed(1)},${y} Q ${cx},${+(y-rr*0.13).toFixed(1)} ${+(cx+rr).toFixed(1)},${y}`}/>
        })}
        {/* Meridian lines */}
        {[-11, 0, 11].map(dx => <line key={`hv${dx}`} x1={cx+dx} y1={20} x2={cx+dx} y2={64}/>)}
      </g>
      <circle cx={cx} cy={42} r={22} fill="none" stroke={c} strokeWidth={sw} filter={`url(#${filtId})`}/>

      {/* ── NECK ── */}
      <line x1={cx-9} y1={65} x2={cx-9} y2={83} stroke={c} strokeWidth={sw}/>
      <line x1={cx+9} y1={65} x2={cx+9} y2={83} stroke={c} strokeWidth={sw}/>

      {/* ── RIGHT ARM ── (mesh: dense horizontals + 2 verticals) */}
      <path d={armR} fill="rgba(3,12,9,0.78)"/>
      <g clipPath={`url(#${aRClip})`} stroke={c} strokeWidth={0.7} opacity={0.55} fill="none">
        {[100, 114, 128, 144, 162, 182, 204, 228, 252, 276, 298].map(y => (
          <line key={y} x1={cx+sW-2} y1={y} x2={cx+sW+46} y2={y}/>
        ))}
        {[12, 26].map(dx => (
          <line key={`av${dx}`} x1={cx+sW+dx} y1={88} x2={cx+sW+dx} y2={300}/>
        ))}
      </g>
      <path d={armR} fill="none" stroke={c} strokeWidth={sw}/>

      {/* ── LEFT ARM ── (mirror) */}
      <path d={armL} fill="rgba(3,12,9,0.78)"/>
      <g clipPath={`url(#${aLClip})`} stroke={c} strokeWidth={0.7} opacity={0.55} fill="none">
        {[100, 114, 128, 144, 162, 182, 204, 228, 252, 276, 298].map(y => (
          <line key={y} x1={cx-sW-46} y1={y} x2={cx-sW+2} y2={y}/>
        ))}
        {[12, 26].map(dx => (
          <line key={`av${dx}`} x1={cx-sW-dx} y1={88} x2={cx-sW-dx} y2={300}/>
        ))}
      </g>
      <path d={armL} fill="none" stroke={c} strokeWidth={sw}/>

      {/* ── BODY DARK FILL ── */}
      <path d={bodyPath} fill="rgba(3,12,9,0.82)"/>

      {/* ── CONTOUR MERIDIANS — vertical lines that wrap the body ── */}
      {/* Pinch at the waist, bow at chest / hips. Clipped so the inter-leg */}
      {/* gap is carved out automatically. This is the 3-D-wireframe signature. */}
      <g clipPath={`url(#${bClip})`} stroke={c} strokeWidth={0.75} opacity={0.62} fill="none">
        <path d={meridianPath(wKnots, cx, 0, 1)} strokeOpacity={0.8}/>
        {[0.16, 0.30, 0.44, 0.58, 0.72, 0.84, 0.94].flatMap(fr => [
          <path key={`mr${fr}`} d={meridianPath(wKnots, cx, fr, 1)}/>,
          <path key={`ml${fr}`} d={meridianPath(wKnots, cx, fr, -1)}/>,
        ])}
      </g>

      {/* ── HORIZONTAL LATITUDE RINGS (arced upward → cylindrical depth) ── */}
      {/* Clipped to body so each ring splits across the two legs correctly. */}
      <g clipPath={`url(#${bClip})`} stroke={c} strokeWidth={0.75} opacity={0.62} fill="none">
        {latYs.map(y => {
          const w = widthAt(wKnots, y)
          return (
            <path key={y}
              d={`M ${+(cx-w-2).toFixed(1)},${y} Q ${cx},${+(y-w*0.13).toFixed(1)} ${+(cx+w+2).toFixed(1)},${y}`}
            />
          )
        })}
      </g>

      {/* ── BODY OUTLINE — bright glowing stroke ── */}
      <path d={bodyPath} fill="none" stroke={c} strokeWidth={sw} filter={`url(#${filtId})`}/>

      {/* ── FEMALE BREAST CUPS (defined rounded cups) ── */}
      {sex === 'female' && (() => {
        // Each cup = an under-breast curve sweeping low from the sternum out and
        // up to the side, plus a short cleavage tick at the centre. The bowl dips
        // deeper for bigger cup sizes, so the chosen cup visibly changes the bust.
        const cf = cupScale(cup)
        const cupTop = 138
        const low  = cupTop + 46 * cf      // bowl depth scales with cup size
        const side = cupTop + 12 * cf
        const cupPath = (s) => `M ${+(cx+s*cW*0.06).toFixed(1)},${cupTop}`
          + ` C ${+(cx+s*cW*0.34).toFixed(1)},${low} ${+(cx+s*cW*0.78).toFixed(1)},${low} ${+(cx+s*(cW-1)).toFixed(1)},${side}`
        return (
          <g opacity={0.82} filter={`url(#${filtId})`}>
            <path d={cupPath(1)}  fill="none" stroke={c} strokeWidth={1.2}/>
            <path d={cupPath(-1)} fill="none" stroke={c} strokeWidth={1.2}/>
            {/* centre cleavage tick */}
            <line x1={cx} y1={cupTop+2} x2={cx} y2={low-6} stroke={c} strokeWidth={1} opacity={0.7}/>
          </g>
        )
      })()}

      {/* ── MEASUREMENT LABELS ── */}
      {showLabels && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill={c} letterSpacing="0.1em" opacity={0.85}>
          {measurements.chest && (<>
            <line x1={cx+cW} y1={chestY} x2={labelX-2} y2={chestY} stroke={c} strokeWidth={0.7} strokeDasharray="2,2" opacity={0.6}/>
            <text x={labelX} y={chestY+3} fontSize="8">CHEST</text>
          </>)}
          {measurements.waist && (<>
            <line x1={cx+wW} y1={waistY} x2={labelX-2} y2={waistY} stroke={c} strokeWidth={0.7} strokeDasharray="2,2" opacity={0.6}/>
            <text x={labelX} y={waistY+3} fontSize="8">WAIST</text>
          </>)}
          {measurements.hips && (<>
            <line x1={cx+hW} y1={hipY} x2={labelX-2} y2={hipY} stroke={c} strokeWidth={0.7} strokeDasharray="2,2" opacity={0.6}/>
            <text x={labelX} y={hipY+3} fontSize="8">HIP</text>
          </>)}
        </g>
      )}

      {/* ── ANIMATED SCAN LINE (sweeps the body) ── */}
      <g clipPath={`url(#${bClip})`}>
        <line x1={20} x2={180} stroke={c} strokeWidth={1.6} filter={`url(#${filtId})`}>
          <animate attributeName="y1" values="78;470;470" keyTimes="0;0.8;1" dur="4.8s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="78;470;470" keyTimes="0;0.8;1" dur="4.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.7;0;0.7" keyTimes="0;0.78;0.82;1" dur="4.8s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>
  )
}

// ── Profile (side) view silhouette ────────────────────────────────────────────
// Coordinate system matches buildProfilePath: sp=88, figure faces right.
// Head sits above the neck, slightly forward of spine (headCX = sp+8 = 96).
// Arm is drawn OVER the body — it hangs in front and is narrower in profile.
function ProfileSilhouette({ sex, bodyType, color, strokeWidth = 1.6, uid = 'px', cup }) {
  const c   = color || T.accent
  const isM = sex === 'male'
  const sp  = 88   // spine x — must match buildProfilePath

  // Head: skull centre slightly forward of spine and above the neck
  const headCX = sp + 8    // = 96 (head protrudes forward of neck slightly)
  const headCY = 38        // top of figure
  const headR  = 22

  // Y / x landmarks (keep in sync with buildProfilePath)
  const ntY = 62   // neck top
  const shY = 90   // shoulder

  // Body silhouette from the shared path builder
  const profile = buildProfilePath(sex, bodyType, cup)

  // ── Arm (profile view) ───────────────────────────────────────────────────
  // The arm hangs beside the body. In a side view it appears as a tapered strip
  // running from the shoulder (~y=90) to mid-thigh (~y=310).
  //
  // Position: arm is tucked just BEHIND the bust line so the bust stays the
  // frontmost point (anatomically correct). It emerges in front only at the
  // waist/hip, where the torso curves back — exactly how a hanging arm reads.
  // Earlier the arm centre was too far forward (sp+16/18): its front edge stuck
  // out past the bust and the heavy taper made the hand a thin "blade."
  const armCX = isM ? sp + 10 : sp + 8    // 98 male / 96 female (behind bust)
  const aHW = 10   // half-width at shoulder
  const aHB = 9    // half-width at hand (minimal taper → forearm keeps its width)
  const aSH = shY, aEL = 205, aFI = 296   // shoulder / elbow / fingertip (upper thigh)
  const aOut = armCX + aHW, aInn = armCX - aHW
  const aOBt = armCX + aHB, aIBt = armCX - aHB
  const fp = n => +n.toFixed(1)
  const pH = aEL - aSH   // upper-arm span
  const profileArm = [
    `M ${aInn},${aSH}`,
    `L ${aOut},${aSH}`,
    // Outer (front) edge: gentle bow at elbow, only a slight taper to the wrist
    `C ${fp(aOut+2)},${fp(aSH+pH*0.40)} ${fp(aOut+1)},${fp(aEL+(aFI-aEL)*0.40)} ${aOBt},${fp(aFI-6)}`,
    // Full rounded hand (deep arc across the whole wrist width → no point)
    `C ${fp(aOBt)},${fp(aFI+6)} ${fp(aIBt)},${fp(aFI+6)} ${aIBt},${fp(aFI-6)}`,
    // Inner (back) edge: near-straight back up to the shoulder
    `C ${aInn},${fp(aEL+(aFI-aEL)*0.40)} ${aInn},${fp(aSH+pH*0.46)} ${aInn},${aSH}`,
    'Z',
  ].join(' ')

  // ── Wireframe grid lines ─────────────────────────────────────
  // Vertical front-to-back depth columns (clipped to body) — denser quad mesh
  const vLineXs = [sp-26, sp-20, sp-14, sp-8, sp-2, sp+6, sp+14, sp+22, sp+30]
  // Horizontal scan rings shoulder → ankle — tighter spacing
  const scanYs = Array.from({ length: 40 }, (_, i) => shY + i * 10)

  const filtId  = `gw-${uid}`
  const bClip   = `pbc-${uid}`
  const hClip   = `phc-${uid}`
  const armClip = `pac-${uid}`

  return (
    // viewBox crops tightly around the body (x≈42-132, y≈14-476).
    // This fills the panel height at correct human-profile proportions
    // instead of leaving the figure as a narrow strip in a 200×500 space.
    <svg viewBox="34 14 106 462" width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <filter id={filtId} x="-70%" y="-30%" width="240%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <clipPath id={bClip}><path d={profile}/></clipPath>
        <clipPath id={hClip}><circle cx={headCX} cy={headCY} r={headR}/></clipPath>
        <clipPath id={armClip}><path d={profileArm}/></clipPath>
      </defs>

      {/* ── SCANNER PAD (concentric ground ellipses) ── */}
      <g fill="none" stroke={c} strokeLinecap="round">
        <ellipse cx={90} cy={474} rx={44} ry={5.5} opacity={0.10}/>
        <ellipse cx={90} cy={474} rx={28} ry={3.6} opacity={0.16}/>
        <ellipse cx={90} cy={474} rx={14} ry={2.1} opacity={0.22}/>
      </g>

      {/* ── HEAD ── */}
      <circle cx={headCX} cy={headCY} r={headR} fill="rgba(3,12,9,0.82)"/>
      <g clipPath={`url(#${hClip})`} stroke={c} strokeWidth={0.55} opacity={0.42} fill="none">
        {/* Flat horizontals — correct for profile (no arc illusion needed) */}
        {[-10, -2, 6, 14].map(dy => (
          <line key={`phl${dy}`}
            x1={headCX - headR} y1={headCY + dy}
            x2={headCX + headR} y2={headCY + dy}/>
        ))}
        {/* Front-to-back verticals */}
        {[-10, 0, 10].map(dx => (
          <line key={`phv${dx}`}
            x1={headCX + dx} y1={headCY - headR}
            x2={headCX + dx} y2={headCY + headR}/>
        ))}
      </g>
      <circle cx={headCX} cy={headCY} r={headR}
        fill="none" stroke={c} strokeWidth={strokeWidth} filter={`url(#${filtId})`}/>

      {/* ── BODY DARK FILL ── */}
      <path d={profile} fill="rgba(3,12,9,0.82)"/>

      {/* ── GRID LINES (clipped to body) ── */}
      {/* Vertical depth columns */}
      <g clipPath={`url(#${bClip})`} stroke={c} strokeWidth={0.75} opacity={0.6} fill="none">
        {vLineXs.map(x => (
          <line key={`pv${x}`} x1={x} y1={ntY} x2={x} y2={482}/>
        ))}
      </g>
      {/* Horizontal scan rings */}
      <g clipPath={`url(#${bClip})`} stroke={c} strokeWidth={0.75} opacity={0.6} fill="none">
        {scanYs.map(y => (
          <line key={`ps${y}`} x1={44} y1={y} x2={168} y2={y}/>
        ))}
      </g>

      {/* ── GLOWING BODY OUTLINE ── */}
      <path d={profile} fill="none" stroke={c} strokeWidth={strokeWidth} filter={`url(#${filtId})`}/>

      {/* ── FEMALE BREAST CUP (defined internal contour) ── */}
      {sex === 'female' && (
        <path d={profileBreastCup(sex, bodyType, cup)} fill="none"
          stroke={c} strokeWidth={1.1} opacity={0.8} filter={`url(#${filtId})`}/>
      )}

      {/* ── ARM — on top of body ── */}
      <path d={profileArm} fill="rgba(3,12,9,0.80)"/>
      <g clipPath={`url(#${armClip})`} stroke={c} strokeWidth={0.7} opacity={0.55} fill="none">
        {[100, 114, 128, 144, 162, 182, 204, 228, 252, 276, 298].map(y => (
          <line key={y} x1={armCX - 16} y1={y} x2={armCX + 16} y2={y}/>
        ))}
        {[-7, 0, 7].map(dx => (
          <line key={`pav${dx}`} x1={armCX + dx} y1={shY} x2={armCX + dx} y2={312}/>
        ))}
      </g>
      <path d={profileArm} fill="none" stroke={c} strokeWidth={strokeWidth}/>

      {/* ── ANIMATED SCAN LINE (sweeps the body) ── */}
      <g clipPath={`url(#${bClip})`}>
        <line x1={44} x2={168} stroke={c} strokeWidth={1.6} filter={`url(#${filtId})`}>
          <animate attributeName="y1" values="62;470;470" keyTimes="0;0.8;1" dur="4.8s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="62;470;470" keyTimes="0;0.8;1" dur="4.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.7;0;0.7" keyTimes="0;0.78;0.82;1" dur="4.8s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>
  )
}

// ── Corner bracket decoration ─────────────────────────────────────────────────
function CornerBrackets({ color, size = 16, inset = 10 }) {
  const c = color, sw = '1.5'
  const pLeft  = inset, pRight  = `calc(100% - ${inset}px)`
  const pTop   = inset, pBottom = `calc(100% - ${inset}px)`
  const corners = [
    { style: { top: pTop, left: pLeft },           d: `M0,${size} L0,0 L${size},0`   },
    { style: { top: pTop, right: pLeft },           d: `M0,0 L${size},0 L${size},${size}` },
    { style: { bottom: pTop, left: pLeft },         d: `M0,0 L0,${size} L${size},${size}` },
    { style: { bottom: pTop, right: pLeft },        d: `M${size},0 L${size},${size} L0,${size}` },
  ]
  return (
    <>
      {corners.map((co, i) => (
        <svg key={i} width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', ...co.style }}
          fill="none">
          <path d={co.d} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </>
  )
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ value, suffix }) {
  if (value == null) return null
  const n = parseFloat(value)
  const isNeg = n < 0
  const isZero = n === 0
  return (
    <span className={`${styles.deltaBadge} ${isNeg ? styles.deltaNeg : isZero ? styles.deltaZero : styles.deltaPos}`}>
      {isNeg ? '' : '+'}{value}&thinsp;cm
      {suffix && <span className={styles.deltaLabel}> {suffix}</span>}
    </span>
  )
}

// ── Number input ──────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, placeholder }) {
  return (
    <div className={styles.inputRow}>
      <input
        className={styles.input}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        step={0.1}
      />
      <span className={styles.inputUnit}>cm</span>
    </div>
  )
}

// ── Scan toggle button ────────────────────────────────────────────────────────
function ScanToggleBtn({ on, onClick, children, icon, flex = 1 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex, padding: '9px 8px', borderRadius: 10,
        border: `1px solid ${on ? T.accent : 'rgba(63,202,165,0.22)'}`,
        background: on ? 'rgba(63,202,165,0.14)' : 'rgba(255,255,255,0.04)',
        color: on ? T.accent : 'rgba(250,250,247,0.5)',
        fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? 700 : 500,
        letterSpacing: '-0.01em', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {icon}
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Measurements({ measurements, onUpdateMeasurements, userSettings = {}, logs = {}, onNavigate, entitlements, onUpgrade }) {
  // Body Measurements + Body Scan is a GetTrendli Plus feature.
  if (entitlements && !entitlements.hasPremium) {
    return <Paywall feature="Body Measurements" entitlements={entitlements}
      onUpgrade={onUpgrade} onNavigate={onNavigate} active="measurements" />
  }

  const sorted  = [...measurements].sort((a, b) => b.date.localeCompare(a.date))
  const latest   = sorted[0] ?? null
  const previous = sorted[1] ?? null
  const first    = sorted[sorted.length - 1] ?? null

  // ── Future You: weight projection inputs (all in kg) ──────────────────────
  const startW = parseFloat(userSettings.startWeight) || null
  const goalW  = parseFloat(userSettings.goalWeight)  || null
  const currentW = (() => {
    const w = Object.entries(logs).filter(([, v]) => v && v.weight).sort(([a], [b]) => a.localeCompare(b))
    return w.length ? parseFloat(w[w.length - 1][1].weight) : startW
  })()
  const hasProjection = startW && goalW && startW !== goalW
  const refW = currentW || startW || 1
  // Display units
  const isMetric = (userSettings.unitSystem ?? 'metric') !== 'us'
  const wUnit = isMetric ? 'kg' : 'lb'
  const wShow = kg => (kg == null ? null : isMetric ? Math.round(kg) : Math.round(kg * 2.2046))
  // girth from a projected weight (radius ∝ √weight), clamped to a sane range
  const girthFor = w => Math.max(0.8, Math.min(1.28, Math.sqrt((w || refW) / refW)))

  // Form state
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formDate, setFormDate]   = useState(todayISO)
  const [fields, setFields]       = useState(emptyFields)

  // Body scan state (persisted)
  const [scanView, setScanView]     = useState(() => {
    try { return localStorage.getItem('gt_scan_view') || 'front' } catch { return 'front' }
  })
  const [scanSex, setScanSex]       = useState(() => {
    try { return localStorage.getItem('gt_scan_sex') || 'female' } catch { return 'female' }
  })
  const [scanType, setScanType]     = useState(() => {
    try { return localStorage.getItem('gt_scan_type') || 'hourglass' } catch { return 'hourglass' }
  })
  // Future You projected weight (kg). null → use current/start weight.
  const [projW, setProjW] = useState(null)
  const projWeight = projW ?? currentW ?? startW ?? 0

  function saveScanPref(key, val) {
    try { localStorage.setItem(key, val) } catch {}
  }

  function openAdd() {
    setEditingId(null); setFormDate(todayISO); setFields(emptyFields()); setShowForm(true)
  }

  function openEdit(entry) {
    setEditingId(entry.id)
    setFormDate(entry.date)
    setFields({ waist: entry.waist ?? '', hips: entry.hips ?? '', thighs: entry.thighs ?? '', chest: entry.chest ?? '', cup: entry.cup ?? '', neck: entry.neck ?? '', arm: entry.arm ?? '' })
    setShowForm(true)
  }

  function handleSave() {
    const entry = {
      id: editingId ?? String(Date.now()), date: formDate,
      waist: fields.waist || null, hips: fields.hips || null,
      thighs: fields.thighs || null, chest: fields.chest || null,
      cup: fields.cup || null,
      neck: fields.neck || null, arm: fields.arm || null,
    }
    if (editingId) {
      onUpdateMeasurements(measurements.map(m => m.id === editingId ? entry : m))
    } else {
      onUpdateMeasurements([...measurements, entry])
    }
    setShowForm(false)
  }

  // Compute week count for progress header
  const weekCount = first && latest && first.id !== latest.id
    ? Math.max(1, Math.round((new Date(latest.date) - new Date(first.date)) / 604800000))
    : null

  // Delta stats for progress section
  const weightDelta = (latest?.weight != null && first?.weight != null)
    ? (parseFloat(latest.weight) - parseFloat(first.weight)).toFixed(1)
    : null
  const waistDelta = first && latest && first.id !== latest.id ? fieldDelta(latest.waist, first.waist) : null
  const hipsDelta  = first && latest && first.id !== latest.id ? fieldDelta(latest.hips, first.hips) : null

  return (
    <div className={styles.shell}>
      <div className={styles.page}>

        {/* ── Header ───────────────────────────────────────────── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 16px' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', color: T.text }}>
            Measurements
          </div>
          {!showForm && (
            <button onClick={openAdd} type="button" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '9px 16px', borderRadius: 20,
              background: T.ink, color: T.inkText, border: 0,
              fontFamily: FONT.ui, fontSize: 13, fontWeight: 600,
              letterSpacing: '-0.01em', cursor: 'pointer',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add
            </button>
          )}
        </header>

        <div className={styles.scrollContent}>

          {/* ── Add / Edit form ────────────────────────────────── */}
          {showForm && (
            <div className={styles.formCard}>
              <p className={styles.formTitle}>{editingId ? 'Edit entry' : 'New entry'}</p>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Date</span>
                <div className={styles.inputRow}>
                  <input className={styles.dateInput} type="date" value={formDate} max={todayISO}
                    onChange={e => e.target.value && setFormDate(e.target.value)} />
                </div>
              </div>

              <div className={styles.twoCol}>
                {FIELDS.flatMap(f => {
                  const input = (
                    <div key={f.key} className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>{f.label}</span>
                      <NumberInput value={fields[f.key]} onChange={v => setFields(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} />
                    </div>
                  )
                  // Cup size sits right after the Chest measurement.
                  if (f.key !== 'chest') return [input]
                  return [input, (
                    <div key="cup" className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Cup size</span>
                      <div className={styles.inputRow}>
                        <select className={styles.dateInput} value={fields.cup}
                          onChange={e => setFields(p => ({ ...p, cup: e.target.value }))}>
                          <option value="">—</option>
                          {CUP_SIZES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  )]
                })}
              </div>

              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={handleSave} type="button">Save</button>
                <button className={styles.cancelBtn} onClick={() => setShowForm(false)} type="button">Cancel</button>
              </div>
            </div>
          )}

          {/* ── Empty state ────────────────────────────────────── */}
          {!showForm && sorted.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="17" width="40" height="14" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M12 17V13M19 17V11M26 17V13M33 17V11M12 31v4M19 31v6M26 31v4M33 31v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className={styles.emptyTitle}>No measurements yet</p>
              <p className={styles.emptyBody}>Track waist, hips, chest and more over time to see your body composition change.</p>
              <button className={styles.emptyAddBtn} onClick={openAdd} type="button">Log first measurement</button>
            </div>
          )}

          {/* ── Latest snapshot ────────────────────────────────── */}
          {!showForm && latest && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Latest</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.cardDate}>
                    {formatDate(latest.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button className={styles.editBtn} onClick={() => openEdit(latest)} type="button">Edit</button>
                </div>
              </div>

              <div className={styles.metricList}>
                {FIELDS.filter(f => latest[f.key]).map(f => {
                  const prevDelta  = previous ? fieldDelta(latest[f.key], previous[f.key]) : null
                  const firstDelta = first && first.id !== latest.id ? fieldDelta(latest[f.key], first[f.key]) : null
                  const showFirst  = firstDelta != null && first?.id !== previous?.id
                  return (
                    <div key={f.key} className={styles.metricRow}>
                      <span className={styles.metricLabel}>{f.label}</span>
                      <span className={styles.metricValue}><strong>{latest[f.key]}</strong> cm</span>
                      <div className={styles.metricDeltas}>
                        {prevDelta  != null && <DeltaBadge value={prevDelta}  suffix="vs prev" />}
                        {showFirst            && <DeltaBadge value={firstDelta} suffix="vs start" />}
                      </div>
                    </div>
                  )
                })}
                {latest.cup && (
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Cup size</span>
                    <span className={styles.metricValue}><strong>{latest.cup}</strong></span>
                    <div className={styles.metricDeltas} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Body Scan ──────────────────────────────────────── */}
          {!showForm && (
            <div style={{
              background: SCAN_BG, borderRadius: 20,
              border: `1px solid rgba(63,202,165,0.2)`,
              overflow: 'hidden',
            }}>
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px' }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.accent, letterSpacing: '0.14em', fontWeight: 600 }}>
                  BODY SCAN
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT.mono, fontSize: 8, color: T.accentDark, letterSpacing: '0.10em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: T.accent, display: 'inline-block', boxShadow: `0 0 6px ${T.accent}` }} />
                  LIVE PREVIEW
                </span>
              </div>

              <div style={{ padding: '0 12px' }}>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <ScanToggleBtn
                    on={scanView === 'front'} flex={1}
                    onClick={() => { setScanView('front'); saveScanPref('gt_scan_view', 'front') }}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <circle cx="8" cy="4" r="2.2"/>
                        <path d="M4 9 C4 7 12 7 12 9 L12 14 L4 14 Z"/>
                      </svg>
                    }
                  >Front</ScanToggleBtn>
                  <ScanToggleBtn
                    on={scanView === 'profile'} flex={1}
                    onClick={() => { setScanView('profile'); saveScanPref('gt_scan_view', 'profile') }}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <circle cx="6" cy="4" r="2.2"/>
                        <path d="M4 9 C4 7 10 7 10 9 L10 14 L4 14 Z"/>
                      </svg>
                    }
                  >Profile</ScanToggleBtn>
                  <ScanToggleBtn
                    on={scanView === '3d'} flex={1}
                    onClick={() => { setScanView('3d'); saveScanPref('gt_scan_view', '3d') }}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 1.5 14 4.5 14 11 8 14.5 2 11 2 4.5 Z"/>
                        <path d="M2 4.5 8 7.5 14 4.5M8 7.5 8 14.5"/>
                      </svg>
                    }
                  >3D</ScanToggleBtn>
                  <ScanToggleBtn
                    on={scanView === 'future'} flex={1.2}
                    onClick={() => { setScanView('future'); saveScanPref('gt_scan_view', 'future'); setProjW(null) }}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2l1.7 4.9L18.5 8 13.7 9.7 12 14l-1.7-4.3L5.5 8l4.8-1.1L12 2Z"/>
                      </svg>
                    }
                  >Future</ScanToggleBtn>
                </div>

                {/* Sex toggle */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[
                    { id: 'female', label: 'Female' },
                    { id: 'male',   label: 'Male'   },
                  ].map(s => (
                    <ScanToggleBtn key={s.id} on={scanSex === s.id} flex={1}
                      onClick={() => { setScanSex(s.id); saveScanPref('gt_scan_sex', s.id) }}>
                      {s.label}
                    </ScanToggleBtn>
                  ))}
                </div>

                {/* Body type chips */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {BODY_TYPES.map(bt => {
                    const on = scanType === bt.id
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => { setScanType(bt.id); saveScanPref('gt_scan_type', bt.id) }}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 10,
                          border: `1px solid ${on ? T.accent : 'rgba(63,202,165,0.18)'}`,
                          background: on ? 'rgba(63,202,165,0.16)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        }}
                      >
                        <BodyTypeIcon type={bt.id} color={on ? T.accent : 'rgba(63,202,165,0.45)'} />
                        <span style={{
                          fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: '0.08em',
                          color: on ? T.accent : 'rgba(63,202,165,0.5)',
                          fontWeight: on ? 700 : 500,
                        }}>{bt.label.toUpperCase()}</span>
                      </button>
                    )
                  })}
                </div>

              </div>

              {/* Silhouette canvas */}
              <div style={{ position: 'relative', background: 'radial-gradient(circle at 50% 36%, #103a2e 0%, #08201a 52%, #03110c 100%)', margin: '0 12px', borderRadius: 12, overflow: 'hidden' }}>
                <CornerBrackets color={`rgba(63,202,165,0.5)`} size={14} inset={8} />
                <div style={{ height: 340, padding: '10px 0' }}>
                  {/* All three views use the same 3-D renderer for a consistent
                      style; Front/Profile are fixed, non-interactive angles. */}
                  <Canvas3DBoundary>
                    <Suspense fallback={<Scan3DMessage text="LOADING SCAN…" />}>
                      <BodyModel3D
                        sex={scanSex}
                        bodyType={scanType}
                        measurements={latest || {}}
                        cup={latest?.cup}
                        color={T.accent}
                        view={scanView}
                        girth={scanView === 'future' ? girthFor(projWeight) : 1}
                      />
                    </Suspense>
                  </Canvas3DBoundary>
                </div>
                {scanView === '3d' && (
                  <div style={{
                    position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
                    fontFamily: FONT.mono, fontSize: 8, color: 'rgba(63,202,165,0.5)',
                    letterSpacing: '0.10em', pointerEvents: 'none',
                  }}>
                    DRAG TO ROTATE · PINCH TO ZOOM
                  </div>
                )}

                {/* Measurement labels — pinned to body heights on the static views */}
                {(scanView === 'front' || scanView === 'profile') && latest && (latest.chest || latest.waist || latest.hips) && (
                  <div style={{ position: 'absolute', top: 10, right: 10, bottom: 10, width: 92, pointerEvents: 'none' }}>
                    {[
                      latest.chest && { t: 'CHEST', v: latest.chest, top: '33%' },
                      latest.waist && { t: 'WAIST', v: latest.waist, top: '44%' },
                      latest.hips  && { t: 'HIP',   v: latest.hips,  top: '52%' },
                    ].filter(Boolean).map(m => (
                      <div key={m.t} style={{ position: 'absolute', top: m.top, right: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 16, height: 1, background: 'rgba(63,202,165,0.45)' }} />
                        <span style={{ fontFamily: FONT.mono, fontSize: 8, color: T.accent, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                          {m.t} <strong style={{ color: '#dffaf2', fontWeight: 700 }}>{m.v}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── FUTURE YOU overlay ── */}
                {scanView === 'future' && (
                  hasProjection ? (() => {
                    const lo = Math.min(startW, goalW, currentW || startW)
                    const hi = Math.max(startW, goalW, currentW || startW)
                    const pct = w => `${Math.max(0, Math.min(100, ((w - lo) / (hi - lo)) * 100))}%`
                    const near = (a, b) => Math.abs(a - b) < 0.4
                    const tag = near(projWeight, goalW) ? 'GOAL' : near(projWeight, currentW) ? 'TODAY' : near(projWeight, startW) ? 'START' : 'PROJECTED'
                    return (
                      <>
                        {/* projected weight readout (top-left, clear of the head) */}
                        <div style={{ position: 'absolute', top: 12, left: 16, pointerEvents: 'none' }}>
                          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.accentDark, letterSpacing: '0.16em', marginBottom: 1 }}>{tag}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 32, color: T.accent, lineHeight: 1 }}>{wShow(projWeight)}</span>
                            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.accentDark }}>{wUnit.toUpperCase()}</span>
                          </div>
                          {tag === 'PROJECTED' && goalW != null && (
                            <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: 'rgba(63,202,165,0.55)', letterSpacing: '0.06em', marginTop: 2 }}>
                              {wShow(Math.abs(projWeight - (currentW || startW)))} {wUnit} {projWeight < (currentW || startW) ? 'to lose' : 'heavier'}
                            </div>
                          )}
                        </div>
                        {/* slider + markers */}
                        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                          <div style={{ position: 'relative', height: 14, marginBottom: 4 }}>
                            {[['START', startW], ['NOW', currentW], ['GOAL', goalW]].filter(([, w]) => w != null).map(([t, w]) => (
                              <div key={t} style={{ position: 'absolute', left: pct(w), transform: 'translateX(-50%)', fontFamily: FONT.mono, fontSize: 7, color: 'rgba(63,202,165,0.65)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{t}</div>
                            ))}
                          </div>
                          <input type="range" min={lo} max={hi} step={0.1} value={projWeight}
                            onChange={e => setProjW(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }} />
                        </div>
                      </>
                    )
                  })() : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', pointerEvents: 'auto' }}>
                      <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.accent, marginBottom: 6 }}>See your Future You</div>
                      <div style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(63,202,165,0.6)', lineHeight: 1.5, marginBottom: 14 }}>
                        Set a start and goal weight to project how your body could change.
                      </div>
                      <button type="button" onClick={() => onNavigate('settings')} style={{
                        padding: '9px 16px', borderRadius: 10, border: `1px solid ${T.accent}`,
                        background: 'rgba(63,202,165,0.14)', color: T.accent, cursor: 'pointer',
                        fontFamily: FONT.ui, fontSize: 13, fontWeight: 600,
                      }}>Set goal weight</button>
                    </div>
                  )
                )}
              </div>

              {/* Bottom stats */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                padding: '12px 16px 14px',
              }}>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: 'rgba(63,202,165,0.5)', letterSpacing: '0.12em', marginBottom: 3 }}>
                    BUILD
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.accent, letterSpacing: '-0.01em' }}>
                    {scanSex === 'female' ? 'Female' : 'Male'} · {BODY_TYPES.find(bt => bt.id === scanType)?.label}
                  </div>
                </div>
                {latest && (latest.waist || latest.hips) && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: 'rgba(63,202,165,0.5)', letterSpacing: '0.12em', marginBottom: 3 }}>
                      {latest.waist && latest.hips ? 'WAIST · HIP' : latest.waist ? 'WAIST' : 'HIP'}
                    </div>
                    <div style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: 600, color: T.accent, letterSpacing: '-0.01em' }}>
                      {[latest.waist, latest.hips].filter(Boolean).join(' · ')} cm
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div style={{
                padding: '0 16px 12px',
                fontFamily: FONT.ui, fontSize: 10, color: 'rgba(63,202,165,0.35)',
                lineHeight: 1.5, letterSpacing: '0.01em',
              }}>
                Simulator is a visual aid based on your measurements — not an exact body model.
              </div>
            </div>
          )}

          {/* ── Progress side-by-side ──────────────────────────── */}
          {!showForm && latest && first && first.id !== latest.id && (
            <div style={{
              background: T.card, border: `1px solid ${T.hair}`,
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px' }}>
                <Eyebrow>Progress · Side by Side</Eyebrow>
                {weekCount && (
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.mute, letterSpacing: '0.08em' }}>
                    {weekCount} WEEK{weekCount !== 1 ? 'S' : ''}
                  </span>
                )}
              </div>

              {/* Two cards side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
                {/* START card */}
                <div style={{ background: SCAN_BG, borderRadius: 12, padding: '12px 8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8, color: 'rgba(63,202,165,0.5)', letterSpacing: '0.12em' }}>
                    START · {formatDate(first.date, { month: 'short', day: 'numeric' }).toUpperCase()}
                  </div>
                  {first.weight && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 28, color: 'rgba(63,202,165,0.6)', lineHeight: 1 }}>{first.weight}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: 'rgba(63,202,165,0.4)' }}>KG</span>
                    </div>
                  )}
                  <div style={{ width: '100%', aspectRatio: '1 / 2', maxHeight: 160 }}>
                    <Canvas3DBoundary>
                      <Suspense fallback={null}>
                        <BodyThumbnail key={`s-${scanSex}-${scanType}-${first.cup}-${first.waist}-${first.hips}`}
                          sex={scanSex} bodyType={scanType} measurements={first} cup={first.cup} color="#2b7d68" />
                      </Suspense>
                    </Canvas3DBoundary>
                  </div>
                  {(first.waist || first.hips) && (
                    <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: 'rgba(63,202,165,0.4)', letterSpacing: '0.06em', textAlign: 'center' }}>
                      {[first.waist && `WAIST ${first.waist}`, first.hips && `HIPS ${first.hips}`].filter(Boolean).join(' · ')} cm
                    </div>
                  )}
                </div>

                {/* NOW card */}
                <div style={{ background: SCAN_BG, borderRadius: 12, padding: '12px 8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: `1px solid rgba(63,202,165,0.15)` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.accent, letterSpacing: '0.12em', fontWeight: 600 }}>
                    NOW · {formatDate(latest.date, { month: 'short', day: 'numeric' }).toUpperCase()}
                  </div>
                  {latest.weight && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 28, color: T.accent, lineHeight: 1 }}>{latest.weight}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.accentDark }}>KG</span>
                    </div>
                  )}
                  <div style={{ width: '100%', aspectRatio: '1 / 2', maxHeight: 160 }}>
                    <Canvas3DBoundary>
                      <Suspense fallback={null}>
                        <BodyThumbnail key={`n-${scanSex}-${scanType}-${latest.cup}-${latest.waist}-${latest.hips}`}
                          sex={scanSex} bodyType={scanType} measurements={latest} cup={latest.cup} color={T.accent} />
                      </Suspense>
                    </Canvas3DBoundary>
                  </div>
                  {(latest.waist || latest.hips) && (
                    <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: T.accentDark, letterSpacing: '0.06em', textAlign: 'center' }}>
                      {[latest.waist && `WAIST ${latest.waist}`, latest.hips && `HIPS ${latest.hips}`].filter(Boolean).join(' · ')} cm
                    </div>
                  )}
                </div>
              </div>

              {/* Delta stats row */}
              {(weightDelta != null || waistDelta != null || hipsDelta != null) && (
                <div style={{
                  display: 'grid', gridTemplateColumns: weightDelta != null ? '1fr 1fr 1fr' : '1fr 1fr',
                  gap: 0, borderTop: `1px solid ${T.hair}`,
                }}>
                  {[
                    weightDelta != null && { label: 'WEIGHT', value: weightDelta, unit: 'kg' },
                    waistDelta  != null && { label: 'WAIST',  value: waistDelta,  unit: 'cm' },
                    hipsDelta   != null && { label: 'HIPS',   value: hipsDelta,   unit: 'cm' },
                  ].filter(Boolean).map((stat, i, arr) => {
                    const n = parseFloat(stat.value)
                    const isNeg = n < 0
                    const color = isNeg ? T.accentDark : n > 0 ? '#D97706' : T.mute
                    return (
                      <div key={stat.label} style={{
                        padding: '12px 0', textAlign: 'center',
                        borderRight: i < arr.length - 1 ? `1px solid ${T.hair}` : 'none',
                      }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: 8, color: T.mute, letterSpacing: '0.10em', marginBottom: 4 }}>
                          {stat.label}
                        </div>
                        <div style={{ fontFamily: FONT.ui, fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {isNeg ? '' : '+'}{stat.value} <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{stat.unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── History ────────────────────────────────────────── */}
          {!showForm && sorted.length > 1 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>History</span>
              </div>
              <div className={styles.historyList}>
                {sorted.slice(1).map(entry => (
                  <div key={entry.id} className={styles.historyRow}>
                    <span className={styles.historyDate}>
                      {formatDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={styles.historyValues}>{historySnippet(entry)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── Bottom nav ─────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
          <TabBar active="log" onTab={onNavigate} />
        </div>

      </div>
    </div>
  )
}
