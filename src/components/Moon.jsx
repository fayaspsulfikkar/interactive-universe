import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

export default function Moon({ position, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // High-res placeholder texture
  const texture = useTexture('https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg');

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={hovered ? 0.29 : 0.27} // 0.27 is accurate visual scaling compared to earth
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.9} 
        metalness={0} 
        emissive={hovered ? "#ffffff" : "#000000"}
        emissiveIntensity={hovered ? 0.1 : 0}
      />
    </mesh>
  );
}
