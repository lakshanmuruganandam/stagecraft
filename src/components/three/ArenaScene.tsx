"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Sparkles } from "@react-three/drei";

export type ArenaHouse = { slug: string; name: string; color: string; points: number };

export type Palette = {
  fog: string;
  ground: string;
  grid: string;
  stage: string;
  rim: string;
  tree: string;
  trunk: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sun: string;
  sunIntensity: number;
  beam: string;
  beamOpacity: number;
  glow: number;
  firefly: string;
};

export const PALETTES: Record<"daylight" | "stage", Palette> = {
  daylight: {
    fog: "#ffd9b8",
    ground: "#f3dfc2",
    grid: "#b8875a",
    stage: "#fff4e3",
    rim: "#e0a14a",
    tree: "#7f9a58",
    trunk: "#8a6142",
    hemiSky: "#fff3df",
    hemiGround: "#d6a77a",
    hemiIntensity: 1.5,
    sun: "#ffc98a",
    sunIntensity: 2.6,
    beam: "#fff1c8",
    beamOpacity: 0.45,
    glow: 0.55,
    firefly: "#ffb347",
  },
  stage: {
    fog: "#1b1530",
    ground: "#1e1a2a",
    grid: "#8d7bd6",
    stage: "#2a2438",
    rim: "#ffb547",
    tree: "#22392c",
    trunk: "#2b2020",
    hemiSky: "#6e78c8",
    hemiGround: "#1a1222",
    hemiIntensity: 0.55,
    sun: "#a9b8ff",
    sunIntensity: 0.9,
    beam: "#ffe2a6",
    beamOpacity: 0.55,
    glow: 1.15,
    firefly: "#ffd36e",
  },
};

const RING_R = 7;
const MIN_H = 0.7;
const MAX_H = 5.4;
const GROW_S = 1.5;
const STEP = 0.48; // radians between neighbouring ranks (~27.5°)

type SceneProps = {
  houses: ArenaHouse[];
  palette: Palette;
  reducedMotion: boolean;
  controls: boolean;
  onSelect: (slug: string) => void;
};

/* ------------------------------------------------------------------ helpers */

/** Deterministic PRNG so the forest is identical on every render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOutBack = (x: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Rank 0 at the back (facing the camera across the stage), then alternating left / right round the ring. */
function slotAngle(rank: number) {
  const k = Math.ceil(rank / 2) * (rank % 2 ? 1 : -1);
  return -Math.PI / 2 + k * STEP;
}

/* ------------------------------------------------------------ beam shader */

const beamVert = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    float facing = pow(abs(dot(vN, vV)), 1.6);
    float along = pow(vUv.y, 1.3);
    gl_FragColor = vec4(uColor, uOpacity * facing * along);
  }`;

/** Additive "volumetric" cone material. Uniforms are set declaratively via pierced props. */
function BeamMaterial({ color, opacity }: { color: string; opacity: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } }), []);
  return (
    <shaderMaterial
      uniforms={uniforms}
      uniforms-uColor-value={color}
      uniforms-uOpacity-value={opacity}
      vertexShader={beamVert}
      fragmentShader={beamFrag}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      blending={THREE.AdditiveBlending}
    />
  );
}

const glowVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const glowFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5)) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2) * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }`;

/** Soft radial floor glow under each pillar. */
function GlowMaterial({ color, opacity }: { color: string; opacity: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } }), []);
  return (
    <shaderMaterial
      uniforms={uniforms}
      uniforms-uColor-value={color}
      uniforms-uOpacity-value={opacity}
      vertexShader={glowVert}
      fragmentShader={glowFrag}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
    />
  );
}

/** Module-level scratch objects for per-frame maths (never allocated in the loop). */
const SCRATCH = { dir: new THREE.Vector3(), target: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0) };

/* ------------------------------------------------------------- the scene */

