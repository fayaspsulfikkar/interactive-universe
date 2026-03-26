/**
 * PlanetPositionContext.jsx — Context for sharing live planet world positions with spacecraft
 */

import React, { createContext, useContext, useState } from 'react';
import * as THREE from 'three';

const PlanetPositionContext = createContext({});

export function usePlanetPositions() {
  return useContext(PlanetPositionContext);
}

// We use an object of Vector3 objects to avoid React re-renders on every frame.
// The spacecraft useFrame will read from these mutable Vector3s.
export const sharedPlanetPositions = {
  earth: new THREE.Vector3(),
  moon: new THREE.Vector3(),
  mars: new THREE.Vector3(),
  jupiter: new THREE.Vector3(),
  saturn: new THREE.Vector3(),
  uranus: new THREE.Vector3(),
  neptune: new THREE.Vector3(),
  sun: new THREE.Vector3(0, 0, 0)
};

export function PlanetPositionProvider({ children }) {
  return (
    <PlanetPositionContext.Provider value={sharedPlanetPositions}>
      {children}
    </PlanetPositionContext.Provider>
  );
}
