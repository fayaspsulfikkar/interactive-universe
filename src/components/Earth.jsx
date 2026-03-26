import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

export default function Earth({ position, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // High-res placeholder texture
  const texture = useTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={hovered ? 1.05 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.6}
        metalness={0.1}
        emissive={hovered ? "#3366ff" : "#000000"}
        emissiveIntensity={hovered ? 0.2 : 0}
      />
    </mesh>
  );
}