export default function ArenaScene({ houses, palette, reducedMotion, controls, onSelect }: SceneProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Once every mesh has mounted, compile all shader programs while idle so the
  // first on-screen frame (often mid-scroll) doesn't stall.
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const id = requestAnimationFrame(() => gl.compile(scene, camera));
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, houses.length]);
  const ranked = useMemo(() => [...houses].sort((a, b) => b.points - a.points), [houses]);
  const max = Math.max(1, ...ranked.map((h) => h.points));

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <>
      <fog attach="fog" args={[palette.fog, 20, 58]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <directionalLight
        position={[-9, 7, 7]}
        intensity={palette.sunIntensity}
        color={palette.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[8, 5, -6]} intensity={palette.sunIntensity * 0.25} color="#ffb4c8" />

      <Ground palette={palette} />
      <Forest palette={palette} />
      <SweepingBeams palette={palette} reducedMotion={reducedMotion} />

      {ranked.map((h, rank) => (
        <Pillar
          key={h.slug}
          house={h}
          rank={rank}
          height={MIN_H + (MAX_H - MIN_H) * (h.points / max)}
          palette={palette}
          reducedMotion={reducedMotion}
          hovered={hovered === h.slug}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}

      <Sparkles count={70} scale={[22, 7, 22]} position={[0, 3.5, 0]} size={4} speed={reducedMotion ? 0 : 0.35} noise={1.2} opacity={0.9} color={palette.firefly} />
      <Sparkles count={110} scale={[26, 9, 26]} position={[0, 4, 0]} size={1.4} speed={reducedMotion ? 0 : 0.12} opacity={0.55} color="#fff6e0" />

      <OrbitControls
        enabled={controls}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        minPolarAngle={0.95}
        maxPolarAngle={1.32}
        autoRotate={!reducedMotion && !hovered}
        autoRotateSpeed={0.45}
        target={[0, 3.3, 0]}
      />
    </>
  );
}

/* -------------------------------------------------------------- ground */

function Ground({ palette }: { palette: Palette }) {
  const grid = useMemo(() => {
    const pts: number[] = [];
    const seg = 96;
    for (let r = 2.5; r <= 16; r += 1.5) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;
        pts.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
      }
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6, Math.cos(a) * 16, 0, Math.sin(a) * 16);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[34, 72]} />
        <meshStandardMaterial color={palette.ground} roughness={0.95} />
      </mesh>
      <lineSegments geometry={grid} position-y={0.012}>
        <lineBasicMaterial color={palette.grid} transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
      {/* Stage platform with a warm brass rim */}
      <mesh position-y={0.18} receiveShadow castShadow>
        <cylinderGeometry args={[4.4, 4.6, 0.36, 64]} />
        <meshStandardMaterial color={palette.stage} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position-y={0.37} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[4.4, 0.06, 8, 96]} />
        <meshStandardMaterial color={palette.rim} emissive={palette.rim} emissiveIntensity={0.6} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position-y={0.365} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.2, 1.28, 64]} />
        <meshBasicMaterial color={palette.rim} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------- forest */

function Forest({ palette }: { palette: Palette }) {
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const COUNT = 84;

  const layout = useMemo(() => {
    const rnd = mulberry32(42);
    return Array.from({ length: COUNT }, () => {
      const a = rnd() * Math.PI * 2;
      const r = 23 + rnd() * 12;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.8 + rnd() * 1.1, tint: rnd() };
    });
  }, []);

  useEffect(() => {
    const c = crowns.current;
    const t = trunks.current;
    if (!c || !t) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const base = new THREE.Color(palette.tree);
    const col = new THREE.Color();
    layout.forEach((tr, i) => {
      m.compose(new THREE.Vector3(tr.x, 0.7 * tr.s + 1.6 * tr.s, tr.z), q, new THREE.Vector3(tr.s, tr.s, tr.s));
      c.setMatrixAt(i, m);
      col.copy(base).offsetHSL((tr.tint - 0.5) * 0.06, 0, (tr.tint - 0.5) * 0.12);
      c.setColorAt(i, col);
      m.compose(new THREE.Vector3(tr.x, 0.35 * tr.s, tr.z), q, new THREE.Vector3(tr.s, tr.s, tr.s));
      t.setMatrixAt(i, m);
    });
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    t.instanceMatrix.needsUpdate = true;
  }, [layout, palette.tree]);

  return (
    <group>
      <instancedMesh ref={crowns} args={[undefined, undefined, COUNT]}>
        <coneGeometry args={[1.1, 3.2, 7]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, COUNT]}>
        <cylinderGeometry args={[0.12, 0.16, 0.7, 5]} />
        <meshStandardMaterial color={palette.trunk} roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------- sweeping beams */

