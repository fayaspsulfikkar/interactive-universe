import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Line } from '@react-three/drei';
import { PLANET_DATA, ORBIT_SPEED, SPIN_SPEED } from './planetData';
import { simClock } from '../simClock';
import { sharedPlanetPositions } from './PlanetPositionContext';

// Map planet id to its local texture path (served from /public/textures/)
const TEXTURE_PATHS = {
  mercury: '/textures/mercury.jpg',
  venus: '/textures/venus.jpg',
  earth: '/textures/earth.jpg',
  mars: '/textures/mars.jpg',
  jupiter: '/textures/jupiter.jpg',
  saturn: '/textures/saturn.jpg',
  uranus: '/textures/uranus.jpg',
  neptune: '/textures/neptune.jpg',
  moon: '/textures/moon.jpg',
};

// Shared loader instance — avoids creating a new one per component
const textureLoader = new THREE.TextureLoader();

// Module-level scratch quaternion for billboard math — avoids per-frame allocation in useFrame hot path
const _parentQuat = new THREE.Quaternion();

// Load a texture imperatively (no Suspense — never blocks render)
function useImperativeTexture(path, fallbackColor) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!path) return;
    textureLoader.load(
      path,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; setTexture(tex); },
      undefined,
      () => setTexture(null) // silently fall through to color on error
    );
  }, [path]);
  return texture;
}

