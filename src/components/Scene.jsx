import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import Sun from './Sun';
import Planet from './Planet';
import { PLANET_DATA, ORBIT_SPEED } from './planetData';
import { OBJECT_DATA } from './UIOverlay';
import { simClock } from '../simClock';
import { KuiperBelt, AsteroidBelt, OortCloud } from './OuterBodies';
import { PlanetPositionProvider } from './PlanetPositionContext';
import SpacecraftLayer from './Spacecraft';

function InteractiveRig({ selectedObject, isExpanded }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const [target, setTarget] = useState({ 
    pos: new THREE.Vector3(0, 150, 450), 
    focus: new THREE.Vector3(0, 0, 0), 
    animating: false 
  });
  
  const prevFocus = useRef(new THREE.Vector3(0,0,0));
  const isSelected = useRef(false);
  const alreadyStopped = useRef(false);
  
  useEffect(() => {
    if (selectedObject && PLANET_DATA[selectedObject]) {
      isSelected.current = true;
      const data = PLANET_DATA[selectedObject];
      const f = new THREE.Vector3(...data.pos);

      let p;
      if (isExpanded) {
        // Full-screen data dashboard: dead-center lock, push camera tighter to clear UI
        const optimalDist = data.scale[0] * 2.4;
        p = f.clone().add(new THREE.Vector3(0, 0, optimalDist));
      } else {
        // ── HERO VIEW ────────────────────────────────────────────────────────
        // Physics-accurate formula: dist = radius / (fill_fraction * tan(fov/2))
        // Pure proportional multiplier guarantees EVERY planet fills identically
        const heroDist = data.scale[0] * 3.2;
        // Slight upward shift: compensates for the bottom info bar occupying ~17vh
        const heroY    = data.scale[0] * 0.25;
        p = f.clone().add(new THREE.Vector3(0, heroY, heroDist));
      }

      prevFocus.current.copy(f);
      alreadyStopped.current = false;
      setTarget({ pos: p, focus: f, animating: true });
    } else {
      isSelected.current = false;
      alreadyStopped.current = false;
      setTarget({ 
        pos: new THREE.Vector3(0, 150, 450), 
        focus: new THREE.Vector3(0, 0, 0), 
        animating: true 
      });
    }
  }, [selectedObject, isExpanded]);

  useFrame((state, delta) => {
    // ── Tick the single source-of-truth clock first ──────────────────────────
    simClock.tick();

    // ── Update all planet positions from simTime (pure function, no drift) ──
    const t = simClock.simTime;
    Object.keys(PLANET_DATA).forEach(key => {
      const p = PLANET_DATA[key];
      if (!p.distance) return;
      const e    = p.eccentricity || 0;
      const a    = p.distance;
      const b    = a * Math.sqrt(1 - e * e);
      const spd  = ORBIT_SPEED[key] || 0;
      const angle = t * spd + (p.initialAngle || 0);
      const x    = Math.cos(angle) * a - a * e;
      const z    = Math.sin(angle) * b;
      const tilt = p.tilt || 0;
      p.pos = [x, -z * Math.sin(tilt), z * Math.cos(tilt)];
    });

    if (!controlsRef.current) return;

    if (target.animating) {
      let desiredPos = target.pos;

      // Strictly accurate frame-independent exponential decay guaranteeing flawless motion on 120Hz
      const cinematicEase = 1.0 - Math.exp(-5.0 * delta);

      if (isSelected.current && selectedObject) {
        const data = PLANET_DATA[selectedObject];
        const livePos = new THREE.Vector3(...data.pos);
        
        let activeOffset;
        if (isExpanded) {
          const optimalDist = data.scale[0] * 2.4;
          activeOffset = new THREE.Vector3(0, 0, optimalDist);
        } else {
          // Hero view: lock to the strictly proportional cinematic distance
          const heroDist = data.scale[0] * 3.2;
          const heroY    = data.scale[0] * 0.25;
          activeOffset = new THREE.Vector3(0, heroY, heroDist);
        }
        
        desiredPos = livePos.clone().add(activeOffset);
        controlsRef.current.target.lerp(livePos, cinematicEase);
        prevFocus.current.copy(livePos);
      } else {
        controlsRef.current.target.lerp(target.focus, cinematicEase);
      }

      camera.position.lerp(desiredPos, cinematicEase);
      controlsRef.current.update();

      if (camera.position.distanceTo(desiredPos) < 5.0) {
        if (!alreadyStopped.current) {
          alreadyStopped.current = true;
          setTarget(t => ({ ...t, animating: false }));
        }
      }
    } else {
      if (isSelected.current && selectedObject) {
        const livePos = new THREE.Vector3(...PLANET_DATA[selectedObject].pos);
        const moveDelta = livePos.clone().sub(prevFocus.current);
        camera.position.add(moveDelta);
        controlsRef.current.target.copy(livePos);
        prevFocus.current.copy(livePos);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef} 
      makeDefault 
      enableDamping 
      dampingFactor={0.18}
      maxDistance={250000} 
      minDistance={2}
      minPolarAngle={selectedObject ? Math.PI * 0.25 : 0}
      maxPolarAngle={selectedObject ? Math.PI * 0.75 : Math.PI}
      onStart={() => {
        if (target.animating) {
          setTarget(t => ({ ...t, animating: false }));
        }
      }}
    />
  );
}

// Renders an immersive, true-to-life 360-degree high-definition Milky Way background 
// onto an ultra-massive inverted sphere encapsulating the entire simulated space coordinates.
function MilkyWay() {
  const texture = useTexture('/textures/8k_stars_milky_way.jpg');
  const ref = useRef();
  
  // Cinematic orbital drift: slowly spin the celestial sphere so "space feels like it is rotating"
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += 0.0003 * delta * 60;
      ref.current.rotation.z += 0.0001 * delta * 60;
    }
  });

  return (
    <mesh ref={ref}>
      {/* 400,000-unit physical sphere mapping cleanly around Neptune's orbit */}
      <sphereGeometry args={[400000, 32, 32]} />
      {/* BackSide inverted normals allow camera to exist inside the textured sphere */}
      {/* fog={false} is critical to prevent the 250k-distance volumetric fog from turning deep space pure black! */}
      <meshBasicMaterial map={texture} side={THREE.BackSide} color="#a0a0a0" transparent opacity={0.7} fog={false} />
    </mesh>
  );
}