function Beam({ palette, phase, radius, reducedMotion }: { palette: Palette; phase: number; radius: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.12, 2.3, 15, 40, 1, true).translate(0, -7.5, 0), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const apex = useMemo(() => new THREE.Vector3(Math.cos(phase) * radius, 13, Math.sin(phase) * radius), [phase, radius]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = reducedMotion ? 0 : clock.elapsedTime * 0.22;
    SCRATCH.target.set(Math.cos(t + phase * 1.7) * 4.5, 0, Math.sin(t * 0.8 + phase) * 4.5);
    SCRATCH.dir.subVectors(SCRATCH.target, apex).normalize();
    m.quaternion.setFromUnitVectors(SCRATCH.down, SCRATCH.dir);
  });

  return (
    <mesh ref={ref} geometry={geo} position={apex} renderOrder={2}>
      <BeamMaterial color={palette.beam} opacity={palette.beamOpacity * 0.55} />
    </mesh>
  );
}

function SweepingBeams({ palette, reducedMotion }: { palette: Palette; reducedMotion: boolean }) {
  return (
    <>
      {[0.4, 2.5, 4.4].map((p) => (
        <Beam key={p} phase={p} radius={11} palette={palette} reducedMotion={reducedMotion} />
      ))}
    </>
  );
}

/* --------------------------------------------------------------- pillar */

type PillarProps = {
  house: ArenaHouse;
  rank: number;
  height: number;
  palette: Palette;
  reducedMotion: boolean;
  hovered: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
};

