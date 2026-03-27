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
import { Line, Billboard, Html, useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { SPACECRAFT_DATA } from './SpacecraftData';
import { simClock } from '../simClock';

// Map from planet name → shared ref that SpacecraftLayer provides
// (populated by <PlanetTracker> in Scene.jsx or passed via context)
import { usePlanetPositions } from './PlanetPositionContext';
import { PLANET_DATA } from './planetData';

const TWO_PI = Math.PI * 2;

// ── Fading Orbit Trail Helper ───────────────────────────────────────────────
function buildFadingOrbitCircle(radius, colorHex, segments = 64) {
  const pts = [];
  const colors = [];
  const baseColor = new THREE.Color(colorHex);
  
  for (let i = 0; i <= segments; i++) {
    // Generate a flat circle in the XZ plane
    const a = (i / segments) * TWO_PI;
    pts.push(new THREE.Vector3(
      Math.cos(a) * radius,
      0,
      Math.sin(a) * radius
    ));
    
    // Fade from alpha 0 (tail) to alpha 1 (head)
    // We map 0 -> segments. We want the head at the end of the array (i=segments).
    const fade = Math.pow(i / segments, 2.0); // Ease-in curve for a smoother tail
    const c = baseColor.clone().multiplyScalar(fade);
    colors.push([c.r, c.g, c.b]);
  }
  return { pts, colors };
}

// ── Spacecraft 3D GLTF Loader ───────────────────────────────────────────────
function SpacecraftModel({ url, scale, isSelected, hovered, color }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  useFrame((state, delta) => {
    if (modelRef.current) {
      // Slow realistic idle rotation
      modelRef.current.rotation.y -= delta * 0.15;
      modelRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <group ref={modelRef} scale={scale * (isSelected ? 1.6 : 1.0)}>
      <Clone object={scene} castShadow receiveShadow inject={<meshStandardMaterial roughness={0.3} metalness={0.6} />} />
      {/* Emissive glow when hovered/selected to highlight it in the dark */}
      {(hovered || isSelected) && (
        <pointLight distance={scale * 50} intensity={1.5} color={color} />
      )}
    </group>
  );
}

// ── Single Spacecraft Node ──────────────────────────────────────────────────
function SpacecraftNode({ craft, onSelectObject, selectedObject, globalSelected }) {
  const groupRef = useRef();
  const orbitCenterRef = useRef();
  const meshRef = useRef();
  const orbitGroupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const planetPositions = usePlanetPositions();

  const isSelected = selectedObject === craft.id;
  const somethingSelected = !!globalSelected;
  
  // Show orbit only when the spacecraft's host planet is the currently selected object
  const showOrbit = globalSelected === craft.parent;

  // Pre-build fading orbit ring
  const orbitData = useMemo(() => {
    if (!craft.orbitRadius) return null;
    return buildFadingOrbitCircle(craft.orbitRadius, craft.color || '#ffffff');
  }, [craft.orbitRadius, craft.color]);

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
      
      // Live-sync the base of the orbit ring exactly to the parent planet center
      if (orbitCenterRef.current) {
        orbitCenterRef.current.position.copy(parentPos);
      }
      
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
        // Apply an artificial cinematic slowdown factor (50x) 
        // to prevent LEO satellites from blurring at the global 10,000x time dilation
        const CINEMATIC_SLOWDOWN = 50.0;
        const speed = TWO_PI / (craft.orbitPeriod * CINEMATIC_SLOWDOWN);
        const angle = (craft.initialAngle || 0) + t * speed;
        const inc = craft.inclinationY || 0;
        worldPos.add(new THREE.Vector3(
          Math.cos(angle) * craft.orbitRadius,
          Math.sin(angle) * craft.orbitRadius * Math.sin(inc),
          Math.sin(angle) * craft.orbitRadius * Math.cos(inc)
        ));
        
        // Sync the fading tail's rotation to perfectly match the current orbit angle
        if (orbitGroupRef.current) {
          // Three.js Y-rotation resolves to -sin for Z. Our parametric maps +sin.
          // By applying -angle, the head of the tail perfectly kisses the craft position.
          orbitGroupRef.current.rotation.y = -angle;
        }
      }
    }

    groupRef.current.position.copy(worldPos);
    
    // Register the craft in the global PLANET_DATA so Scene.jsx's InteractiveRig can camera-track it
    if (!PLANET_DATA[craft.id]) {
      PLANET_DATA[craft.id] = {
        scale: [craft.size * 2, craft.size * 2, craft.size * 2],
        offset: [0, craft.size * 4, craft.size * 12],
        pos: [worldPos.x, worldPos.y, worldPos.z]
      };
    } else {
      PLANET_DATA[craft.id].pos = [worldPos.x, worldPos.y, worldPos.z];
    }

    // Scale/opacity based on camera distance for LOD
    if (meshRef.current) {
      const opacity = somethingSelected && !isSelected ? 0.3 : (hovered ? 1.0 : 0.75);
      if (meshRef.current.material) meshRef.current.material.opacity = opacity;
    }
  });

  const color = craft.color;

  return (
    <>
    <group ref={groupRef}>
      <group
        onClick={(e) => { e.stopPropagation(); onSelectObject(craft.id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
      >
        {craft.modelUrl ? (
          <>
            <SpacecraftModel
              url={craft.modelUrl}
              scale={craft.modelScale || 0.1}
              isSelected={isSelected}
              hovered={hovered}
              color={color}
            />
            {/* Invisible Hitbox to make clicking microscopic real-scale models easy */}
            <mesh visible={false}>
              <sphereGeometry args={[0.08, 8, 8]} />
            </mesh>
          </>
        ) : (
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            {/* Fallback Glowing billboard sprite */}
            <mesh>
              <circleGeometry args={[craft.size * (isSelected ? 1.6 : 1), 8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.75}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
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
        )}
      </group>

      {/* Hover / selected / active fleet label */}
      {(showOrbit || hovered || isSelected) && (
        <Html
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize: (hovered || isSelected) ? '12px' : '9px',
            opacity: (hovered || isSelected) ? 1.0 : 0.65,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: hovered ? '#ffffff' : color,
            textShadow: hovered
              ? `0 0 6px ${color}, 0 0 14px ${color}, 0 0 40px ${color}88, 0 0 80px ${color}44`
              : `0 0 10px ${color}99`,
            transform: 'translateY(-20px)',
            fontFamily: 'monospace',
            transition: 'all 0.25s ease',
          }}
        >
          {craft.name}
        </Html>
      )}
    </group>

    {/* Orbit path – visible ONLY when host planet is selected, featuring fading tail */}
    {showOrbit && orbitData && (
      <group ref={orbitCenterRef}>
        {/* Tilt the entire orbit plane to match the spacecraft's inclination */}
        <group rotation={[-(craft.inclinationY || 0), 0, 0]}>
          {/* This inner group spins to match the current orbit angle, dragging the tail */}
          <group ref={orbitGroupRef}>
            <Line
              points={orbitData.pts}
              vertexColors={orbitData.colors}
              lineWidth={hovered ? 2.5 : 1.2} // Thicken line when hovering anywhere on spacecraft or orbit
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              onClick={(e) => { e.stopPropagation(); onSelectObject(craft.id); }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
            />
          </group>
        </group>
      </group>
    )}
    </>
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