function OrbitRing({ planetName, data, onSelectObject, selectedObject }) {
  const [hovered, setHovered] = useState(false);

  // Opacity logic:
  // - Nothing selected: soft ambient glow
  // - This planet selected: moderately bright (camera is zoomed in on it)
  // - Another planet selected: nearly invisible (dim the background)
  const isThisSelected = selectedObject === planetName;
  const somethingSelected = !!selectedObject;

  const baseOpacity = somethingSelected
    ? isThisSelected ? 0.78 : 0.18
    : 0.32;
  const activeOpacity = hovered ? 0.88 : baseOpacity;

  // Extracts pure unscaled Vector3 coordinates for the celestial trace
  const orbitPoints = useMemo(() => {
    const tilt = data.tilt || 0;
    const e = data.eccentricity || 0;
    const a = data.distance;
    const b = a * Math.sqrt(1 - e * e);
    const pts = [];
    const segments = 360; 
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = (Math.cos(angle) * a) - (a * e);
      const z = Math.sin(angle) * b;
      pts.push(new THREE.Vector3(
        x,
        -z * Math.sin(tilt),
        z * Math.cos(tilt)
      ));
    }
    return pts;
  }, [data.distance, data.tilt, data.eccentricity]);

  return (
    <group>
      {/* Invisible flat ring for click-hit testing */}
      <mesh
        rotation={[data.tilt || 0, 0, 0]}
        rotation-x={-(Math.PI / 2)}
        onClick={(e) => { e.stopPropagation(); onSelectObject(planetName); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={(e) => { document.body.style.cursor = 'auto'; setHovered(false); }}
      >
        {/* Wide invisible hit-ring for easy clicking — ±8 units across */}
        <ringGeometry args={[data.distance - 8, data.distance + 8, 64]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      <Line
        points={orbitPoints}
        color={hovered ? '#ffffff' : (data.color || '#88aacc')}
        transparent
        opacity={activeOpacity}
        lineWidth={2.0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </group>
  );
}

export default function Scene({ onSelectObject, selectedObject, isExpanded }) {
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  return (
    <>
      {/* High contrast dramatic lighting — boosted for Hero Planet close-up clarity */}
      <ambientLight intensity={0.28} />
      {/* Neutral rim fill from opposite side — pure white, no texture tinting */}
      <directionalLight position={[-200, 100, -200]} intensity={0.18} color="#ffffff" />
      {/* Solar illumination — volumetric point spread, no shadow maps at astronomical scale */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={5} 
        distance={0} 
        decay={0}
      />
      
      <InteractiveRig selectedObject={selectedObject} isExpanded={isExpanded} />
      
      {/* Deep-space 2K realistic textured Milky Way wraps the entire 1:1 scale physical scene */}
      <MilkyWay />

      <PlanetPositionProvider>
        <group>
          {planets.map(p => {
          const data = PLANET_DATA[p];
          if (!data || !data.distance) return null;
          return <OrbitRing key={p + '-orbit'} planetName={p} data={data} onSelectObject={onSelectObject} selectedObject={selectedObject} />;
        })}

        <Sun position={PLANET_DATA.sun.pos} scale={PLANET_DATA.sun.scale} onSelect={() => onSelectObject('sun')} />

        {planets.map(p => {
          const d = PLANET_DATA[p];
          if (!d) return null;
          return (
             <Planet 
               key={p} 
               idName={p} 
               name={p} 
               isSelected={selectedObject === p} 
               globalSelected={selectedObject} 
               scale={d.scale} 
               color={d.color} 
               accentColor={OBJECT_DATA[p]?.theme?.accent || d.color} 
               isGasGiant={['jupiter', 'saturn', 'uranus', 'neptune'].includes(p)} 
               hasRings={['saturn', 'uranus'].includes(p)} 
               ringColor={d.ringColor} 
               onSelectObject={onSelectObject} 
               isExpanded={selectedObject === p ? isExpanded : false}
               glowColor={OBJECT_DATA[p]?.theme?.glow}
             />
          );
        })}
      </group>

      {/* Outer solar system layers */}
      <AsteroidBelt />
      <KuiperBelt />
      <OortCloud />

      {/* Human Spacecraft */}
      <SpacecraftLayer 
        onSelectObject={onSelectObject} 
        selectedObject={selectedObject} 
      />
      </PlanetPositionProvider>
    </>
  );
}
