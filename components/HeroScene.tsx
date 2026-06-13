"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

const PURPLE = new THREE.Color("#9945ff");
const GREEN = new THREE.Color("#14f195");
const PARTICLE_COUNT = 2500; // capped for performance

// Deterministic pseudo-random in [0,1) from a seed — pure (no Math.random),
// so positions are stable across renders and React-Compiler-safe.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

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

function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.1) * 0.6;
    state.camera.position.y = Math.cos(t * 0.13) * 0.4;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#000000", 1)}
    >
      <ParticleField />
      <Shards />
      <CameraDrift />
    </Canvas>
  );
}