// Dynamically generate a literal HD procedural radial texture 
// that perfectly mimics Saturn's and Uranus' real ring gaps and opacities.
function useRealisticRings(idName) {
  return useMemo(() => {
    if (!['jupiter', 'saturn', 'uranus', 'neptune'].includes(idName)) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 2; // X-axis doesn't matter, we wrap this via UV U 
    canvas.height = 1024; // Extreme HD across the radius (UV V)
    const ctx = canvas.getContext('2d');

    // V=0 (inner radius) maps to Y=1024 (bottom)
    // V=1 (outer radius) maps to Y=0 (top)
    const grad = ctx.createLinearGradient(0, 1024, 0, 0);

    if (idName === 'saturn') {
      grad.addColorStop(0.00, 'rgba(0,0,0,0)');
      // C Ring (inner, faint, dusty)
      grad.addColorStop(0.05, 'rgba(120, 110, 100, 0.05)');
      grad.addColorStop(0.20, 'rgba(140, 130, 120, 0.2)');
      // B Ring (bright, very dense, pale beige/grey)
      grad.addColorStop(0.21, 'rgba(215, 205, 195, 0.55)');
      grad.addColorStop(0.35, 'rgba(235, 225, 215, 0.75)');
      grad.addColorStop(0.54, 'rgba(205, 195, 185, 0.50)');
      // Cassini Division (very sharp dark gap)
      grad.addColorStop(0.55, 'rgba(0,0,0,0.0)');
      grad.addColorStop(0.62, 'rgba(0,0,0,0.0)');
      // A Ring (tan/grey, semi-transparent)
      grad.addColorStop(0.63, 'rgba(215, 205, 195, 0.45)');
      grad.addColorStop(0.70, 'rgba(230, 220, 210, 0.60)');
      // Encke Gap (small black gap near edge of A ring)
      grad.addColorStop(0.77, 'rgba(0,0,0,0.0)');
      grad.addColorStop(0.79, 'rgba(0,0,0,0.0)');
      // Outer A Ring and F Ring
      grad.addColorStop(0.80, 'rgba(200, 190, 185, 0.40)');
      grad.addColorStop(0.88, 'rgba(160, 150, 140, 0.20)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0)');
    }
    else if (idName === 'uranus') {
      grad.addColorStop(0.00, 'rgba(0,0,0,0)');
      grad.addColorStop(0.40, 'rgba(0,0,0,0)');
      grad.addColorStop(0.42, 'rgba(180,200,255,0.4)'); // Alpha ring
      grad.addColorStop(0.44, 'rgba(0,0,0,0)');
      grad.addColorStop(0.60, 'rgba(0,0,0,0)');
      grad.addColorStop(0.62, 'rgba(180,200,255,0.4)'); // Beta ring
      grad.addColorStop(0.64, 'rgba(0,0,0,0)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0)');
      grad.addColorStop(0.88, 'rgba(220,240,255,0.6)'); // Epsilon ring
      grad.addColorStop(0.90, 'rgba(0,0,0,0)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0)');
    }
    else {
      grad.addColorStop(0.00, 'rgba(0,0,0,0)');
      grad.addColorStop(0.50, 'rgba(200,200,200,0.1)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 1024);

    return new THREE.CanvasTexture(canvas);
  }, [idName]);
}

// Universal cinematic Fresnel atmosphere — applies to ALL planets.
// Color = theme.glow. Intensity peaks at edge silhouettes, zero at center.
// Pure additive blending: never modifies surface texture, only adds light.
function PlanetAtmosphere({ scale, glowColor = '#88aaff', fresnelPower = 4.5, intensity = 0.55 }) {
  const uniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(glowColor) },
    fresnelPower: { value: fresnelPower },
    intensity: { value: intensity },
  }), [glowColor, fresnelPower, intensity]);

  // Keep uniforms hot-swappable when theme changes
  useEffect(() => {
    uniforms.glowColor.value.set(glowColor);
    uniforms.fresnelPower.value = fresnelPower;
    uniforms.intensity.value = intensity;
  }, [glowColor, fresnelPower, intensity, uniforms]);

  return (
    <mesh scale={[scale[0] * 1.04, scale[1] * 1.04, scale[2] * 1.04]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 glowColor;
          uniform float fresnelPower;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            vec3 sunDirection  = normalize(-vWorldPosition);
            // Clamp glow to sunlit terminator edge (avoids dark-side rim bleed)
            float sunFacing = smoothstep(-0.15, 0.55, dot(vNormal, sunDirection));
            // Fresnel: peaks at silhouette edge facing camera, zero at surface center
            float fresnel = 1.0 - max(dot(viewDirection, vNormal), 0.0);
            fresnel = pow(fresnel, fresnelPower);
            float alpha = fresnel * sunFacing * intensity;
            gl_FragColor = vec4(glowColor, alpha);
          }
        `}
      />
    </mesh>
  );
}

// Billboarded soft sprite disc — renders BEHIND the planet as a volumetric
// light-cloud. renderOrder=-1 ensures opaque planet always draws on top.
function VolumetricGlow({ scale, glowColor = '#4488ff' }) {
  const matRef = useRef();
  const spriteScale = scale[0] * 4.5;

  useEffect(() => {
    if (matRef.current) matRef.current.color.set(glowColor);
  }, [glowColor]);

  // Build a radial soft gradient canvas texture once
  const tex = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0,    'rgba(255,255,255,0.35)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.7,  'rgba(255,255,255,0.03)');
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <sprite renderOrder={-1} scale={[spriteScale, spriteScale, spriteScale]}>
      <spriteMaterial
        ref={matRef}
        map={tex}
        color={glowColor}
        transparent
        opacity={0.12}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

// Precomputed unit-circle points in the XZ plane — shared across all LODMarker instances
// (avoids re-creating 65 Vector3s on every mount)
const RETICLE_POINTS = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
});

// Pure-WebGL LOD reticle — horizontal 3D ring lying flat in the XZ plane.
// Scales to constant screen size. No billboard / camera quaternion needed.
function LODMarker({ targetRef, radius, planetName, color, onSelectObject, isMoon, isPlanetSelected }) {
  const groupRef = useRef();
  const lineRef = useRef();

  useFrame((state) => {
    if (!groupRef.current || !targetRef.current) return;

    const me = targetRef.current.matrixWorld.elements;
    const wx = me[12], wy = me[13], wz = me[14];
    const cam = state.camera.position;
    const dist = Math.sqrt((cam.x-wx)**2 + (cam.y-wy)**2 + (cam.z-wz)**2);

    const fovRad = state.camera.fov * Math.PI / 180;
    const pixelSize = (2 * Math.atan(radius / Math.max(dist, 0.001)) / fovRad) * window.innerHeight;
    const show = pixelSize < 45 && (!isMoon || isPlanetSelected);

    if (!show) { groupRef.current.scale.setScalar(0); return; }

    // Scale ring to hold a constant ~32px screen-diameter regardless of zoom
    const worldR = 16 * dist * Math.tan(fovRad * 0.5) * 2 / window.innerHeight;
    groupRef.current.scale.setScalar(worldR);

    // Fade opacity based on how sub-pixel the planet is
    const alpha = Math.max(0, Math.min(1.0, (45 - pixelSize) / 15));
    if (lineRef.current?.material) lineRef.current.material.opacity = alpha;
  });

  return (
    <group ref={groupRef} scale={[0, 0, 0]}>
      {/* Invisible flat disc for click / hover hit-testing */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onSelectObject(planetName.toLowerCase()); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <ringGeometry args={[0.6, 1.1, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Horizontal 3D line ring flat in the XZ plane */}
      <Line
        ref={lineRef}
        points={RETICLE_POINTS}
        color={color}
        lineWidth={1.2}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </group>
  );
}

// Pure-WebGL fading label — uses drei Text (troika GPU rendering) with no DOM.
// Quaternion-copied from camera for billboard behaviour; scales to constant screen size.
export function FadingLabel({ targetRef, radius, name, position, fontSize }) {
  const textRef = useRef();
  const groupRef = useRef();

  useFrame((state) => {
    if (!textRef.current || !groupRef.current) return;

    // Global depth-based fade (same math as before, but writing to material.opacity)
    const distToCenter = state.camera.position.length();
    // Max opacity peaked at 0.5 to keep deep-space labels highly subtle and unintrusive
    const alpha = Math.max(0, Math.min(0.5, 1.0 - (distToCenter - 80000) / 70000));
    if (textRef.current.material) textRef.current.material.opacity = alpha;

    // Compute distance to planet for scale-to-screen-size math
    let dist = 500;
    if (targetRef?.current) {
      const me = targetRef.current.matrixWorld.elements;
      const cam = state.camera.position;
      dist = Math.sqrt((cam.x - me[12])**2 + (cam.y - me[13])**2 + (cam.z - me[14])**2);
    }
    const fovRad = state.camera.fov * Math.PI / 180;
    // Scale group so text appears ~13px tall on screen regardless of zoom
    const worldH = 13 * dist * Math.tan(fovRad * 0.5) * 2 / window.innerHeight;
    groupRef.current.scale.setScalar(worldH / 0.1);

    // Correct billboard math: compute local_quat = inverse(parent_world_quat) × camera_quat
    // This cancels out any rotation introduced by parent groups (planet spin, moon orbit, Sun rotation)
    // so the label stays perfectly upright and facing the viewer in world space.
    if (groupRef.current.parent) {
      groupRef.current.parent.getWorldQuaternion(_parentQuat);
      _parentQuat.invert();
      groupRef.current.quaternion.multiplyQuaternions(_parentQuat, state.camera.quaternion);
    } else {
      groupRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Text
        ref={textRef}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.08}
        material-transparent
        material-depthWrite={false}
      >
        {name.toUpperCase()}
      </Text>
    </group>
  );
}

function Satellite({ data, isPlanetSelected, globalSelected, onSelectObject }) {
  const ref = useRef();
  const meshRef = useRef();
  const angle = useRef(Math.random() * Math.PI * 2);
  const moonTexture = useImperativeTexture('/textures/moon.jpg', '#999999');
  const [hovered, setHovered] = useState(false);

  // Look up moon key in ORBIT_SPEED table (keyed by lowercase name)
  const moonKey = data.name.toLowerCase();
  const moonOrbitSpeed = ORBIT_SPEED[moonKey] || (2 * Math.PI / (27.3 * 86400));

  useFrame((state, delta) => {
    if (ref.current) {
      // Pure-function orbit: angle is deterministic from simTime — never drifts
      const moonAngle = simClock.simTime * moonOrbitSpeed + (data.initialAngle || 0);
      ref.current.position.x = Math.cos(moonAngle) * data.distance;
      ref.current.position.z = Math.sin(moonAngle) * data.distance;
      // Tidal locking: moon always faces its parent planet
      ref.current.rotation.y = -moonAngle + Math.PI / 2;

      // Cache world position and scale for camera targeting
      if (!PLANET_DATA[moonKey]) PLANET_DATA[moonKey] = { offset: [0, data.size * 2, data.size * 6], scale: [data.size, data.size, data.size] };
      if (ref.current.parent?.parent) {
        const pp = ref.current.parent.parent.position;
        PLANET_DATA[moonKey].pos = [pp.x + ref.current.position.x, pp.y, pp.z + ref.current.position.z];
        if (sharedPlanetPositions[moonKey]) {
          sharedPlanetPositions[moonKey].set(pp.x + ref.current.position.x, pp.y, pp.z + ref.current.position.z);
        }
      }
    }
    if (meshRef.current) {
      const targetS = hovered ? 1.05 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), 1.0 - Math.exp(-8.0 * delta));
    }
  });

  // Build array of raw coordinates to trace the orbital path (Upgrading from native WebGL mapping)
  const orbitPoints = useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(a) * data.distance,
        0,
        Math.sin(a) * data.distance
      ));
    }
    return pts;
  }, [data.distance]);

  return (
    <group>
      {/* Invisible hit-box ring so users can still click the orbit path easily */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}
        visible={isPlanetSelected || globalSelected === data.name.toLowerCase()}
        onClick={(e) => { e.stopPropagation(); onSelectObject(data.name.toLowerCase()); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <ringGeometry args={[data.distance - 0.5, data.distance + 0.5, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visual screen-space 3D tube line */}
      <Line 
        points={orbitPoints} 
        visible={isPlanetSelected || globalSelected === data.name.toLowerCase()}
        color="#ffffff" 
        transparent 
        opacity={0.5} 
        lineWidth={2.5}
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
      />
      <group ref={ref}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onSelectObject(data.name.toLowerCase()); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
        >
          <sphereGeometry args={[data.size, 32, 32]} />
          <meshStandardMaterial
            key={moonTexture?.uuid + '_' + data.name}
            map={moonTexture}
            color={data.color}
            bumpMap={moonTexture}
            bumpScale={0.015}
            roughness={(data.name === 'Europa' || data.name === 'Enceladus' || data.name === 'Triton') ? 0.4 : 0.9}
            metalness={0.0}
          />
        </mesh>

        {/* LOD reticle — hidden only while this moon is selected */}
        {globalSelected !== data.name.toLowerCase() && (
          <LODMarker targetRef={meshRef} radius={data.size} planetName={data.name} color={data.color} onSelectObject={onSelectObject} isMoon={true} isPlanetSelected={isPlanetSelected || globalSelected === data.name.toLowerCase()} />
        )}

        {(isPlanetSelected || globalSelected === data.name.toLowerCase() || hovered) && (
          <FadingLabel targetRef={meshRef} radius={data.size} name={data.name} position={[0, data.size + 0.4, 0]} fontSize="10px" />
        )}
      </group>
    </group>
  );
}

export default function Planet({ idName, isSelected, globalSelected, position, scale, name, color, accentColor, isGasGiant, hasRings, ringColor, onSelectObject, isExpanded, glowColor }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);

  const texture = useImperativeTexture(TEXTURE_PATHS[idName], color);
  const ringTexture = useRealisticRings(idName);

  useFrame((state, delta) => {
    const pd = idName && PLANET_DATA[idName];
    if (groupRef.current && pd) {
      groupRef.current.position.set(...pd.pos);
      if (sharedPlanetPositions[idName]) {
        sharedPlanetPositions[idName].copy(groupRef.current.position);
      }
    }
    if (meshRef.current && pd) {
      // Axial tilt (Z) is fixed physical property
      meshRef.current.rotation.z = pd.axialTilt || 0;
      // Spin: slow to 20% speed when in hero mode for dramatic cinematic effect
      const spinSpd = (SPIN_SPEED[idName] || 0) * (isSelected ? 0.18 : 1.0);
      meshRef.current.rotation.y = simClock.simTime * spinSpd;
    }
    if (ringRef.current && pd) {
      // Rings co-rotate with the planet's spin (simplified)
      const spinSpd = SPIN_SPEED[idName] || 0;
      ringRef.current.rotation.z = simClock.simTime * spinSpd * 0.1;
    }
    if (meshRef.current) {
      const targetS = hovered ? scale[0] * 1.05 : scale[0];
      meshRef.current.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), 1.0 - Math.exp(-8.0 * delta));

      // Reverted the 3D dashboard emissive material tinting per user request 
      // This strictly preserves the 100% NASA photorealistic texture mapping without artificial GUI glowing.
      if (meshRef.current.material) {
        meshRef.current.material.emissive.setHex(0x000000);
        meshRef.current.material.emissiveIntensity = 0.0;
      }
    }
  });

  const RING_DIMS = {
    jupiter: [1.29, 1.8],
    saturn: [1.24, 2.3],
    uranus: [1.48, 2.0],
    neptune: [1.7, 2.5]
  };

  // Bind the ring geometry exactly to the planet's physical axial tilt (Z axis)
  const pureTilt = PLANET_DATA[idName]?.axialTilt || 0;

  return (
    <group ref={groupRef} position={position}>
      {/* Minimalist trigonometric fading label replacing static scale strings */}
      <FadingLabel targetRef={meshRef} radius={scale[0]} name={name} position={[0, scale[1] * 1.4, 0]} fontSize="12px" />

      {/* Textured sphere */}
      <mesh
        ref={meshRef}
        scale={scale}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelectObject(idName); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          key={texture?.uuid || idName}
          map={texture}
          color={texture ? '#ffffff' : color}
          roughness={isGasGiant ? 0.6 : 0.9}
          metalness={0.0}
          onBeforeCompile={idName === 'saturn' ? (shader) => {
            // Saturn Shader Upgrade: Exponential contrast & hard shadow crushing
            shader.vertexShader = `
              varying vec3 vWorldPosSaturn;
              ${shader.vertexShader}
            `.replace(
              '#include <worldpos_vertex>',
              `
              #include <worldpos_vertex>
              vWorldPosSaturn = (modelMatrix * vec4(transformed, 1.0)).xyz;
              `
            );
            shader.fragmentShader = `
              varying vec3 vWorldPosSaturn;
              ${shader.fragmentShader}
            `.replace(
              '#include <dithering_fragment>',
              `
              #include <dithering_fragment>
              
              // Boost sharpness and S-curve contrast natively on the GPU
              vec3 texColor = gl_FragColor.rgb;
              texColor = mix(texColor, smoothstep(0.0, 1.0, texColor), 0.5);
              
              // Deepen unlit shadow side artificially for intense cinematic contrast
              float luminance = dot(texColor, vec3(0.299, 0.587, 0.114));
              if (luminance < 0.08) {
                 texColor *= smoothstep(0.0, 0.08, luminance) * 0.2; 
              }
              
              gl_FragColor.rgb = texColor;
              `
            );
          } : undefined}
        />
      </mesh>

      {/* LOD reticle — hidden only while this planet is selected */}
      {globalSelected !== idName && (
        <LODMarker targetRef={meshRef} radius={scale[0]} planetName={name} color={accentColor} onSelectObject={onSelectObject} />
      )}


      {/* 3D Volumetric light-cloud — only visible in hero/selected mode to avoid orbit-dot artefacts */}
      {isSelected && <VolumetricGlow scale={scale} glowColor={glowColor || '#4488ff'} />}
      {/* Universal Fresnel atmospheric rim — same shader, themed per-planet */}
      <PlanetAtmosphere
        scale={scale}
        glowColor={glowColor || '#88aaff'}
        fresnelPower={idName === 'earth' ? 3.8 : idName === 'saturn' || idName === 'uranus' ? 5.5 : 4.2}
        intensity={idName === 'mercury' || idName === 'moon' ? 0.35 : 0.55}
      />

      {/* Flawless Continuous Alpha Ring Maps (NASA Match) */}
      {hasRings && RING_DIMS[idName] && (
        <group rotation={[0, 0, PLANET_DATA[idName]?.axialTilt || 0]}>
          <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <ringGeometry
              args={[
                scale[0] * RING_DIMS[idName][0],
                scale[0] * RING_DIMS[idName][1],
                512, 128
              ]}
              onUpdate={(self) => {
                // UV un-projection: Rewrites the planar U mappings so the linear HD gradient perfectly bands radially.
                // Since the procedural texture is a vertical gradient (Y-axis), we map the physical radius to the V coordinate.
                const pos = self.attributes.position;
                const uvs = self.attributes.uv;
                const v3 = new THREE.Vector3();
                const inner = scale[0] * RING_DIMS[idName][0];
                const outer = scale[0] * RING_DIMS[idName][1];
                for (let i = 0; i < pos.count; i++) {
                  v3.fromBufferAttribute(pos, i);
                  uvs.setXY(i, 0.5, (v3.length() - inner) / (outer - inner));
                }
                uvs.needsUpdate = true;
              }}
            />
            <meshStandardMaterial
              map={ringTexture}
              color="#ffffff"
              side={THREE.DoubleSide}
              transparent={true}
              depthWrite={false}
              alphaTest={0.01}
              opacity={0.9}
              roughness={0.7}
              metalness={0.1}
              onBeforeCompile={idName === 'saturn' ? (shader) => {
                // Ring Shader Upgrade: Anisotropic Mie scattering & procedural high-freq noise
                shader.vertexShader = `
                  varying vec3 vWorldPosRing;
                  varying vec2 vUvRing;
                  ${shader.vertexShader}
                `.replace(
                  '#include <worldpos_vertex>',
                  `
                  #include <worldpos_vertex>
                  vWorldPosRing = (modelMatrix * vec4(transformed, 1.0)).xyz;
                  vUvRing = uv;
                  `
                );
                shader.fragmentShader = `
                  varying vec3 vWorldPosRing;
                  varying vec2 vUvRing;
                  float customNoiseRand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
                  ${shader.fragmentShader}
                `.replace(
                  '#include <dithering_fragment>',
                  `
                  #include <dithering_fragment>
                  
                  // 1. Procedural Noise Overlay to mimic particulate structures without geometry cost
                  float noise = customNoiseRand(vUvRing * 2000.0) * 0.12 - 0.06;
                  gl_FragColor.rgb += noise * gl_FragColor.a;

                  // 2. Anisotropic Optical Effects
                  vec3 viewDir = normalize(cameraPosition - vWorldPosRing);
                  vec3 lightToSun = normalize(-vWorldPosRing);
                  
                  // Forward-scattering (Mie glare when rings eclipse the sun)
                  float forwardScatter = pow(max(0.0, dot(viewDir, -lightToSun)), 6.0) * 1.5;
                  // Opposition surge (Back-scattering when light hits ring flat behind camera)
                  float backScatter = pow(max(0.0, dot(viewDir, lightToSun)), 4.0) * 0.5;
                  
                  gl_FragColor.rgb += gl_FragColor.rgb * (forwardScatter + backScatter) * gl_FragColor.a;
                  
                  // Density tuning
                  gl_FragColor.a = smoothstep(0.0, 0.85, gl_FragColor.a);
                  `
                );
              } : undefined}
            />
          </mesh>
        </group>
      )}

      {/* Moons */}
      {idName && PLANET_DATA[idName]?.moons?.map((moon, i) => (
        <Satellite key={i} data={moon} isPlanetSelected={isSelected} globalSelected={globalSelected} onSelectObject={onSelectObject} />
      ))}
    </group>
  );
}
