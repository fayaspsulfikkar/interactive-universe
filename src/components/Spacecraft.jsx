/**
 * Spacecraft.jsx — Renders human-made space objects as interactive, animated glowing points
 *
 * Each spacecraft:
 * - Orbits its parent planet (earth/moon/mars) tracking that planet's live world position
 * - Shows a subtle orbit path ring when hovered or selected
 * - Glows as a colored sprite for visibility at solar-system zoom
 * - Shows a hover label (HTML overlay)
 * - Fires onSelectObject(id) when clicked
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SPACECRAFT_DATA } from './SpacecraftData';
import { simClock } from '../simClock';

// Map from planet name → shared ref that SpacecraftLayer provides
// (populated by <PlanetTracker> in Scene.jsx or passed via context)
import { usePlanetPositions } from './PlanetPositionContext';

const TWO_PI = Math.PI * 2;

// ── Orbit circle helper ─────────────────────────────────────────────────────
function buildOrbitCircle(radius, inclinationY = 0, segments = 64) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TWO_PI;
    pts.push(new THREE.Vector3(
      Math.cos(a) * radius,
      Math.sin(a) * radius * Math.sin(inclinationY),
      Math.sin(a) * radius * Math.cos(inclinationY)
    ));
  }
  return pts;
}

// ── Single Spacecraft ───────────────────────────────────────────────────────
function SpacecraftNode({ craft, onSelectObject, selectedObject, globalSelected }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const planetPositions = usePlanetPositions();

  const isSelected = selectedObject === craft.id;
  const somethingSelected = !!globalSelected;

  // Pre-build orbit circle for ring display
  const orbitLine = useMemo(() => {
    if (!craft.orbitRadius) return null;
    return buildOrbitCircle(craft.orbitRadius, craft.inclinationY || 0);
  }, [craft.orbitRadius, craft.inclinationY]);

  useFrame(() => {
    if (!groupRef.current) return;

    const t = simClock.simTime;
    let worldPos = new THREE.Vector3();

    if (craft.type === 'probe') {
      // Static deep-space position
      worldPos.fromArray(craft.position);
    } else {
      // Get parent planet's current world position
      const parentPos = planetPositions[craft.parent];
      if (!parentPos) return;
      worldPos.copy(parentPos);

      if (craft.type === 'l2') {
        // L2: behind Earth from Sun perspective — offset away from origin
        const dir = parentPos.clone().normalize();
        worldPos.addScaledVector(dir, craft.l2Offset);
      } else if (craft.type === 'mars_surface') {
        const off = craft.surfaceOffset;
        worldPos.add(new THREE.Vector3(off[0], off[1], off[2]));
      } else if (craft.orbitRadius) {
        // Circular orbit around parent
        const speed = TWO_PI / craft.orbitPeriod;
        const angle = (craft.initialAngle || 0) + t * speed;
        const inc = craft.inclinationY || 0;
        worldPos.add(new THREE.Vector3(
          Math.cos(angle) * craft.orbitRadius,
          Math.sin(angle) * craft.orbitRadius * Math.sin(inc),
          Math.sin(angle) * craft.orbitRadius * Math.cos(inc)
        ));
      }
    }

    groupRef.current.position.copy(worldPos);

    // Scale/opacity based on camera distance for LOD
    if (meshRef.current) {
      const opacity = somethingSelected && !isSelected ? 0.3 : (hovered ? 1.0 : 0.75);
      if (meshRef.current.material) meshRef.current.material.opacity = opacity;
    }
  });

  const color = craft.color;

  return (
    <group ref={groupRef}>
      {/* Glowing billboard sprite */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onSelectObject(craft.id); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
        >
          <circleGeometry args={[craft.size * (isSelected ? 1.6 : 1), 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.75}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Outer glow ring */}
        <mesh>
          <ringGeometry args={[craft.size * 1.5, craft.size * 2.5, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.5 : 0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>

      {/* Hover / selected label */}
      {(hovered || isSelected) && (
        <Html
          center
          distanceFactor={180}
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: color,
            textShadow: `0 0 12px ${color}`,
            transform: 'translateY(-20px)',
            fontFamily: 'monospace',
          }}
        >
          {craft.name}
        </Html>
      )}

      {/* Orbit path – only when hovered or selected */}
      {(hovered || isSelected) && orbitLine && (
        <group position={(() => {
          // Move orbit ring to parent center, not craft position
          const parentPos = planetPositions[craft.parent];
          if (!parentPos || !groupRef.current) return [0, 0, 0];
          const gp = groupRef.current.position;
          return [parentPos.x - gp.x, parentPos.y - gp.y, parentPos.z - gp.z];
        })()}>
          <Line
            points={orbitLine}
            color={color}
            lineWidth={0.8}
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </group>
      )}
    </group>
  );
}

// ── Spacecraft Layer ────────────────────────────────────────────────────────
export default function SpacecraftLayer({ onSelectObject, selectedObject }) {
  return (
    <>
      {SPACECRAFT_DATA.map(craft => (
        <SpacecraftNode
          key={craft.id}
          craft={craft}
          onSelectObject={onSelectObject}
          selectedObject={selectedObject}
          globalSelected={selectedObject}
        />
      ))}
    </>
  );
}
