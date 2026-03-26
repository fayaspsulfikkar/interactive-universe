/**
 * OuterBodies.jsx — Kuiper Belt + Oort Cloud
 *
 * Scale reference: 1 AU = 1500 scene units
 *   Neptune orbit: 30.07 AU = ~45,105 units
 *   Kuiper Belt: 30–50 AU = 45,000–75,000 units
 *   Oort Cloud:  2,000–50,000 AU (compressed to 150,000–800,000 units for explorable scale)
 *
 * Both use InstancedMesh for performance (thousands of objects, single draw call).
 * Opacity fades in/out based on camera distance using useFrame.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AU = 1500.0; // scene units per AU

// ── Kuiper Belt ────────────────────────────────────────────────────────────────
// Flat disc of icy bodies from ~30 AU to 55 AU, thin in Y
const KBO_COUNT = 3000;

export function KuiperBelt() {
  const meshRef = useRef();
  const { camera } = useThree();

  const [positions, scales] = useMemo(() => {
    const dummy = new THREE.Object3D();
    const positions = [];
    const scales = [];

    for (let i = 0; i < KBO_COUNT; i++) {
      // Radius in scene units: 30–55 AU, favouring the main classical belt (42–48 AU)
      const r = (28 + Math.pow(Math.random(), 0.6) * 27) * AU;
      const angle = Math.random() * Math.PI * 2;
      // Very thin disc: ±0.8 AU Y scatter (resonant objects cluster near the ecliptic)
      const y = (Math.random() - 0.5) * 1.5 * AU;

      positions.push(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );
      // Object size varies: most small, a few "plutino" sized
      scales.push(0.6 + Math.random() * Math.random() * 3.5);
    }
    return [positions, scales];
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < KBO_COUNT; i++) {
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const s = scales[i];
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, scales]);

  useFrame(() => {
    if (!meshRef.current) return;
    // Fade in as camera pulls back beyond Neptune's orbit
    const dist = camera.position.length();
    const neptuneOrbit = 30.07 * AU;
    const fadeStart = neptuneOrbit * 0.4;
    const fadeEnd   = neptuneOrbit * 1.5;
    const opacity   = Math.max(0, Math.min(0.55, (dist - fadeStart) / (fadeEnd - fadeStart) * 0.55));
    if (meshRef.current.material) {
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, KBO_COUNT]}
      renderOrder={-5}
    >
      <sphereGeometry args={[1.8, 4, 4]} />
      <meshBasicMaterial
        color="#96b8d4"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ── Asteroid Belt ──────────────────────────────────────────────────────────────
// Between Mars (1.52 AU) and Jupiter (5.20 AU) — concentrated at 2.2–3.2 AU
const ASTEROID_COUNT = 2000;

export function AsteroidBelt() {
  const meshRef = useRef();
  const { camera } = useThree();

  const [positions, scales] = useMemo(() => {
    const positions = [];
    const scales = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const r = (2.2 + Math.random() * 1.2) * AU;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.3 * AU;
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
      scales.push(0.3 + Math.random() * 0.8);
    }
    return [positions, scales];
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const s = scales[i];
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, scales]);

  useFrame(() => {
    if (!meshRef.current) return;
    const dist = camera.position.length();
    // Visible at medium zoom levels
    const opacity = Math.max(0, Math.min(0.35, (dist - 1000) / 8000 * 0.35));
    if (meshRef.current.material) {
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, ASTEROID_COUNT]}
      renderOrder={-4}
    >
      <sphereGeometry args={[1.2, 4, 4]} />
      <meshBasicMaterial
        color="#b09870"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ── Oort Cloud ─────────────────────────────────────────────────────────────────
// True spherical shell. Real Oort is 2,000–100,000 AU.
// Compressed log-scale: mapped to 300,000–1,200,000 scene units
// (still enormous but traversable with camera)
const OORT_COUNT = 8000;
const OORT_INNER = 280000;
const OORT_OUTER = 1100000;

export function OortCloud() {
  const meshRef = useRef();
  const { camera } = useThree();

  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < OORT_COUNT; i++) {
      // Uniform spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      // Slight concentration toward inner edge (hills cloud → outer cloud gradient)
      const r     = OORT_INNER + Math.pow(Math.random(), 1.4) * (OORT_OUTER - OORT_INNER);
      pos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    return pos;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < OORT_COUNT; i++) {
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const s = 80 + Math.random() * 120; // much larger since they're so far
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useFrame(() => {
    if (!meshRef.current) return;
    // Only become visible when truly zoomed way out
    const dist = camera.position.length();
    const fadeStart = 60000;
    const fadeEnd   = 220000;
    const opacity   = Math.max(0, Math.min(0.22, (dist - fadeStart) / (fadeEnd - fadeStart) * 0.22));
    if (meshRef.current.material) {
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, OORT_COUNT]}
      renderOrder={-6}
    >
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color="#cce4ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