function Pillar({ house, rank, height, palette, reducedMotion, hovered, onHover, onSelect }: PillarProps) {
  const invalidate = useThree((s) => s.invalidate);
  const shaft = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const flag = useRef<THREE.Mesh>(null);
  const anim = useRef({ t: 0, shown: reducedMotion ? height : 0 });
  const leader = rank === 0;

  const angle = slotAngle(rank);
  const pos: [number, number, number] = [Math.cos(angle) * RING_R, 0, Math.sin(angle) * RING_R];

  useEffect(() => invalidate(), [hovered, palette.glow, invalidate]);

  const emissive = (hovered ? 0.9 : 0.4) * palette.glow;
  const glass = (
    <meshPhysicalMaterial
      color={house.color}
      emissive={house.color}
      emissiveIntensity={emissive}
      roughness={0.12}
      metalness={0.05}
      clearcoat={1}
      clearcoatRoughness={0.08}
      transparent
      opacity={0.82}
    />
  );

  // Pennant: tapered plane whose free edge ripples.
  const flagGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.9, 0.5, 12, 3);
    g.translate(0.45, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - (p.getX(i) / 0.9) * 0.85));
    g.userData.base = Float32Array.from(p.array as Float32Array);
    return g;
  }, []);
  useEffect(() => () => flagGeo.dispose(), [flagGeo]);

  useEffect(() => {
    if (reducedMotion) {
      anim.current.shown = height;
      invalidate();
    }
  }, [height, reducedMotion, invalidate]);

  useFrame(({ clock }, delta) => {
    const a = anim.current;
    const dt = Math.min(delta, 0.05);
    if (reducedMotion) {
      a.shown = height;
    } else {
      a.t += dt;
      const local = (a.t - 0.25 - rank * 0.09) / GROW_S;
      if (local < 1) a.shown = height * easeOutBack(Math.max(0, Math.min(1, local)));
      else a.shown += (height - a.shown) * (1 - Math.exp(-4 * dt));
    }
    const h = Math.max(0.001, a.shown);
    if (shaft.current) shaft.current.scale.y = h;
    if (top.current) top.current.position.y = h + 0.25;

    if (flag.current && !reducedMotion) {
      const g = flag.current.geometry;
      const p = g.attributes.position;
      const base = g.userData.base as Float32Array;
      const t = clock.elapsedTime * 5 + rank;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.setZ(i, Math.sin(x * 6 - t) * 0.11 * x + Math.sin(x * 3.1 - t * 0.6) * 0.04 * x);
      }
      p.needsUpdate = true;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(house.slug);
  };
  const out = () => onHover(null);
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // was a drag, not a click
    e.stopPropagation();
    onSelect(house.slug);
  };

  return (
    <group position={pos} scale={hovered ? 1.05 : 1}>
      {/* plinth */}
      <mesh position-y={0.14} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.9, 0.28, 6]} />
        <meshStandardMaterial color={palette.stage} roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <planeGeometry args={[4, 4]} />
        <GlowMaterial color={house.color} opacity={(hovered ? 1 : 0.6) * palette.glow} />
      </mesh>

      <group position-y={0.28}>
        <group ref={shaft} scale-y={0.001}>
          <mesh position-y={0.5} castShadow onPointerOver={over} onPointerOut={out} onClick={click}>
            <cylinderGeometry args={[0.44, 0.52, 1, 6]} />
            {glass}
          </mesh>
          <mesh position-y={0.5}>
            <cylinderGeometry args={[0.17, 0.2, 1, 6]} />
            <meshBasicMaterial color={house.color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>

        <group ref={top}>
          {/* faceted crystal tip */}
          <mesh position-y={0.1} castShadow onPointerOver={over} onPointerOut={out} onClick={click}>
            <coneGeometry args={[0.44, 0.7, 6]} />
            {glass}
          </mesh>
          {/* pole + pennant */}
          <mesh position-y={0.75}>
            <cylinderGeometry args={[0.018, 0.018, 0.9, 6]} />
            <meshStandardMaterial color={palette.rim} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh ref={flag} geometry={flagGeo} position={[0.02, 1.0, 0]} rotation-y={-angle + Math.PI / 2}>
            <meshStandardMaterial color={house.color} emissive={house.color} emissiveIntensity={0.2} side={THREE.DoubleSide} flatShading roughness={0.7} />
          </mesh>

          {leader && <Crown palette={palette} reducedMotion={reducedMotion} />}

          {hovered && (
            <Html position={[0, 2.6, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
              <div className="min-w-36 rounded-xl border border-white/10 bg-ink-900/90 px-3 py-2 text-center shadow-lg backdrop-blur">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: house.color }} />
                  <span className="whitespace-nowrap font-display text-sm font-semibold text-white">{house.name}</span>
                </div>
                <div className="mt-0.5 whitespace-nowrap text-xs text-ink-300">
                  <span className="timecode">{house.points.toLocaleString()}</span> pts · rank #{rank + 1}
                </div>
              </div>
            </Html>
          )}
        </group>
      </group>

      {leader && <LeaderBeam palette={palette} />}
    </group>
  );
}

/* --------------------------------------------------------------- leader */

function Crown({ palette, reducedMotion }: { palette: Palette; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || reducedMotion) return;
    g.rotation.y = clock.elapsedTime * 0.8;
    g.position.y = 1.75 + Math.sin(clock.elapsedTime * 1.8) * 0.1;
  });
  const gold = "#ffc84a";
  return (
    <group ref={ref} position-y={1.75} scale={1.6}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.42, 0.045, 10, 48]} />
        <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.9 * palette.glow + 0.3} metalness={0.8} roughness={0.25} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.42, 0.16, Math.sin(a) * 0.42]}>
            <coneGeometry args={[0.07, 0.3, 5]} />
            <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.8 * palette.glow + 0.3} metalness={0.8} roughness={0.25} />
          </mesh>
        );
      })}
      {/* halo glow */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.55, 0.85, 48]} />
        <meshBasicMaterial color={gold} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function LeaderBeam({ palette }: { palette: Palette }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.1, 1.5, 14, 40, 1, true).translate(0, -7, 0), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <>
      <mesh geometry={geo} position-y={14} renderOrder={3}>
        <BeamMaterial color={palette.beam} opacity={palette.beamOpacity} />
      </mesh>
      <pointLight position={[0, 3, 1.2]} color={palette.beam} intensity={6} distance={9} decay={1.6} />
    </>
  );
}
