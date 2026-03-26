import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Galaxy({ position, onSelect }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Generate thousands of points in a massive spiral pattern
  const count = 30000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const radius = 2500;
    const branches = 5;
    const randomness = 150;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Exponential placement with center bias
      const r = Math.pow(Math.random(), 3) * radius;
      // branch angle
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      // spin angle based on distance to center
      const spinAngle = r * 0.0015;

      // Random scatter
      const randomX = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r/radius);
      const randomY = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r/radius);
      const randomZ = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r/radius);

      pos[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      pos[i3 + 1] = randomY * 0.2; // flatten y tightly to form a galactic disc
      pos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= 0.02 * delta; // Extremely slow massive rotation
    }

    if (materialRef.current) {
      // Fade in galaxy only when heavily zoomed out of the local planets
      const dist = state.camera.position.length();
      let targetOpacity = 0;
      
      // Neptune is at 400. Start fading in around 600, fully visible at 1600
      if (dist > 600) {
        targetOpacity = Math.min(0.7, (dist - 600) / 1000 * 0.7);
      }

      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, 0.05);
    }
  });

  return (
    <group 
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      {/* Invisible interaction hitbox for the galaxy */}
      <mesh visible={false}>
        <sphereGeometry args={[1000, 16, 16]} />
        <meshBasicMaterial />
      </mesh>
      
      <points ref={pointsRef} scale={hovered ? 1.02 : 1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={18}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={hovered ? "#ddedff" : "#88bbee"}
          transparent
          opacity={0} // Invisible by default
        />
      </points>
    </group>
  );
}
