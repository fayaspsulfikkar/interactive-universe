import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './components/Scene';
import UIOverlay from './components/UIOverlay';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Canvas
        frameloop="always"
        camera={{ position: [0, 180, 600], fov: 45, near: 0.1, far: 500000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', precision: 'highp' }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
      >
        <color attach="background" args={['#010103']} />
        
        <Suspense fallback={null}>
          <Scene onSelectObject={setSelectedObject} selectedObject={selectedObject} isExpanded={isExpanded} />
        </Suspense>
      </Canvas>

      <UIOverlay 
        selectedObject={selectedObject} 
        onSelectObject={setSelectedObject}
        onClose={() => { setSelectedObject(null); setIsExpanded(false); }} 
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />
    </>
  );
}

export default App;
