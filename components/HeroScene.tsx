"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import * as THREE from "three";

const PURPLE = new THREE.Color("#9945ff");
const GREEN = new THREE.Color("#14f195");
const PARTICLE_COUNT = 1800; // mid layer (capped for performance)

// Deterministic pseudo-random in [0,1) from a seed — pure (no Math.random),
// so positions are stable across renders and React-Compiler-safe.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Soft radial glow texture for the nebulae. Built once, lazily, on the client
// (this module is only imported client-side via a dynamic ssr:false import).
let glowTex: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.5)");
  g.addColorStop(0.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(canvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Mid-layer field of Solana-tinted points that slowly rotates. */
function ParticleField() {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 4 + rand(i + 0.11) * 9;
      const theta = rand(i + 0.23) * Math.PI * 2;
      const phi = Math.acos(2 * rand(i + 0.37) - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);
      c.copy(PURPLE).lerp(GREEN, rand(i + 0.53));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.04;
    ref.current.rotation.x += delta * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Shards() {
  const shards = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        position: [
          (rand(i + 1.1) - 0.5) * 11,
          (rand(i + 2.2) - 0.5) * 5.5,
          (rand(i + 3.3) - 0.5) * 6 - 2,
        ] as [number, number, number],
        rotation: [rand(i + 4.4) * Math.PI, rand(i + 5.5) * Math.PI, 0] as [
          number,
          number,
          number,
        ],
        scale: 0.16 + rand(i + 6.6) * 0.36,
        color: rand(i + 7.7) > 0.5 ? "#9945ff" : "#14f195",
        speed: 1 + rand(i + 8.8) * 2,
      })),
    [],
  );

  return (
    <>
      {shards.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={1.2} floatIntensity={1.6}>
          <mesh position={s.position} rotation={s.rotation} scale={s.scale}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={s.color}
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/** A large, soft, slowly breathing glow cloud deep in the scene. */
function Nebula({
  position,
  color,
  size,
  opacity,
  speed,
  phase,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => getGlowTexture(), []);

  useFrame((state) => {
    const sprite = ref.current;
    if (!sprite) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * speed + phase) * 0.09;
    sprite.scale.set(size * pulse, size * pulse, 1);
    sprite.position.x = position[0] + Math.sin(t * speed * 0.4 + phase) * 0.8;
    sprite.position.y = position[1] + Math.cos(t * speed * 0.3 + phase) * 0.5;
    (sprite.material as THREE.SpriteMaterial).opacity =
      opacity * (0.72 + 0.28 * Math.sin(t * speed + phase));
  });

  return (
    <sprite ref={ref} position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/** Gentle parallax — the camera drifts, so near layers shift more than far. */
function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.1) * 0.9;
    state.camera.position.y = Math.cos(t * 0.13) * 0.6;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  // Pause rendering when the tab is hidden; respect reduced motion.
  const [hidden, setHidden] = useState(false);
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const frameloop = reduced ? "demand" : hidden ? "never" : "always";

  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: [0, 0, 7], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#000003", 1)}
    >
      {/* Dark depth fog — far layers dissolve into the black of space. */}
      <fog attach="fog" args={["#000003", 9, 28]} />

      {/* Deep nebulae (volumetric glow). */}
      <Nebula position={[-6.5, 1.5, -9]} color="#9945ff" size={20} opacity={0.16} speed={0.18} phase={0} />
      <Nebula position={[7, -3, -11]} color="#14f195" size={24} opacity={0.15} speed={0.14} phase={2.1} />
      <Nebula position={[1, 5, -13]} color="#03e1ff" size={16} opacity={0.1} speed={0.2} phase={4.2} />

      {/* Star fields — far (dense, faint) + near (sparser, brighter), both twinkle. */}
      <Stars radius={120} depth={60} count={6000} factor={3.5} saturation={0} fade speed={1} />
      <Stars radius={55} depth={30} count={1500} factor={6} saturation={0} fade speed={1.6} />

      {/* Mid layer: Solana particles + floating shards. */}
      <ParticleField />
      <Shards />

      <CameraDrift />

      {/* Bloom so bright points and nebulae glow with a soft halo. */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.32}
          mipmapBlur
          kernelSize={KernelSize.LARGE}
        />
      </EffectComposer>
    </Canvas>
  );
}
