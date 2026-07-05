// ── Procedural 3-D body model ───────────────────────────────────────────────────
// A measurement-driven human built entirely in code with react-three-fiber — no
// external 3-D assets. Built for an ORGANIC look:
//   • Catmull-Rom-smoothed radius profiles (no faceted, blocky transitions)
//   • Superellipse cross-sections with front/back asymmetry (belly forward,
//     flatter back, rounded buttock) instead of plain ellipses
//   • Rounded limb ends (hands/feet) instead of flat caps or points
//   • High vertical + radial resolution for smooth shaded skin
//
// Swap-in path for photoreal later: replace <Body> with a loaded rigged GLB
// (e.g. MakeHuman) driven by morph targets — the rest of the app is unaffected.

import { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// ── Fresnel "hologram" material ────────────────────────────────────────────────
// Dark teal body that glows along the silhouette edges (grazing angles) — the
// signature scan/hologram look, achieved with a cheap rim-light shader.
function makeFresnelMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: true,
    uniforms: {
      uColor:     { value: new THREE.Color(color) },
      uBase:      { value: new THREE.Color('#062019') },
      uPower:     { value: 2.6 },
      uIntensity: { value: 1.7 },
      uScanY:     { value: -1.0 },   // animated world-Y of the scan band
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vWY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vWY = wp.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV; varying float vWY;
      uniform vec3 uColor; uniform vec3 uBase; uniform float uPower; uniform float uIntensity; uniform float uScanY;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
        f = clamp(f * uIntensity, 0.0, 1.0);
        vec3 col = mix(uBase, uColor, f);
        // horizontal scan band sweeping up the body
        float band = smoothstep(0.05, 0.0, abs(vWY - uScanY));
        col += uColor * band * 0.9;
        gl_FragColor = vec4(col, clamp(0.82 + f * 0.18 + band * 0.5, 0.0, 1.0));
      }`,
  })
}

// Concentric scanner-pad rings beneath the figure (slow counter-rotating tech feel).
function ScanFloor({ color, y = -0.92 }) {
  const inner = useRef(), outer = useRef()
  const geos = useMemo(() => [0.34, 0.58, 0.86].map(r => {
    const pts = []
    for (let a = 0; a <= 72; a++) { const t = (a / 72) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)) }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }), [y])
  // a few radial tick spokes on the outer ring
  const spokes = useMemo(() => {
    const pts = []
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * 0.78, y, Math.sin(t) * 0.78), new THREE.Vector3(Math.cos(t) * 0.86, y, Math.sin(t) * 0.86)) }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [y])
  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.15
    if (outer.current) outer.current.rotation.y -= dt * 0.08
  })
  return (
    <group>
      <group ref={inner}>
        {geos.slice(0, 2).map((g, i) => (
          <lineLoop key={i} geometry={g}>
            <lineBasicMaterial color={color} transparent opacity={0.22 - i * 0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
          </lineLoop>
        ))}
      </group>
      <group ref={outer}>
        <lineLoop geometry={geos[2]}>
          <lineBasicMaterial color={color} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineLoop>
        <lineSegments geometry={spokes}>
          <lineBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      </group>
    </group>
  )
}

const CUP_FACTOR = { AA:0.45, A:0.65, B:0.82, C:1, D:1.2, DD:1.4, E:1.55, F:1.7, G:1.85, H:2 }
const cupScale = c => CUP_FACTOR[c] ?? 1

// Body-type half-widths (x, model units). Depth derived per landmark.
const TYPE = {
  female: {
    hourglass: { sh:0.20, ch:0.155, wa:0.110, hip:0.200 },
    pear:      { sh:0.170, ch:0.150, wa:0.120, hip:0.230 },
    apple:     { sh:0.190, ch:0.180, wa:0.180, hip:0.175 },
    rectangle: { sh:0.180, ch:0.160, wa:0.145, hip:0.170 },
  },
  male: {
    hourglass: { sh:0.235, ch:0.200, wa:0.150, hip:0.185 },
    pear:      { sh:0.195, ch:0.175, wa:0.158, hip:0.210 },
    apple:     { sh:0.215, ch:0.200, wa:0.200, hip:0.190 },
    rectangle: { sh:0.210, ch:0.190, wa:0.168, hip:0.180 },
  },
}

// ── Smooth 1-D Catmull-Rom (organic interpolation of profile radii) ──
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t
  return 0.5 * ((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3)
}
const KEYS = ['y', 'a', 'bf', 'bb', 'cx', 'cz']
function sampleProfile(lm, perSeg = 10) {
  const norm = lm.map(s => ({ y:s.y, a:s.a, bf:s.bf ?? s.a, bb:s.bb ?? s.a, cx:s.cx ?? 0, cz:s.cz ?? 0 }))
  const get = (i, k) => norm[Math.max(0, Math.min(norm.length - 1, i))][k]
  const out = []
  for (let i = 0; i < norm.length - 1; i++) {
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg
      const sec = {}
      for (const k of KEYS) sec[k] = cr(get(i-1,k), get(i,k), get(i+1,k), get(i+2,k), t)
      out.push(sec)
    }
  }
  out.push({ ...norm[norm.length - 1] })
  return out
}

// Superellipse ring point (n>2 → fuller/boxier; front/back depths differ).
function ringPoint(s, t, n) {
  const ct = Math.cos(t), st = Math.sin(t)
  const x = s.cx + s.a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n)
  const depth = st >= 0 ? s.bf : s.bb
  const z = s.cz + depth * Math.sign(st) * Math.pow(Math.abs(st), 2 / n)
  return new THREE.Vector3(x, s.y, z)
}

// Append a rounded hemispherical cap to the bottom of a section list.
function withRoundedEnd(sections) {
  const s = sections[sections.length - 1]
  const len = Math.max(s.a, s.bf) * 1.15
  const M = 6
  const caps = []
  for (let m = 1; m <= M; m++) {
    const ang = (m / M) * (Math.PI / 2)
    const k = Math.cos(ang)
    caps.push({ y: s.y - Math.sin(ang) * len, a: s.a*k + 0.001, bf: s.bf*k + 0.001, bb: s.bb*k + 0.001, cx: s.cx, cz: s.cz })
  }
  return sections.concat(caps)
}

// Build surface (triangles) + clean quad wireframe (no diagonals) from sections.
function buildTube(sections, radial = 26, n = 2.2) {
  const rings = sections.map(s => {
    const pts = []
    for (let j = 0; j < radial; j++) pts.push(ringPoint(s, (j / radial) * Math.PI * 2, n))
    return pts
  })
  const surfPos = [], wirePos = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const A = rings[i][j], B = rings[i][j2], C = rings[i+1][j2], D = rings[i+1][j]
      surfPos.push(A.x,A.y,A.z, B.x,B.y,B.z, C.x,C.y,C.z)
      surfPos.push(A.x,A.y,A.z, C.x,C.y,C.z, D.x,D.y,D.z)
      // wireframe every other vertical to keep it readable, all horizontals
      wirePos.push(A.x,A.y,A.z, B.x,B.y,B.z)
      if (j % 2 === 0) wirePos.push(A.x,A.y,A.z, D.x,D.y,D.z)
    }
  }
  const surf = new THREE.BufferGeometry()
  surf.setAttribute('position', new THREE.Float32BufferAttribute(surfPos, 3))
  surf.computeVertexNormals()
  const wire = new THREE.BufferGeometry()
  wire.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3))
  return { surf, wire }
}

function Part({ surf, wire, material, color, wireOpacity = 0.5 }) {
  return (
    <group>
      <mesh geometry={surf} material={material} renderOrder={1} />
      <lineSegments geometry={wire} renderOrder={2}>
        <lineBasicMaterial color={color} transparent opacity={wireOpacity}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function Body({ sex = 'female', bodyType = 'hourglass', measurements = {}, cup, color = '#3FCAA5', autoRotate = true, yaw = 0, still = false, girth = 1 }) {
  const ref = useRef()
  const skin = useMemo(() => makeFresnelMaterial(color), [color])

  useFrame((state, dt) => {
    if (still) { skin.uniforms.uScanY.value = 99; return }   // thumbnails: no animation
    if (autoRotate && ref.current) ref.current.rotation.y += dt * 0.3
    // sweep the scan band from feet → head on a loop (with a brief gap)
    const period = 5.5, span = 1.95
    const p = (state.clock.elapsedTime % period) / period
    skin.uniforms.uScanY.value = p < 0.8 ? -0.97 + (p / 0.8) * span : 99   // park off-screen during the gap
  })

  const parts = useMemo(() => {
    const t = (TYPE[sex] ?? TYPE.female)[bodyType] ?? TYPE.female.hourglass
    const isF = sex === 'female'
    const cf = cupScale(cup)

    const ms = v => (v ? parseFloat(v) : null)
    const wScale = ms(measurements.waist) ? ms(measurements.waist) / 80 : 1
    const hScale = ms(measurements.hips)  ? ms(measurements.hips)  / 95 : 1
    const cScale = ms(measurements.chest) ? ms(measurements.chest) / 90 : 1

    // Weight projection: girth scales the torso, with the waist responding most
    // (where GLP-1 loss shows) and shoulders least.
    const g = girth || 1
    const sh  = t.sh         * (1 + (g - 1) * 0.65)
    const ch  = t.ch * cScale * (1 + (g - 1) * 0.85)
    const wa  = t.wa * wScale * g
    const hip = t.hip * hScale * (1 + (g - 1) * 0.9)
    const breast = isF ? (cf - 0.6) * 0.05 : 0   // extra front depth at the bust

    // ── TORSO (neck → seat), with front/back asymmetry ──
    // The back (bb) from shoulders through hips is derived from shoulder width
    // (sh) — a skeletal reference that barely moves with weight — so it reads
    // as a stable, near-flat plane. The front (bf) is where waist/hip/chest
    // measurements and weight projection actually show: the stomach rounds out
    // while the back stays flat, matching real-world weight distribution.
    // The buttock (seat) is the one exception — a real, naturally rounded
    // feature, so it keeps its own hip-based depth on both sides.
    const torsoLM = [
      { y:0.72, a:0.052, bf:0.052, bb:0.052 },                       // throat
      { y:0.66, a:0.072, bf:0.070, bb:0.066 },                       // neck base
      { y:0.605, a:sh,    bf:sh*0.52, bb:sh*0.50 },                  // shoulders (skeletal, flat)
      { y:0.55, a:sh*0.86, bf:ch*0.60, bb:sh*0.46 },                 // upper chest — flat back
      { y:0.48, a:ch,      bf:ch*0.64 + breast, bb:sh*0.42, cz: breast*0.4 }, // bust — flat back
      { y:0.41, a:ch*0.90, bf:ch*0.50, bb:sh*0.40 },                 // underbust — flat back
      { y:0.32, a:wa,      bf:wa*0.88, bb:sh*0.38 },                 // waist — stomach rounds, back flat
      { y:0.24, a:(wa+hip)/2, bf:(wa+hip)/2*0.86, bb:sh*0.36 },      // belly (stomach) — main round-with-measurements zone
      { y:0.15, a:hip,     bf:hip*0.62, bb:sh*0.40 },                // hips — front follows measurement, back flat
      { y:0.06, a:hip*0.96, bf:hip*0.52, bb:hip*0.72 },             // seat (buttock) — naturally rounded, unchanged
      { y:-0.01, a:hip*0.74, bf:hip*0.5, bb:hip*0.55 },             // crotch
    ]
    const torso = buildTube(sampleProfile(torsoLM, 9), 30, isF ? 2.15 : 2.3)

    // ── LEGS ──
    const legX = hip * 0.45
    const legLM = sign => [
      { y:0.02, a:hip*0.5,  bf:hip*0.5,  bb:hip*0.5,  cx:sign*legX },   // glute/thigh top
      { y:-0.10, a:0.094,   bf:0.10,     bb:0.098,    cx:sign*legX },   // thigh
      { y:-0.26, a:0.072,   bf:0.078,    bb:0.075,    cx:sign*legX*0.95 },
      { y:-0.36, a:0.058,   bf:0.060,    bb:0.058,    cx:sign*legX*0.92 }, // knee
      { y:-0.50, a:0.062,   bf:0.066,    bb:0.070,    cx:sign*legX*0.93 }, // calf
      { y:-0.68, a:0.044,   bf:0.046,    bb:0.046,    cx:sign*legX*0.9 },
      { y:-0.84, a:0.034,   bf:0.038,    bb:0.034,    cx:sign*legX*0.88 }, // ankle
    ]
    const buildLeg = sign => buildTube(withRoundedEnd(sampleProfile(legLM(sign), 7)), 22, 2.1)
    const legL = buildLeg(1), legR = buildLeg(-1)

    // ── ARMS (hang at the sides, rounded hands) ──
    const armX = sh + 0.02
    const armLM = sign => [
      { y:0.60, a:0.060, bf:0.062, bb:0.060, cx:sign*armX },          // deltoid
      { y:0.46, a:0.046, bf:0.048, bb:0.046, cx:sign*(armX+0.02) },   // upper arm
      { y:0.35, a:0.040, bf:0.042, bb:0.040, cx:sign*(armX+0.035) },  // elbow
      { y:0.22, a:0.035, bf:0.037, bb:0.035, cx:sign*(armX+0.05) },   // forearm
      { y:0.10, a:0.030, bf:0.032, bb:0.030, cx:sign*(armX+0.055) },  // wrist
    ]
    const buildArm = sign => buildTube(withRoundedEnd(sampleProfile(armLM(sign), 7)), 18, 2.0)
    const armL = buildArm(1), armR = buildArm(-1)

    return { torso, legL, legR, armL, armR }
  }, [sex, bodyType, cup, girth, measurements.waist, measurements.hips, measurements.chest])

  return (
    <group ref={ref} position={[0, 0.02, 0]} rotation={[0, yaw, 0]}>
      {/* Head — slight egg ellipsoid sitting on the neck */}
      <mesh position={[0, 0.82, 0.005]} scale={[0.098, 0.122, 0.108]} material={skin} renderOrder={1}>
        <sphereGeometry args={[1, 28, 22]} />
      </mesh>
      <lineSegments position={[0, 0.82, 0.005]} scale={[0.098, 0.122, 0.108]} renderOrder={2}>
        <edgesGeometry args={[new THREE.SphereGeometry(1, 16, 12)]} />
        <lineBasicMaterial color={color} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      <Part {...parts.torso} material={skin} color={color} wireOpacity={0.5} />
      <Part {...parts.legL} material={skin} color={color} wireOpacity={0.42} />
      <Part {...parts.legR} material={skin} color={color} wireOpacity={0.42} />
      <Part {...parts.armL} material={skin} color={color} wireOpacity={0.42} />
      <Part {...parts.armR} material={skin} color={color} wireOpacity={0.42} />
    </group>
  )
}

export default function BodyModel3D({ sex, bodyType, measurements, cup, color = '#3FCAA5', view = 'orbit', still = false, dpr = [1, 2], girth = 1 }) {
  // 'front' and 'profile' are fixed, non-interactive camera angles that share the
  // exact same renderer/material as the interactive '3d' / 'orbit' view, so all
  // three Body-Scan tabs look identical in style.
  // `still` = a one-frame static render (no animation loop) for lightweight
  // comparison thumbnails, so several can coexist without burning the GPU.
  const interactive = (view === 'orbit' || view === '3d') && !still
  const yaw = view === 'profile' ? -Math.PI / 2 : 0

  return (
    <Canvas
      frameloop={still ? 'demand' : 'always'}
      camera={{ position: [0, 0.05, 2.5], fov: 42 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true }}
      style={{ background: still ? 'transparent' : 'radial-gradient(circle at 50% 34%, #103a2e 0%, #08201a 52%, #03110c 100%)' }}
    >
      <fog attach="fog" args={['#06201a', 2.6, 5.2]} />
      <ambientLight intensity={0.45} />
      {/* key + cyan rim lights feed the fresnel edge glow */}
      <directionalLight position={[2.5, 4, 4]} intensity={1.1} color="#bafce9" />
      <directionalLight position={[-3, 1.5, -3]} intensity={0.8} color={color} />
      <pointLight position={[0, 0.4, 2]} intensity={0.4} color={color} />

      <Body sex={sex} bodyType={bodyType} measurements={measurements} cup={cup} color={color}
        autoRotate={interactive} yaw={yaw} still={still} girth={girth} />
      <ScanFloor color={color} />
      <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={3.2} blur={2.6} far={1.6} color="#03140f" />

      {interactive && (
        <OrbitControls enablePan={false} minDistance={1.5} maxDistance={4} target={[0, 0.02, 0]} />
      )}
    </Canvas>
  )
}

// Renders one frame, grabs it as a PNG, then frees the WebGL context. Lets us
// show several "3-D" thumbnails as static images without keeping live canvases.
function CaptureOnce({ onCapture }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let raf, tries = 0
    const attempt = () => {
      const el = gl.domElement
      if (el.width > 20 && el.height > 20) {
        try { gl.render(scene, camera); onCapture(el.toDataURL('image/png')) }
        catch { onCapture(null) }
        return
      }
      if (tries++ < 40) raf = requestAnimationFrame(attempt)
      else onCapture(null)
    }
    raf = requestAnimationFrame(attempt)
    return () => cancelAnimationFrame(raf)
  }, [gl, scene, camera, onCapture])
  return null
}

export function BodyThumbnail({ sex, bodyType, measurements, cup, color = '#3FCAA5' }) {
  const [img, setImg] = useState(null)
  if (img) return <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0.05, 2.5], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 4, 4]} intensity={1.1} color="#bafce9" />
      <directionalLight position={[-3, 1.5, -3]} intensity={0.8} color={color} />
      <Body sex={sex} bodyType={bodyType} measurements={measurements} cup={cup} color={color} autoRotate={false} yaw={0} still />
      <ScanFloor color={color} />
      <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={3.2} blur={2.6} far={1.6} color="#03140f" />
      <CaptureOnce onCapture={setImg} />
    </Canvas>
  )
}
