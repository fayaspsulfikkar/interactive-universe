import React, { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Clone } from '@react-three/drei';
import * as THREE_M from 'three';
import { simClock } from '../simClock';
import { SPACECRAFT_DATA } from './SpacecraftData';

// ── Simulated date from clock time ────────────────────────────────────────────
function formatSimDate(simTimeSec) {
  // simTime starts at current Unix epoch × timeScale, so recover the date portion
  // We compute: epoch_start + simTime / timeScale wouldn't work because timeScale changes.
  // Instead: simTime is total simulated seconds elapsed since page load, starting from now.
  // Use simTime directly as offset from page-load date.
  const pageLoadMs = window.__pageLoadMs || (window.__pageLoadMs = Date.now());
  const simDateMs = pageLoadMs + (simTimeSec / (simClock.timeScale || 1)) * 1000;
  const d = new Date(simDateMs);
  return d.toUTCString().replace('GMT', 'UTC').slice(0, 25);
}

// ── Time controls HUD ─────────────────────────────────────────────────────────
function TimeHUD() {
  const [paused, setPaused] = useState(false);
  const [scale, setScale] = useState(simClock.timeScale);
  const [simDate, setSimDate] = useState('');

  // Update display at 4Hz — plenty for a date string
  useEffect(() => {
    const id = setInterval(() => {
      setSimDate(formatSimDate(simClock.simTime));
      setPaused(simClock.isPaused());
    }, 250);
    return () => clearInterval(id);
  }, []);

  const selectScale = (s) => {
    simClock.setScale(s);
    setScale(s);
    if (paused) { simClock.resume(); setPaused(false); }
  };

  const togglePause = () => {
    if (paused) { simClock.resume(); setPaused(false); }
    else        { simClock.pause();  setPaused(true);  }
  };

  const SPEEDS = [
    { label: '1×',    val: 1       },
    { label: '100×',  val: 100     },
    { label: '1K×',   val: 1000    },
    { label: '10K×',  val: 10000   },
    { label: '100K×', val: 100000  },
  ];

  const btnBase = {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.75)',
    borderRadius: '3px',
    padding: '4px 10px',
    fontSize: '0.72rem',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
  const btnActive = { ...btnBase, background: 'rgba(77,160,255,0.25)', borderColor: 'rgba(77,160,255,0.6)', color: '#fff' };

  return (
    <div className="glass-panel time-hud" style={{
      background: 'linear-gradient(135deg,rgba(8,12,22,0.88),rgba(4,7,14,0.80))',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontFamily: 'var(--font-main, monospace)',
      zIndex: 1000,
    }}>
      {/* Simulated date */}
      <div style={{ fontSize: '0.68rem', color: 'rgba(80,180,255,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Sim Time (UTC)
      </div>
      <div style={{ fontSize: '0.82rem', color: '#fff', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {simDate || '—'}
      </div>

      {/* Speed buttons */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
        {SPEEDS.map(({ label, val }) => (
          <button key={val}
            style={(!paused && scale === val) ? btnActive : btnBase}
            onClick={() => selectScale(val)}
            onMouseOver={e => { if (scale !== val || paused) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseOut={e => { if (scale !== val || paused) e.currentTarget.style.background = 'transparent'; }}
          >{label}</button>
        ))}
      </div>

      {/* Pause / Reset */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
        <button style={{ ...btnBase, flex: 1, borderColor: paused ? 'rgba(255,200,80,0.5)' : undefined, color: paused ? 'rgba(255,200,80,1)' : undefined }}
          onClick={togglePause}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button style={{ ...btnBase, flex: 1 }}
          onClick={() => { simClock.reset(); }}>
          ↺ Reset
        </button>
      </div>
    </div>
  );
}


export const OBJECT_DATA = {
  earth: {
    type: 'PLANET', name: 'Earth', description: 'Our pale blue dot. The only known home for life.', fact: 'Earth is not a perfect sphere; it is slightly wider at the equator.',
    theme: { primary: 'rgba(20, 80, 200, 0.85)', accent: '#4a90e2', glow: '#60a0ff' },
    physical: { radius: '6,371 km', mass: '5.97 × 10²⁴ kg', gravity: '9.81 m/s²', escapeVelocity: '11.19 km/s' },
    rotation: { period: '23.93 hours', speed: '1,670 km/h', tilt: '23.44°' },
    orbit: { period: '365.25 days', distance: '149.6M km (1 AU)', speed: '29.78 km/s' },
    atmosphere: { composition: [{name: 'N₂', val: 78}, {name: 'O₂', val: 21}, {name: 'Ar', val: 1}], pressure: '101.3 kPa', temp: '-89°C to 58°C' },
    water: { present: true, details: '71% surface liquid oceans, massive polar ice caps, and atmospheric vapor.' },
    age: '~4.54 Billion Years', moons: { count: 1, list: 'The Moon' },
    impact: 'Harbors the only known biosphere. Its massive magnetic field deflects lethal solar wind, protecting the surface.'
  },
  mercury: {
    type: 'PLANET', name: 'Mercury', description: 'The smallest and innermost planet in the Solar System.', fact: 'A year on Mercury takes just 88 Earth days.',
    theme: { primary: 'rgba(120, 110, 100, 0.85)', accent: '#887766', glow: '#a09080' },
    physical: { radius: '2,439 km', mass: '3.30 × 10²³ kg', gravity: '3.70 m/s²', escapeVelocity: '4.25 km/s' },
    rotation: { period: '58.6 Earth days', speed: '10.89 km/h', tilt: '0.03°' },
    orbit: { period: '88 Earth days', distance: '57.9M km (0.39 AU)', speed: '47.36 km/s' },
    atmosphere: { composition: [{name: 'O₂', val: 42}, {name: 'Na', val: 29}, {name: 'H₂', val: 22}], pressure: 'Trace Exosphere', temp: '-173°C to 427°C' },
    water: { present: true, details: 'Solid water ice confirmed hidden in permanently shadowed craters at the poles.' },
    age: '~4.50 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Closest major mass to the Sun, subject to extreme solar tidal forces locking its core.'
  },
  venus: {
    type: 'PLANET', name: 'Venus', description: 'A rocky planet with a dense, toxic atmosphere.', fact: 'Venus spins backward compared to most other planets.',
    theme: { primary: 'rgba(200, 140, 60, 0.85)', accent: '#e0a040', glow: '#ffc060' },
    physical: { radius: '6,051 km', mass: '4.86 × 10²⁴ kg', gravity: '8.87 m/s²', escapeVelocity: '10.36 km/s' },
    rotation: { period: '243 Earth days (Retrograde)', speed: '6.52 km/h', tilt: '177.36°' },
    orbit: { period: '224.7 Earth days', distance: '108.2M km (0.72 AU)', speed: '35.02 km/s' },
    atmosphere: { composition: [{name: 'CO₂', val: 96.5}, {name: 'N₂', val: 3.5}], pressure: '9,300 kPa (92x Earth)', temp: '462°C (Runaway Greenhouse)' },
    water: { present: false, details: 'Trace amounts of vapor in upper clouds, but entirely vaporized and lost to space.' },
    age: '~4.50 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Demonstrates extreme runway greenhouse conditions, serving as a critical scientific climate warning.'
  },
  mars: {
    type: 'PLANET', name: 'Mars', description: 'The Red Planet, home to the largest volcano in the solar system.', fact: 'Mars has two tiny moons, Phobos and Deimos.',
    theme: { primary: 'rgba(180, 50, 20, 0.85)', accent: '#ff4422', glow: '#ff6644' },
    physical: { radius: '3,389 km', mass: '6.41 × 10²³ kg', gravity: '3.71 m/s²', escapeVelocity: '5.03 km/s' },
    rotation: { period: '24.6 hours', speed: '868 km/h', tilt: '25.19°' },
    orbit: { period: '687 Earth days', distance: '227.9M km (1.52 AU)', speed: '24.07 km/s' },
    atmosphere: { composition: [{name: 'CO₂', val: 95.3}, {name: 'N₂', val: 2.7}, {name: 'Ar', val: 1.6}], pressure: '0.6 kPa (0.6% Earth)', temp: '-153°C to 20°C' },
    water: { present: true, details: 'Massive subsurface ice deposits and frozen polar caps. Ancient riverbeds prove liquid past.' },
    age: '~4.50 Billion Years', moons: { count: 2, list: 'Phobos, Deimos' },
    impact: 'Prime target for future colonization and extensive astrobiological searches for ancient microbial life.'
  },
  jupiter: {
    type: 'GAS GIANT', name: 'Jupiter', description: 'A gas giant and the largest planet in the Solar System.', fact: 'Jupiter\'s Great Red Spot is a storm that has been raging for centuries.',
    theme: { primary: 'rgba(160, 100, 70, 0.85)', accent: '#d08050', glow: '#ffaa80' },
    physical: { radius: '69,911 km', mass: '1.89 × 10²⁷ kg (317x Earth)', gravity: '24.79 m/s²', escapeVelocity: '59.5 km/s' },
    rotation: { period: '9.92 hours', speed: '45,300 km/h', tilt: '3.13°' },
    orbit: { period: '11.86 Earth years', distance: '778.5M km (5.20 AU)', speed: '13.07 km/s' },
    atmosphere: { composition: [{name: 'H₂', val: 89}, {name: 'He', val: 10}, {name: 'CH₄', val: 1}], pressure: '>100,000 kPa (Internal)', temp: '-110°C (Cloud top)' },
    water: { present: true, details: 'Trace vapor/ice deep within the atmosphere, highly turbulent.' },
    age: '~4.60 Billion Years', moons: { count: 95, list: 'Io, Europa, Ganymede, Callisto' },
    impact: 'The system\'s gravitational vacuum cleaner; continuously deflects lethal comets away from the inner planets.'
  },
  saturn: {
    type: 'GAS GIANT', name: 'Saturn', description: 'Adorned with a dazzling system of icy rings.', fact: 'Saturn is the only planet that is less dense than water.',
    theme: { primary: 'rgba(180, 150, 100, 0.85)', accent: '#e0c080', glow: '#ffe0a0' },
    physical: { radius: '58,232 km', mass: '5.68 × 10²⁶ kg (95x Earth)', gravity: '10.44 m/s²', escapeVelocity: '35.5 km/s' },
    rotation: { period: '10.65 hours', speed: '35,500 km/h', tilt: '26.73°' },
    orbit: { period: '29.45 Earth years', distance: '1.43B km (9.58 AU)', speed: '9.68 km/s' },
    atmosphere: { composition: [{name: 'H₂', val: 96}, {name: 'He', val: 3}, {name: 'CH₄', val: 1}], pressure: '>100,000 kPa (Internal)', temp: '-140°C (Cloud top)' },
    water: { present: true, details: 'Rings are 99.9% pure water ice. Enceladus (moon) sprays liquid water into the E-ring.' },
    age: '~4.50 Billion Years', moons: { count: 146, list: 'Titan, Enceladus, Rhea, Dione' },
    impact: 'Exerts massive gravitational tides, dragging icy debris into its spectacular 400,000-km wide ring plane.'
  },
  uranus: {
    type: 'ICE GIANT', name: 'Uranus', description: 'An ice giant that rotates on its side.', fact: 'Uranus is the coldest planet in the Solar System.',
    theme: { primary: 'rgba(70, 150, 200, 0.85)', accent: '#50c0ff', glow: '#80e0ff' },
    physical: { radius: '25,362 km', mass: '8.68 × 10²⁵ kg', gravity: '8.69 m/s²', escapeVelocity: '21.3 km/s' },
    rotation: { period: '17.2 hours (Retrograde)', speed: '9,320 km/h', tilt: '97.77°' },
    orbit: { period: '84 Earth years', distance: '2.87B km (19.2 AU)', speed: '6.80 km/s' },
    atmosphere: { composition: [{name: 'H₂', val: 83}, {name: 'He', val: 15}, {name: 'CH₄', val: 2}], pressure: '>10,000 kPa', temp: '-224°C' },
    water: { present: true, details: 'Massive supercritical fluid mantle of water, ammonia, and methane.' },
    age: '~4.50 Billion Years', moons: { count: 28, list: 'Titania, Oberon, Umbriel, Ariel' },
    impact: 'Its extreme 97-degree axial tilt creates the most dramatic seasonal variations in the solar system, plunging hemispheres into 42-year long darkness.'
  },
  neptune: {
    type: 'ICE GIANT', name: 'Neptune', description: 'A dark, cold, and very windy ice giant.', fact: 'Neptune completes an orbit around the Sun every 165 Earth years.',
    theme: { primary: 'rgba(30, 80, 180, 0.85)', accent: '#3060d0', glow: '#5080ff' },
    physical: { radius: '24,622 km', mass: '1.02 × 10²⁶ kg', gravity: '11.15 m/s²', escapeVelocity: '23.5 km/s' },
    rotation: { period: '16.11 hours', speed: '9,660 km/h', tilt: '28.32°' },
    orbit: { period: '164.8 Earth years', distance: '4.50B km (30.1 AU)', speed: '5.43 km/s' },
    atmosphere: { composition: [{name: 'H₂', val: 80}, {name: 'He', val: 19}, {name: 'CH₄', val: 1}], pressure: '>10,000 kPa', temp: '-214°C' },
    water: { present: true, details: 'Slushy mantle of water, ammonia, and high-pressure metallic ices.' },
    age: '~4.50 Billion Years', moons: { count: 16, list: 'Triton, Proteus, Nereid' },
    impact: 'Drives the orbital dynamics of the Kuiper Belt, capturing dwarf planets and forcing plutinos into resonance.'
  },
  sun: {
    type: 'STAR', name: 'The Sun', description: 'A G-type main-sequence yellow dwarf star.', fact: 'It accounts for 99.86% of the mass in the entire solar system.',
    theme: { primary: 'rgba(255, 120, 20, 0.85)', accent: '#ffaa44', glow: '#ffcc66' },
    physical: { radius: '696,340 km', mass: '1.989 × 10³⁰ kg', gravity: '274.0 m/s²', escapeVelocity: '617.7 km/s' },
    rotation: { period: '25.38 days (Equator)', speed: '7,189 km/h', tilt: '7.25°' },
    orbit: { period: '230M years', distance: 'Galactic Center', speed: '220 km/s' },
    atmosphere: { composition: [{name: 'H', val: 73.4}, {name: 'He', val: 24.8}, {name: 'O', val: 0.7}], pressure: '3.4×10¹¹ atm (Core)', temp: '5,500°C (Surface)' },
    water: { present: false, details: 'Traces of water molecules completely annihilated by nuclear fusion.' },
    age: '~4.60 Billion Years', moons: { count: 8, list: 'Planets' },
    impact: 'The gravitational anchor of the system; constantly fuses 600 million tons of hydrogen every second, radiating the energy that sustains Earth.'
  },
  moon: {
    type: 'MOON', name: 'The Moon', description: 'Earth’s only natural satellite.', fact: 'The Moon is drifting away from Earth at a rate of 3.8 cm per year.',
    theme: { primary: 'rgba(100, 100, 105, 0.85)', accent: '#c0c0c0', glow: '#e0e0e0' },
    physical: { radius: '1,737 km', mass: '7.34 × 10²² kg', gravity: '1.62 m/s²', escapeVelocity: '2.38 km/s' },
    rotation: { period: '27.3 Earth days', speed: '16.7 km/h', tilt: '6.68° (to orbit)' },
    orbit: { period: '27.3 Earth days', distance: '384,400 km', speed: '1.02 km/s' },
    atmosphere: { composition: [{name: 'He', val: 25}, {name: 'Ne', val: 25}, {name: 'H', val: 23}], pressure: 'Exosphere', temp: '-173°C to 127°C' },
    water: { present: true, details: 'Ice trapped in permanently shadowed craters at the lunar poles.' },
    age: '~4.51 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Tidally locked. Creates Earth\'s oceanic tides and vitalizing climate stability by anchoring our 23-degree axial tilt.'
  },
  phobos: {
    type: 'MOON', name: 'Phobos', description: 'The larger, inner moon of Mars.', fact: 'Orbits so fast it rises in the west and sets in the east twice a day.',
    theme: { primary: 'rgba(120, 90, 80, 0.85)', accent: '#a07060', glow: '#c09080' },
    physical: { radius: '11.2 km', mass: '1.06 × 10¹⁵ kg', gravity: '0.0057 m/s²', escapeVelocity: '0.011 km/s' },
    rotation: { period: '7.6 hours', speed: '9.3 km/h', tilt: '0.01°' }, orbit: { period: '7.6 hours', distance: '9,376 km', speed: '2.13 km/s' },
    atmosphere: { composition: [{name: 'NONE', val: 100}], pressure: 'Vacuum', temp: '-112°C to -4°C' },
    water: { present: false, details: 'Completely barren dust block.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Slowly spiraling into Mars. In 50 million years, it will be ripped apart by tidal forces into a ring system.'
  },
  deimos: {
    type: 'MOON', name: 'Deimos', description: 'The smaller, outer moon of Mars.', fact: 'It is highly non-spherical and resembles a lumpy asteroid.',
    theme: { primary: 'rgba(100, 80, 70, 0.85)', accent: '#806050', glow: '#a08070' },
    physical: { radius: '6.2 km', mass: '1.47 × 10¹⁴ kg', gravity: '0.003 m/s²', escapeVelocity: '0.005 km/s' },
    rotation: { period: '30.3 hours', speed: '1.2 km/h', tilt: '0.01°' }, orbit: { period: '30.3 hours', distance: '23,460 km', speed: '1.35 km/s' },
    atmosphere: { composition: [{name: 'NONE', val: 100}], pressure: 'Vacuum', temp: '-112°C to -4°C' },
    water: { present: false, details: 'Barren.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Likely a captured asteroid from the main belt.'
  },
  io: {
    type: 'MOON', name: 'Io', description: 'The innermost Galilean moon of Jupiter.', fact: 'It is the most geologically active object in the solar system, coated in volcanoes.',
    theme: { primary: 'rgba(200, 180, 40, 0.85)', accent: '#e0c030', glow: '#ffea50' },
    physical: { radius: '1,821 km', mass: '8.93 × 10²² kg', gravity: '1.79 m/s²', escapeVelocity: '2.55 km/s' },
    rotation: { period: '42.5 hours', speed: '271 km/h', tilt: '0.0°' }, orbit: { period: '42.5 hours', distance: '421,700 km', speed: '17.3 km/s' },
    atmosphere: { composition: [{name: 'SO₂', val: 90}, {name: 'O', val: 10}], pressure: 'Extremely Thin', temp: '-130°C' },
    water: { present: false, details: 'Bone dry. Extreme tidal heating boiled away all H2O billions of years ago.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Spews one ton of ionized sulfur gas into space every second, generating a massive radiation torus around Jupiter.'
  },
  europa: {
    type: 'MOON', name: 'Europa', description: 'A smooth, icy moon of Jupiter.', fact: 'It conceals a global ocean of liquid water beneath its icy shell, a prime target for life.',
    theme: { primary: 'rgba(140, 180, 220, 0.85)', accent: '#80b0e0', glow: '#a0c0ff' },
    physical: { radius: '1,560 km', mass: '4.80 × 10²² kg', gravity: '1.31 m/s²', escapeVelocity: '2.02 km/s' },
    rotation: { period: '3.55 days', speed: '115 km/h', tilt: '0.1°' }, orbit: { period: '3.55 days', distance: '670,900 km', speed: '13.7 km/s' },
    atmosphere: { composition: [{name: 'O₂', val: 100}], pressure: 'Exosphere', temp: '-160°C' },
    water: { present: true, details: 'Contains a global liquid saltwater ocean 100km deep, holding 2x more water than Earth.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'The strongest candidate for extraterrestrial marine microbiology in our solar system.'
  },
  ganymede: {
    type: 'MOON', name: 'Ganymede', description: 'The largest moon of Jupiter and in the Solar System.', fact: 'It is larger than the planet Mercury and is the only moon known to have a magnetic field.',
    theme: { primary: 'rgba(120, 110, 100, 0.85)', accent: '#908070', glow: '#b0a090' },
    physical: { radius: '2,634 km', mass: '1.48 × 10²³ kg', gravity: '1.42 m/s²', escapeVelocity: '2.74 km/s' },
    rotation: { period: '7.15 days', speed: '96 km/h', tilt: '0.33°' }, orbit: { period: '7.15 days', distance: '1.07M km', speed: '10.8 km/s' },
    atmosphere: { composition: [{name: 'O₂', val: 100}], pressure: 'Exosphere', temp: '-163°C' },
    water: { present: true, details: 'Features a massive internal saltwater ocean sandwiched between layers of ice.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Generates its own magnetosphere, protecting its surface from Jupiter\'s lethal radiation belts.'
  },
  callisto: {
    type: 'MOON', name: 'Callisto', description: 'The outermost Galilean moon of Jupiter.', fact: 'It is the most heavily cratered object in the solar system, with an incredibly ancient surface.',
    theme: { primary: 'rgba(90, 80, 70, 0.85)', accent: '#706050', glow: '#908070' },
    physical: { radius: '2,410 km', mass: '1.07 × 10²³ kg', gravity: '1.24 m/s²', escapeVelocity: '2.44 km/s' },
    rotation: { period: '16.68 days', speed: '38 km/h', tilt: '0°' }, orbit: { period: '16.68 days', distance: '1.88M km', speed: '8.2 km/s' },
    atmosphere: { composition: [{name: 'CO₂', val: 100}], pressure: 'Exosphere', temp: '-193°C' },
    water: { present: true, details: 'Deep subsurface ocean locked beneath 250km of dead, ancient rock and ice.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Orbits completely outside Jupiter’s deadly radiation bands, making it a viable target for a human base.'
  },
  mimas: {
    type: 'MOON', name: 'Mimas', description: 'An inner moon of Saturn.', fact: 'It has a massive impact crater named Herschel, making it look strikingly like the Death Star.',
    theme: { primary: 'rgba(150, 150, 150, 0.85)', accent: '#b0b0b0', glow: '#d0d0d0' },
    physical: { radius: '198 km', mass: '3.75 × 10¹⁹ kg', gravity: '0.064 m/s²', escapeVelocity: '0.15 km/s' },
    rotation: { period: '22.6 hours', speed: '55 km/h', tilt: '0°' }, orbit: { period: '22.6 hours', distance: '185,500 km', speed: '14.3 km/s' },
    atmosphere: { composition: [{name: 'NONE', val: 100}], pressure: 'Vacuum', temp: '-209°C' },
    water: { present: true, details: 'Composed almost entirely of solid water ice.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Its gravity creates the famous Cassini Division, the massive black gap tearing through Saturn rings.'
  },
  enceladus: {
    type: 'MOON', name: 'Enceladus', description: 'A small, icy moon of Saturn.', fact: 'It shoots massive geysers of water ice into space, which actually form Saturn\'s E ring.',
    theme: { primary: 'rgba(180, 200, 220, 0.85)', accent: '#a0c0e0', glow: '#c0e0ff' },
    physical: { radius: '252 km', mass: '1.08 × 10²⁰ kg', gravity: '0.11 m/s²', escapeVelocity: '0.23 km/s' },
    rotation: { period: '32.9 hours', speed: '48 km/h', tilt: '0°' }, orbit: { period: '32.9 hours', distance: '238,000 km', speed: '12.6 km/s' },
    atmosphere: { composition: [{name: 'H₂O', val: 91}, {name: 'N₂', val: 4}, {name: 'CO₂', val: 3}], pressure: 'Geyser Plumes', temp: '-198°C' },
    water: { present: true, details: 'Global subsurface ocean spewing liquid water into space via colossal 100km geysers.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'The primary supplier of particle mass creating Saturn’s massive, diffuse E-ring.'
  },
  titan: {
    type: 'MOON', name: 'Titan', description: 'The largest moon of Saturn.', fact: 'It is the only moon with a substantial atmosphere, and has liquid methane lakes on its surface.',
    theme: { primary: 'rgba(180, 130, 50, 0.85)', accent: '#d09030', glow: '#ffb040' },
    physical: { radius: '2,574 km', mass: '1.34 × 10²³ kg', gravity: '1.35 m/s²', escapeVelocity: '2.63 km/s' },
    rotation: { period: '15.9 days', speed: '42 km/h', tilt: '0.3°' }, orbit: { period: '15.9 days', distance: '1.22M km', speed: '5.57 km/s' },
    atmosphere: { composition: [{name: 'N₂', val: 97}, {name: 'CH₄', val: 2}, {name: 'H₂', val: 1}], pressure: '146 kPa (1.5x Earth)', temp: '-179°C' },
    water: { present: true, details: 'Deep subsurface water ocean; but surface lakes/rivers are purely liquid methane/ethane.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Features complex carbon-based chemistry, serving as a frozen proxy for prebiotic Earth.'
  },
  titania: {
    type: 'MOON', name: 'Titania', description: 'The largest moon of Uranus.', fact: 'It is composed of about equal amounts of ice and rock, with massive fault canyons.',
    theme: { primary: 'rgba(140, 130, 120, 0.85)', accent: '#a09080', glow: '#c0b0a0' },
    physical: { radius: '788 km', mass: '3.40 × 10²¹ kg', gravity: '0.36 m/s²', escapeVelocity: '0.76 km/s' },
    rotation: { period: '8.7 days', speed: '23 km/h', tilt: '0°' }, orbit: { period: '8.7 days', distance: '435,900 km', speed: '3.64 km/s' },
    atmosphere: { composition: [{name: 'CO₂', val: 100}], pressure: 'Trace Exosphere', temp: '-203°C' },
    water: { present: true, details: 'Massive water ice crust covering a potential ancient subsurface ocean.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Geologically dead, holding records of primordial impacts and global structural expansion splitting the crust.'
  },
  oberon: {
    type: 'MOON', name: 'Oberon', description: 'The outermost major moon of Uranus.', fact: 'It is heavily cratered and shows little signs of internal geological activity.',
    theme: { primary: 'rgba(110, 100, 90, 0.85)', accent: '#807060', glow: '#a09080' },
    physical: { radius: '761 km', mass: '3.08 × 10²¹ kg', gravity: '0.34 m/s²', escapeVelocity: '0.73 km/s' },
    rotation: { period: '13.4 days', speed: '14 km/h', tilt: '0°' }, orbit: { period: '13.4 days', distance: '583,500 km', speed: '3.15 km/s' },
    atmosphere: { composition: [{name: 'NONE', val: 100}], pressure: 'Vacuum', temp: '-203°C' },
    water: { present: true, details: 'Geologically dead crust composed 50% of dirty water ice.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'The oldest, darkest, and most heavily cratered of all the major Uranian celestial bodies.'
  },
  triton: {
    type: 'MOON', name: 'Triton', description: 'The largest moon of Neptune.', fact: 'It orbits backward (retrograde) relative to Neptune, meaning it was likely captured from the Kuiper Belt.',
    theme: { primary: 'rgba(120, 150, 140, 0.85)', accent: '#80a090', glow: '#a0c0b0' },
    physical: { radius: '1,353 km', mass: '2.13 × 10²² kg', gravity: '0.77 m/s²', escapeVelocity: '1.45 km/s' },
    rotation: { period: '5.87 days', speed: '60 km/h', tilt: '0°' }, orbit: { period: '5.87 days (Retrograde)', distance: '354,700 km', speed: '4.39 km/s' },
    atmosphere: { composition: [{name: 'N₂', val: 99}, {name: 'CH₄', val: 1}], pressure: '1.5 Pa (Extremely Thin)', temp: '-235°C' },
    water: { present: true, details: 'Crust of frozen nitrogen over massive water ice mantle. Erupts nitrogen geysers.' },
    age: '~4.5 Billion Years', moons: { count: 0, list: 'None' },
    impact: 'Slowly spiraling inwards. In 3.6 billion years it will shatter into a massive ring tearing Neptune apart.'
  },
  galaxy: {
    type: 'GALAXY', name: 'Milky Way', description: 'A barred spiral galaxy containing 100-400 billion stars.', fact: 'It takes light 100,000 years to cross the Milky Way.',
    theme: { primary: 'rgba(50, 30, 120, 0.85)', accent: '#a060ff', glow: '#c080ff' },
    physical: { radius: '52,850 ly', mass: '1.5 × 10¹² Solar Masses', gravity: 'N/A', escapeVelocity: '550 km/s' },
    rotation: { period: '212M Years', speed: '210 km/s', tilt: '0°' }, orbit: { period: 'N/A', distance: 'N/A', speed: '600 km/s (Local Group)' },
    atmosphere: { composition: [{name: 'H', val: 74}, {name: 'He', val: 24}, {name: 'D.M.', val: 2}], pressure: 'Vacuum', temp: '-270°C' },
    water: { present: true, details: 'Massive molecular clouds holding billion of trillions of tons of ice crystals.' },
    age: '~13.6 Billion Years', moons: { count: 50, list: 'Dwarf Galaxies (Magellanic Clouds)' },
    impact: 'The overarching gravitational framework holding our entire system within its Orion-Cygnus spur.'
  },
  solar_system: {
    type: 'PLANETARY SYSTEM', name: 'Solar System',
    description: 'A gravitationally bound structure of one G-type star, eight planets, five dwarf planets, 900+ moons, and trillions of minor bodies — extending ~9.9 billion km to Neptune and ~2 light-years to the Oort Cloud.',
    fact: 'If the Sun were a basketball, Earth would be a sesame seed 26 metres away.',
    theme: { primary: 'rgba(40, 60, 120, 0.85)', accent: '#88aaff', glow: '#aaccff' },
    physical: { radius: '~4.5 × 10¹² km (to Oort Cloud)', mass: '≈ 1.0014 Solar Masses', gravity: '274.0 m/s² (at Sun surface)', escapeVelocity: '617.7 km/s (Solar)', density: '1.41 g/cm³ (Sun avg)' },
    rotation: { period: '225–250M yrs (Galactic orbit)', speed: '220 km/s around Milky Way core', tilt: '≈ 60° to galactic plane', direction: 'Counter-clockwise (north view)' },
    orbit: { period: '225–250 Million Years', distance: '26,000 light-years from Galactic Core', speed: '220 km/s', eccentricity: '≈ 0.07 (galactic)' },
    atmosphere: {
      composition: [
        { name: 'H₂ (Sun)', val: 73 }, { name: 'He (Sun)', val: 25 },
        { name: 'Gas/Ice Giants', val: 1.3 }, { name: 'Rocky Worlds', val: 0.5 },
        { name: 'Asteroids/KBOs', val: 0.2 },
      ],
      pressure: '~0.1 nPa (interplanetary medium)', temp: '-270°C (deep space) to 15,000,000°C (solar core)',
    },
    water: { present: true, details: 'Water exists in all 3 states across the system. Europa holds 2× Earth\'s ocean volume. Saturn\'s rings are 99.9% pure ice. Ice confirmed on Mercury, Mars, Moon, and in the mantles of Enceladus, Ganymede, Triton and Titan.' },
    age: '~4.568 Billion Years',
    moons: { count: 900, list: 'Moon, Titan, Ganymede, Europa, Io, Triton, Enceladus, Callisto, Titania' },
    impact: 'One of ~100 billion planetary systems in the Milky Way. Optimally placed in the galactic habitable zone — far from lethal core radiation, shielded by Jupiter\'s gravity from comet bombardment, warmed by a stable 4.6 Gyr-old G-type star sustaining Earth\'s unique biosphere.',
  },

  // ── SPACECRAFT ─────────────────────────────────────────────────────────────
  iss: {
    type: 'SPACE STATION', name: 'ISS',
    description: 'The International Space Station is the largest modular space station currently in low Earth orbit. It is a collaborative multinational project involving five participating space agencies.',
    fact: 'The ISS orbits Earth every 90 minutes, traveling at 5 miles per second.',
    theme: { primary: 'rgba(0, 229, 255, 0.4)', accent: '#00e5ff', glow: '#aaccff' },
    physical: { radius: '109 m (length)', mass: '419,725 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: '92.68 min (orbit)', speed: '7.66 km/s', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '92.68 Minutes', distance: '408 km (Altitude)', speed: '7.66 km/s', eccentricity: '0.0006' },
    atmosphere: { 
      composition: [{name: 'O₂', val: 21}, {name: 'N₂', val: 78}, {name: 'Trace', val: 1}], 
      pressure: '1 atm (Internal)', temp: '22°C (Internal)' 
    },
    water: { present: true, details: '100% recycled water system on board recovering urine and sweat.' },
    age: 'Launched 1998', moons: { count: 0, list: 'Crew: 7 (typical)' },
    impact: 'The longest continuous human presence in space, serving as a microgravity and space environment research laboratory for astrobiology, astronomy, and physics.'
  },
  hubble: {
    type: 'SPACE TELESCOPE', name: 'Hubble',
    description: 'The Hubble Space Telescope is a large, space-based observatory, which has revolutionized astronomy by providing unprecedented deep and clear views of the universe.',
    fact: 'Hubble has made over 1.5 million observations since its launch.',
    theme: { primary: 'rgba(125, 249, 255, 0.4)', accent: '#7df9ff', glow: '#aaccff' },
    physical: { radius: '13.2 m (length)', mass: '11,110 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: '95 min', speed: '7.5 km/s', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '95.4 Minutes', distance: '539 km (Altitude)', speed: '7.59 km/s', eccentricity: '0.0003' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: '-100°C to 100°C (External)' },
    water: { present: false, details: 'None' },
    age: 'Launched Apr 1990', moons: { count: 0, list: 'Instruments: ACS, WFC3, STIS, COS' },
    impact: 'Determined the rate of expansion of the universe (Hubble Constant), discovered dark energy, and imaged galaxies forming just hundreds of millions of years after the Big Bang.'
  },
  jwst: {
    type: 'SPACE TELESCOPE', name: 'JWST',
    description: 'The James Webb Space Telescope is an infrared observatory orbiting the Sun-Earth L2 Lagrange point, designed to see the universe’s first light.',
    fact: 'Its primary mirror consists of 18 gold-plated beryllium hexagonal segments.',
    theme: { primary: 'rgba(255, 215, 0, 0.4)', accent: '#ffd700', glow: '#ffe066' },
    physical: { radius: '21m (Sunshield)', mass: '6,161 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Maintains L2 alignment', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '1 Year (with Earth)', distance: '1.5 Million km from Earth (L2)', speed: 'N/A', eccentricity: 'N/A' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: '-233°C (Operating Temp)' },
    water: { present: false, details: 'None' },
    age: 'Launched Dec 2021', moons: { count: 0, list: 'Instruments: NIRCam, NIRSpec, MIRI, FGS/NIRISS' },
    impact: 'Revolutionizing our understanding of early galaxy formation, star birth, and the atmospheric composition of potentially habitable exoplanets.'
  },
  gps_a: {
    type: 'NAVIGATION SATELLITE', name: 'GPS-IIF',
    description: 'A Block IIF satellite of the Global Positioning System, providing critical timing and location data globally.',
    fact: 'GPS satellites experience time slightly faster than Earth due to general relativity, requiring constant atomic clock corrections.',
    theme: { primary: 'rgba(136, 255, 136, 0.4)', accent: '#88ff88', glow: '#aaffaa' },
    physical: { radius: 'Span: 35m', mass: '1,630 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Earth-pointing', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '11h 58m', distance: '20,200 km (MEO)', speed: '3.87 km/s', eccentricity: '0.01' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Space Environment' },
    water: { present: false, details: 'None' },
    age: 'Active', moons: { count: 0, list: 'Payload: Atomic Clocks, L-band transmitters' },
    impact: 'The backbone of modern global navigation, crucial for aviation, shipping, civilian routing, and precise financial transactions worldwide.'
  },
  gps_b: {
    type: 'NAVIGATION SATELLITE', name: 'GPS-III',
    description: 'A Block III satellite of the Global Positioning System, providing upgraded anti-jamming and civilian L1C signals.',
    fact: 'GPS Block III has 3 times better accuracy and up to 8 times improved anti-jamming capabilities compared to previous blocks.',
    theme: { primary: 'rgba(136, 255, 136, 0.4)', accent: '#88ff88', glow: '#aaffaa' },
    physical: { radius: 'Span: 35m', mass: '3,880 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Earth-pointing', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '11h 58m', distance: '20,200 km (MEO)', speed: '3.87 km/s', eccentricity: '0.01' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Space Environment' },
    water: { present: false, details: 'None' },
    age: 'Active', moons: { count: 0, list: 'Payload: Rubidium atomic clocks' },
    impact: 'Secures next-generation global navigation infrastructure for civilian and military operations.'
  },
  starlink_a: {
    type: 'COMMUNICATIONS SATELLITE', name: 'Starlink 6',
    description: 'A SpaceX Starlink v2 Mini satellite, part of a massive LEO constellation providing global high-speed internet.',
    fact: 'Starlink uses argon Hall-effect thrusters for orbit raising and station keeping.',
    theme: { primary: 'rgba(204, 187, 255, 0.4)', accent: '#ccbbff', glow: '#ddccff' },
    physical: { radius: 'Span: 30m', mass: '800 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Earth-pointing', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '~95 Minutes', distance: '530 km (LEO)', speed: '7.6 km/s', eccentricity: '0.0001' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Space Environment' },
    water: { present: false, details: 'None' },
    age: 'Active', moons: { count: 0, list: 'Payload: Ku, Ka, E-band phased arrays, Laser inter-satellite links' },
    impact: 'Democratizing internet access by providing broadband connectivity to remote and underserved locations across the globe.'
  },
  starlink_b: {
    type: 'COMMUNICATIONS SATELLITE', name: 'Starlink 7',
    description: 'A SpaceX Starlink v2 Mini satellite forming the communication backbone of the LEO internet constellation.',
    fact: 'Each v2 Mini has 4x the capacity of earlier generations.',
    theme: { primary: 'rgba(204, 187, 255, 0.4)', accent: '#ccbbff', glow: '#ddccff' },
    physical: { radius: 'Span: 30m', mass: '800 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Earth-pointing', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '~95 Minutes', distance: '530 km (LEO)', speed: '7.6 km/s', eccentricity: '0.0001' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Space Environment' },
    water: { present: false, details: 'None' },
    age: 'Active', moons: { count: 0, list: 'Payload: Laser inter-satellite links' },
    impact: 'Enabling seamless global communications.'
  },
  lro: {
    type: 'LUNAR ORBITER', name: 'LRO',
    description: 'The Lunar Reconnaissance Orbiter is a NASA robotic spacecraft currently orbiting the Moon in an eccentric polar mapping orbit.',
    fact: 'LRO has mapped 98.2% of the lunar surface, revealing the landing sites of all Apollo missions.',
    theme: { primary: 'rgba(255, 255, 255, 0.4)', accent: '#ffffff', glow: '#dddddd' },
    physical: { radius: 'Span: 4.3m', mass: '1,916 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Moon-pointing', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '113 Minutes', distance: '50 km (Altitude)', speed: '1.6 km/s', eccentricity: '0.01' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Lunar Orbit' },
    water: { present: false, details: 'None' },
    age: 'Launched Jun 2009', moons: { count: 0, list: 'Instruments: LROC, LOLA, LEND' },
    impact: 'Providing essential data for future human returns to the Moon (Artemis program) and discovering water ice in permanently shadowed lunar craters.'
  },
  perseverance: {
    type: 'PLANETARY ROVER', name: 'Perseverance',
    description: 'A car-sized Mars rover exploring Jezero Crater to search for signs of ancient microbial life and cache rock samples for future return to Earth.',
    fact: 'It carried the Ingenuity helicopter, which completed 72 flights on Mars.',
    theme: { primary: 'rgba(255, 153, 68, 0.4)', accent: '#ff9944', glow: '#ffcc88' },
    physical: { radius: 'Length: 3m', mass: '1,025 kg', gravity: '0.38g (Mars)', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'Rover speed: 152 m/h max', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'N/A', distance: 'Surface (Jezero Crater)', speed: '0 km/s', eccentricity: 'N/A' },
    atmosphere: { composition: [], pressure: 'Mars Atmospheric Pressure', temp: '-80°C to 20°C' },
    water: { present: false, details: 'Investigating ancient river deltas.' },
    age: 'Landed Feb 2021', moons: { count: 0, list: 'Instruments: Mastcam-Z, SuperCam, PIXL, SHERLOC, MOXIE' },
    impact: 'Pioneered MOXIE which successfully generated oxygen from the Martian CO2 atmosphere, a critical step for future human missions.'
  },
  curiosity: {
    type: 'PLANETARY ROVER', name: 'Curiosity',
    description: 'A car-sized Mars rover exploring Gale Crater, assessing whether Mars ever had an environment capable of supporting small life forms.',
    fact: 'Curiosity discovered organic molecules in 3-billion-year-old sedimentary rocks on Mars.',
    theme: { primary: 'rgba(255, 186, 102, 0.4)', accent: '#ffba66', glow: '#ffccaa' },
    physical: { radius: 'Length: 3m', mass: '899 kg', gravity: '0.38g (Mars)', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'Rover speed: 90 m/h max', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'N/A', distance: 'Surface (Gale Crater)', speed: '0 km/s', eccentricity: 'N/A' },
    atmosphere: { composition: [], pressure: 'Mars Atmospheric Pressure', temp: '-80°C to 20°C' },
    water: { present: false, details: 'Found concrete evidence of ancient freshwater lakes.' },
    age: 'Landed Aug 2012', moons: { count: 0, list: 'Instruments: SAM, CheMin, Mastcam, APXS' },
    impact: 'Proved definitively that ancient Mars was habitable and possessed long-lasting liquid water and the chemical building blocks of life.'
  },
  mro: {
    type: 'MARS ORBITER', name: 'MRO',
    description: 'The Mars Reconnaissance Orbiter is a NASA spacecraft designed to study the geology and climate of Mars and act as a communications relay network.',
    fact: 'MRO\'s HiRISE camera can resolve objects on the Martian surface as small as a kitchen table (0.3m/pixel).',
    theme: { primary: 'rgba(255, 102, 51, 0.4)', accent: '#ff6633', glow: '#ff9966' },
    physical: { radius: 'Span: 13.6m', mass: '2,180 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '112 Minutes', distance: '250-316 km (Altitude)', speed: '3.4 km/s', eccentricity: '0.01' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Mars Orbit' },
    water: { present: false, details: 'Mapped thousands of subsurface glaciers.' },
    age: 'Launched Aug 2005', moons: { count: 0, list: 'Instruments: HiRISE, CRISM, SHARAD' },
    impact: 'Discovered vast subsurface ice deposits and transient liquid brines on modern Mars, fundamentally altering our view of the planet\'s hydrology.'
  },
  maven: {
    type: 'MARS ORBITER', name: 'MAVEN',
    description: 'Mars Atmosphere and Volatile Evolution is a space probe designed to study the Martian atmosphere and how it is lost to space.',
    fact: 'MAVEN proved that solar wind atmospheric stripping was the primary cause of Mars losing its oceans over billions of years.',
    theme: { primary: 'rgba(255, 136, 85, 0.4)', accent: '#ff8855', glow: '#ffaa77' },
    physical: { radius: 'Span: 11.4m', mass: '2,454 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: '4.5 Hours', distance: '150-6200 km (Elliptical)', speed: 'Varies heavily', eccentricity: '0.4' },
    atmosphere: { composition: [], pressure: 'Dips into upper atmosphere', temp: 'Mars Orbit' },
    water: { present: false, details: 'Measured exact rates of atmospheric H2O loss.' },
    age: 'Launched Nov 2013', moons: { count: 0, list: 'Instruments: STATIC, SWEA, NGIMS' },
    impact: 'Solved the mystery of the Martian climate collapse from a habitable world into a frozen desert.'
  },
  voyager1: {
    type: 'DEEP SPACE PROBE', name: 'Voyager 1',
    description: 'A space probe launched by NASA to study the outer Solar System. It is the most distant human-made object from Earth, operating in interstellar space.',
    fact: 'Carries the Golden Record, a phonograph containing sounds and images selected to portray the diversity of life and culture on Earth.',
    theme: { primary: 'rgba(68, 221, 255, 0.4)', accent: '#44ddff', glow: '#88eeff' },
    physical: { radius: 'Antenna: 3.7m', mass: '723 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'Hyperbolic Departure', distance: '~163 AU (Interstellar)', speed: '17 km/s', eccentricity: 'Hyperbolic (>1)' },
    atmosphere: { composition: [], pressure: 'Interstellar Medium', temp: '-271°C' },
    water: { present: false, details: 'None' },
    age: 'Launched Sep 1977', moons: { count: 0, list: 'Power: RTG (Plutonium-238)' },
    impact: 'Discovered the active volcanoes of Jupiter\'s moon Io, the complex rings of Saturn, and was the first human artifact to cross the heliopause into the interstellar medium.'
  },
  voyager2: {
    type: 'DEEP SPACE PROBE', name: 'Voyager 2',
    description: 'The twin to Voyager 1. It remains the only spacecraft to have ever visited the ice giants, Uranus and Neptune.',
    fact: 'It completed the "Grand Tour" alignment of Jupiter, Saturn, Uranus, and Neptune—an orbital configuration that occurs only once every 175 years.',
    theme: { primary: 'rgba(68, 187, 255, 0.4)', accent: '#44bbff', glow: '#88ccff' },
    physical: { radius: 'Antenna: 3.7m', mass: '721 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'Hyperbolic Departure', distance: '~136 AU (Interstellar)', speed: '15.3 km/s', eccentricity: 'Hyperbolic (>1)' },
    atmosphere: { composition: [], pressure: 'Interstellar Medium', temp: '-271°C' },
    water: { present: false, details: 'None' },
    age: 'Launched Aug 1977', moons: { count: 0, list: 'Target: Interstellar Space' },
    impact: 'Discovered 11 new moons, the Great Dark Spot at Neptune, and proved that Uranus has an unusually tilted magnetic field.'
  },
  pioneer10: {
    type: 'DEEP SPACE PROBE', name: 'Pioneer 10',
    description: 'An American space probe that completed the first mission to the planet Jupiter. It achieved Earth escape velocity, a first for a human artifact.',
    fact: 'Carries the Pioneer plaque, depicting a man, a woman, and the location of the Sun relative to 14 pulsars.',
    theme: { primary: 'rgba(136, 170, 255, 0.4)', accent: '#88aaff', glow: '#bbccff' },
    physical: { radius: 'Antenna: 2.7m', mass: '258 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'Spin-stabilized', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'Hyperbolic Departure', distance: '~135 AU (Deep Space)', speed: '12 km/s', eccentricity: 'Hyperbolic (>1)' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Deep Space' },
    water: { present: false, details: 'None' },
    age: 'Launched Mar 1972', moons: { count: 0, list: 'Status: Contact lost 2003' },
    impact: 'First spacecraft to safely navigate the asteroid belt and obtain close-up images of Jupiter, proving such deep space missions were technically possible.'
  },
  newhorizons: {
    type: 'DEEP SPACE PROBE', name: 'New Horizons',
    description: 'An interplanetary space probe launched to explore the Pluto system and the vast Kuiper Belt beyond.',
    fact: 'New Horizons carried a portion of the ashes of Clyde Tombaugh, the astronomer who discovered Pluto in 1930.',
    theme: { primary: 'rgba(238, 136, 255, 0.4)', accent: '#ee88ff', glow: '#ffccff' },
    physical: { radius: 'Span: 2.1m', mass: '478 kg', gravity: 'Microgravity', escapeVelocity: 'N/A', density: 'N/A' },
    rotation: { period: 'N/A', speed: 'N/A', tilt: 'N/A', direction: 'N/A' },
    orbit: { period: 'Hyperbolic Departure', distance: '~60 AU (Kuiper Belt)', speed: '13.8 km/s', eccentricity: 'Hyperbolic (>1)' },
    atmosphere: { composition: [], pressure: 'Vacuum', temp: 'Deep Space' },
    water: { present: false, details: 'None' },
    age: 'Launched Jan 2006', moons: { count: 0, list: 'Instruments: LORRI, Ralph, Alice' },
    impact: 'Transformed Pluto from a pixelated blur into a complex, geologically active world with flowing nitrogen-ice glaciers and water-ice mountains.'
  }
};

function StatBlock({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px' }}>{label}</div>
      <motion.div animate={{ color: accent }} style={{ fontSize: '1.0rem', fontFamily: 'monospace', fontWeight: 300 }}>{value || '—'}</motion.div>
    </div>
  );
}

function Dashboard({ data, onClose }) {
  const theme = data.theme;
  const p = data.physical || {};
  const r = data.rotation || {};
  const o = data.orbit || {};
  const a = data.atmosphere || {};

  // Compute normalized gauge values (0–100) from real data where possible
  const gravNum = parseFloat((p.gravity || '0').replace(/[^0-9.]/g, '')) || 0;
  const gravPct = Math.min(100, (gravNum / 25) * 100);  // 25 m/s² = max (Jupiter ~24.8)
  const tempStr = a.temp || '';
  const tempMatch = tempStr.match(/[-\d]+/g);
  const maxTempC = tempMatch ? Math.max(...tempMatch.map(Number)) : 0;
  const tempPct = Math.min(100, Math.max(0, ((maxTempC + 200) / 700) * 100));
  const massStr = (p.mass || '').replace(/[^0-9.e+\-]/g, '');
  const massNum = parseFloat(massStr) || 0;
  const massPct = Math.min(100, massNum > 1e28 ? 100 : massNum > 1e26 ? 75 : massNum > 1e24 ? 50 : 25);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 150, scaleY: 0.5, filter: 'blur(25px)', borderRadius: '100px' }}
      animate={{ opacity: 1, scale: 1, y: 0, scaleY: 1, filter: 'blur(0px)', borderRadius: '24px' }}
      exit={{ opacity: 0, scale: 0.85, y: 150, scaleY: 0.5, filter: 'blur(25px)', borderRadius: '100px' }}
      transition={{ type: 'spring', damping: 14, stiffness: 100, mass: 0.6 }}
      className="dashboard-container"
      style={{
        pointerEvents: 'auto', fontFamily: 'var(--font-main, sans-serif)', color: '#fff',
        zIndex: 50, overflow: 'hidden',
        background: 'rgba(5, 10, 20, 0.55)', backdropFilter: 'blur(30px) saturate(150%)',
        border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
      }}
    >
      {/* Edge-lighting backgrounds */}
      <motion.div animate={{ background: `linear-gradient(to right, ${theme.accent}1A 0%, transparent 40%)` }} transition={{ duration: 1.2 }} style={{ position: 'absolute', inset: 0, zIndex: -2, pointerEvents: 'none' }} />
      <motion.div animate={{ background: `linear-gradient(to left, ${theme.accent}0f 0%, transparent 40%)` }} transition={{ duration: 1.2 }} style={{ position: 'absolute', inset: 0, zIndex: -2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: -2, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', opacity: 0.08, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '28px' }}>
        <motion.div animate={{ color: theme.accent }} transition={{ duration: 1.0 }}
          style={{ fontSize: '0.55rem', letterSpacing: '10px', textTransform: 'uppercase', opacity: 0.7 }}>
          Interactive Universe Explorer — Deep Telemetry
        </motion.div>
        <button onClick={onClose}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', letterSpacing: '4px', textTransform: 'uppercase', cursor: 'pointer', padding: '6px 16px', borderRadius: '2px' }}>
          ← Back
        </button>
      </div>

      {/* ── MAIN CONTENT: Left + Right ────────────────────────────────── */}
      <div className="dashboard-main">

        {/* LEFT PANEL */}
        <div className="dashboard-left-panel">
          {/* Hero title */}
          <div>
            <motion.div animate={{ color: theme.accent }} transition={{ duration: 1.0 }}
              style={{ fontSize: '0.6rem', letterSpacing: '10px', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.75 }}>
              {data.type}
            </motion.div>
            <h1 style={{ fontSize: '4.2rem', margin: 0, letterSpacing: '8px', fontWeight: 100, textTransform: 'uppercase', lineHeight: 1 }}>
              {data.name}
            </h1>
            <motion.div animate={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} transition={{ duration: 1.0 }}
              style={{ width: '90%', height: '1px', marginTop: '18px', opacity: 0.4 }} />
          </div>

          {/* Physical stats 2×3 grid */}
          <div className="stat-grid">
            <StatBlock label="Mean Radius" value={p.radius} accent={theme.accent} />
            <StatBlock label="Mass" value={p.mass} accent={theme.accent} />
            <StatBlock label="Surface Gravity" value={p.gravity} accent={theme.accent} />
            <StatBlock label="Escape Velocity" value={p.escapeVelocity} accent={theme.accent} />
            <StatBlock label="Axial Tilt" value={r.tilt} accent={theme.accent} />
            <StatBlock label="Formation Age" value={data.age} accent={theme.accent} />
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, margin: 0, letterSpacing: '0.5px' }}>
            {data.description}
          </p>

          {/* Fun fact callout */}
          {data.fact && (
            <motion.div animate={{ borderLeftColor: theme.accent }} transition={{ duration: 1.0 }}
              style={{ borderLeft: `2px solid`, paddingLeft: '14px', borderColor: theme.accent }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.55 }}>Fact</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{data.fact}</div>
            </motion.div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="dashboard-right-panel">

          {/* Atmosphere composition bars */}
          {a.composition && a.composition.length > 0 && (
            <div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '14px' }}>
                Atmospheric Composition — {a.pressure && `Surface Pressure: ${a.pressure}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
                {a.composition.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', width: '80px', flexShrink: 0 }}>{c.name}</div>
                    <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', position: 'relative' }}>
                      <motion.div
                        key={c.name} initial={{ width: 0 }}
                        animate={{ width: `${Math.min(c.val, 100)}%`, backgroundColor: theme.accent }}
                        transition={{ duration: 1.4, delay: i * 0.06, ease: 'easeOut' }}
                        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: '2px' }}
                      />
                    </div>
                    <motion.div animate={{ color: theme.accent }} style={{ fontSize: '0.7rem', fontFamily: 'monospace', width: '46px', textAlign: 'right', flexShrink: 0 }}>
                      {c.val}%
                    </motion.div>
                  </div>
                ))}
              </div>
              {a.temp && (
                <div style={{ marginTop: '10px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                  Temperature Range: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{a.temp}</span>
                </div>
              )}
            </div>
          )}

          {/* 3 Diagnostic Gauges — real data */}
          <div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Core Diagnostics</div>
            <div style={{ display: 'flex', gap: '32px' }}>
              {[
                { label: 'Gravity', pct: gravPct, value: p.gravity || '—', sub: 'm/s²' },
                { label: 'Temp Scale', pct: tempPct, value: a.temp ? `${maxTempC}°C` : '—', sub: 'Peak' },
                { label: 'Mass Scale', pct: massPct, value: p.mass ? p.mass.split(' ')[0] : '—', sub: 'relative' },
              ].map((g, i) => (
                <div key={i} style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="90" height="90" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                    <motion.circle cx="50" cy="50" r="44" fill="none" strokeWidth="3" strokeDasharray="276.5"
                      initial={{ strokeDashoffset: 276.5 }}
                      animate={{ strokeDashoffset: 276.5 - (276.5 * g.pct) / 100, stroke: theme.accent }}
                      transition={{ duration: 1.6, delay: i * 0.15, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <motion.div animate={{ color: theme.accent }} style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600, lineHeight: 1 }}>{Math.round(g.pct)}%</motion.div>
                    <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '1px' }}>{g.label}</div>
                  </div>
                </div>
              ))}

              {/* Moons badge */}
              {data.moons && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', marginLeft: '8px' }}>
                  <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px' }}>Known Moons</div>
                  <motion.div animate={{ color: theme.accent }} style={{ fontSize: '2.4rem', fontFamily: 'monospace', fontWeight: 100, lineHeight: 1 }}>{data.moons.count || 0}</motion.div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', maxWidth: '160px', lineHeight: 1.5 }}>{data.moons.list || '—'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM FULL-WIDTH TELEMETRY STRIP ─────────────────────────── */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.25 }}
        className="telemetry-strip"
        style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '22px', marginTop: '16px' }}
      >
        {/* Orbital Mechanics */}
        <div>
          <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '14px' }}>Orbital Mechanics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {[['Year Length', o.period], ['Distance from Sun', o.distance], ['Orbit Speed', o.speed], ['Eccentricity', o.eccentricity]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{l}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '14px' }}>Rotation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {[['Day Length', r.period], ['Axial Tilt', r.tilt], ['Rotation Speed', r.speed], ['Direction', r.direction]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{l}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Water & Geology */}
        <div>
          <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '14px' }}>Water & Geology</div>
          {data.water && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.div animate={{ color: data.water.present ? '#44ffaa' : '#ff6644' }} transition={{ duration: 1 }}
                style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                {data.water.present ? '● Water Detected' : '○ Water Absent'}
              </motion.div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{data.water.details || '—'}</div>
            </div>
          )}
        </div>

        {/* Physical Deep */}
        <div>
          <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '14px' }}>Physical</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {[['Escape Velocity', p.escapeVelocity], ['Density', p.density], ['Surface Pressure', a.pressure], ['Formation Age', data.age]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{l}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Systemic Impact */}
        <div>
          <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '14px' }}>Systemic Impact</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{data.impact || '—'}</div>
        </div>
      </motion.div>

    </motion.div>
  );
}


// ── SPACECRAFT ISOLATED 3D VIEWER MODAL ──────────────────────────────────────
function IsolatedModel({ url }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  const normalizedRef = useRef(false);

  useEffect(() => {
    if (!ref.current || normalizedRef.current) return;
    // Auto-fit ANY glb into a 2-unit bounding sphere regardless of real-world scale
    // By waiting for the Clone to mount, we can safely measure and scale its hierarchy
    const box = new THREE_M.Box3().setFromObject(ref.current);
    const size = box.getSize(new THREE_M.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Fallback scale if bounding box computation fails (e.g. bones/empty hierarchies)
    if (maxDim > 0 && maxDim < Infinity) {
      const uniformScale = 2.0 / maxDim;
      ref.current.scale.setScalar(uniformScale);
      
      const center = box.getCenter(new THREE_M.Vector3());
      ref.current.position.sub(center.multiplyScalar(uniformScale));
    } else {
      // Fallback manual override for notorious models
      if (url.includes('iss')) ref.current.scale.setScalar(0.04);
      if (url.includes('hubble')) ref.current.scale.setScalar(0.015);
      if (url.includes('jwst')) ref.current.scale.setScalar(0.05);
    }
    
    normalizedRef.current = true;
  });

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.18;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    }
  });

  return <Clone ref={ref} object={scene} />;
}

function SpacecraftViewer({ craft, data, onReturnToParent }) {
  const theme = data.theme || { accent: '#44aaff' };
  
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(30px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(30px)' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(2, 5, 12, 0.45)', backdropFilter: 'blur(40px) saturate(160%)',
        display: 'flex', flexDirection: 'column', pointerEvents: 'auto'
      }}
    >
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 50px', zIndex: 10 }}>
        <motion.div animate={{ color: theme.accent }} transition={{ duration: 1.0 }} style={{ fontSize: '0.65rem', letterSpacing: '12px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 600 }}>
          Spacecraft Telemetry Link
        </motion.div>
        <button
          onClick={onReturnToParent}
          style={{ background: 'transparent', border: `1px solid ${theme.accent}66`, color: '#fff', fontSize: '0.6rem', letterSpacing: '4px', textTransform: 'uppercase', cursor: 'pointer', padding: '8px 24px', borderRadius: '4px', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
          onMouseOver={e => { e.currentTarget.style.background = `${theme.accent}33`; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          ← Back to {craft.parent ? craft.parent.charAt(0).toUpperCase() + craft.parent.slice(1) : 'System'}
        </button>
      </div>

      {/* Fullscreen 3D Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'grab' }}>
        <Canvas
          camera={{ position: [0, 1.5, 4], fov: 40 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000308', 10, 60]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={3.0} color="#ffffff" castShadow />
          <directionalLight position={[-8, -4, -6]} intensity={0.8} color={theme.accent} />
          <pointLight position={[0, 0, 3]} intensity={1.2} color={theme.accent} distance={20} />
          <Suspense fallback={null}>
            <IsolatedModel url={craft.modelUrl} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            autoRotate={false}
            minDistance={1.5}
            maxDistance={12}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </div>

      {/* Floating Bottom Data Panel */}
      <div className="spacecraft-bottom-panel" style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10, width: '80%', maxWidth: '800px' }}>
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
          <h1 style={{ fontSize: '3.5rem', margin: '0 0 16px 0', letterSpacing: '12px', fontWeight: 200, textTransform: 'uppercase', textShadow: `0 0 40px ${theme.accent}88` }}>
            {data.name}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, letterSpacing: '0.5px' }}>
            {data.description}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}


// Mini solar system navigator with real texture spheres, glass hover, selection magnification
const PLANET_STRIP = [
  { id: 'sun',     tex: '/textures/8k_sun.jpg',       fallback: '#ffcc88', baseSz: 18 },
  { id: 'mercury', tex: '/textures/mercury.jpg',      fallback: '#a09080', baseSz: 10 },
  { id: 'venus',   tex: '/textures/venus.jpg',        fallback: '#ffc060', baseSz: 12 },
  { id: 'earth',   tex: '/textures/earth.jpg',        fallback: '#4a90e2', baseSz: 14 },
  { id: 'mars',    tex: '/textures/mars.jpg',         fallback: '#ff6644', baseSz: 12 },
  { id: 'jupiter', tex: '/textures/jupiter.jpg',      fallback: '#d08050', baseSz: 26 },
  { id: 'saturn',  tex: '/textures/saturn.jpg',       fallback: '#e0c080', baseSz: 22 },
  { id: 'uranus',  tex: '/textures/uranus.jpg',       fallback: '#50c0ff', baseSz: 17 },
  { id: 'neptune', tex: '/textures/neptune.jpg',      fallback: '#3060d0', baseSz: 17 },
];

function MiniSolarSystem({ selectedObject, accentColor, glowColor, onSelectObject }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="mini-solar-system" style={{
      display: 'flex', alignItems: 'center', marginBottom: '20px',
      position: 'relative',
    }}>
      {/* Connecting orbit line */}
      <div className="nav-orbit-line" style={{
        position: 'absolute', top: '50%', left: '8px', right: '8px',
        height: '1px', background: 'rgba(255,255,255,0.1)', transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }} />

      {PLANET_STRIP.map(({ id, tex, fallback, baseSz }) => {
        const isSelected = selectedObject === id;
        const isHov = hovered === id;
        const size = isSelected ? baseSz * 1.6 : baseSz;
        const isSun = id === 'sun';

        return (
          <div key={id} style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', zIndex: isSelected ? 10 : isHov ? 5 : 1,
          }}
          onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelectObject && onSelectObject(id)}
          >
            <div style={{ position: 'relative' }}>
              {/* Soft ambient glow halo for selected — no hard ring, just light */}
              {isSelected && (
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 14px 4px ${glowColor}55, 0 0 28px 8px ${glowColor}22`,
                      `0 0 22px 8px ${glowColor}99, 0 0 44px 16px ${glowColor}33`,
                      `0 0 14px 4px ${glowColor}55, 0 0 28px 8px ${glowColor}22`,
                    ]
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    inset: -10,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Main planet sphere */}
              <motion.div
                animate={{ scale: isSelected ? 1 : isHov ? 1.45 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  width: size, height: size, borderRadius: '50%',
                  position: 'relative', overflow: 'hidden',
                  // Real texture as background
                  background: tex
                    ? `url(${tex}) center/cover no-repeat`
                    : isSun
                      ? 'radial-gradient(circle at 38% 35%, #fff7c0 0%, #ffcc44 35%, #ff8800 70%, #cc4400 100%)'
                      : fallback,
                  // Sunlight shading overlay applied via a pseudo-like inner div below
                  boxShadow: isSelected
                    ? `0 0 18px ${glowColor}, 0 0 6px rgba(255,255,255,0.2)`
                    : isHov
                      ? `0 0 12px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.6)`
                      : `0 1px 4px rgba(0,0,0,0.5)`,
                  transition: 'box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease',
                  opacity: isSelected ? 1 : 0.72,
                  flexShrink: 0,
                }}
              >
                {/* Sunlight shading gradient — simulates lit hemisphere */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18) 0%, transparent 55%, rgba(0,0,0,0.55) 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Liquid glass hover shimmer */}
                {isHov && !isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 45%, transparent 70%)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(2px)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </motion.div>

              {/* Hover label */}
              {isHov && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    marginTop: '5px', fontSize: '0.42rem', letterSpacing: '1.5px',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}
                >
                  {id}
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function UIOverlay({ selectedObject, onSelectObject, onClose, isExpanded, setIsExpanded }) {
  // Fall back to Solar System data when nothing is selected
  const isSolarSystem = !selectedObject || selectedObject === 'solar_system';
  const data = OBJECT_DATA[selectedObject] || OBJECT_DATA.solar_system;

  // Intercept spacecraft clicks → render isolated 3D modal instead of planetary bottom-bar
  const craft = SPACECRAFT_DATA.find(c => c.id === selectedObject);
  const isSpacecraft = !!craft && !!craft.modelUrl;

  // When returning from spacecraft viewer, go back to the parent planet
  const handleSpacecraftClose = () => {
    if (craft?.parent) {
      onSelectObject(craft.parent);
    } else {
      onClose();
    }
  };

  return (
    <div className="ui-overlay">

      {/* ── Back button — top-left, only when a body is selected (not spacecraft modal) */}
      {!isSolarSystem && !isExpanded && !isSpacecraft && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          onClick={() => { onClose(); }}
          style={{
            position: 'absolute', top: '24px', left: '28px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.58rem', letterSpacing: '3px', textTransform: 'uppercase',
            cursor: 'pointer', padding: '8px 16px', borderRadius: '3px',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-main, sans-serif)',
            zIndex: 100, pointerEvents: 'auto',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
        >
          ← Solar System
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        {isSpacecraft ? (
          /* ── Spacecraft Isolated Modal: blurred backdrop + dedicated 3D canvas ─── */
          <SpacecraftViewer key={`sv-${selectedObject}`} craft={craft} data={data} onReturnToParent={handleSpacecraftClose} />
        ) : (
          <>
            {!isExpanded && (
              <motion.div
                key="bottom-bar"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: '16px',
                  paddingTop: '60px',
                  background: 'linear-gradient(to top, rgba(0,4,14,0.95) 0%, rgba(0,4,14,0.4) 60%, transparent 100%)',
                  pointerEvents: 'auto',
                  fontFamily: 'var(--font-main, sans-serif)',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}
              >
                {/* ── Mini Solar System Navigator ──────────────────────────── */}
                <div style={{ transform: 'scale(0.85)', marginBottom: '-10px' }}>
                  <MiniSolarSystem selectedObject={selectedObject} accentColor={data.theme.accent} glowColor={data.theme.glow} onSelectObject={onSelectObject} />
                </div>

                {/* Planet type + name */}
                <motion.div animate={{ color: data.theme.accent }} transition={{ duration: 1.0 }}
                  style={{ fontSize: '0.45rem', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>
                  {data.type}
                </motion.div>
                <h2 style={{ color: '#ffffff', fontSize: '1.6rem', letterSpacing: '10px', margin: '0 0 8px 0', lineHeight: 1, fontWeight: 200, textShadow: '0 0 20px rgba(120,180,255,0.3)' }}>
                  {data.name.toUpperCase()}
                </h2>

                {/* Two key stats */}
                {data.physical && (
                  <div style={{ display: 'flex', gap: '30px', marginBottom: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>Radius</div>
                      <motion.div animate={{ color: data.theme.accent }} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{data.physical.radius}</motion.div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>Gravity</div>
                      <motion.div animate={{ color: data.theme.accent }} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{data.physical.gravity}</motion.div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>Orbit Speed</div>
                      <motion.div animate={{ color: data.theme.accent }} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{data.orbit?.speed || 'N/A'}</motion.div>
                    </div>
                  </div>
                )}

                <p style={{ maxWidth: '500px', fontSize: '0.62rem', color: '#8090a8', lineHeight: 1.5, fontWeight: 300, margin: '8px 0 12px 0', letterSpacing: '0.5px' }}>
                  {data.description}
                </p>

                <button
                  onClick={() => setIsExpanded(true)}
                  style={{
                    background: 'transparent', border: 'none', color: '#fff',
                    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '5px',
                    cursor: 'pointer', transition: 'all 0.3s ease',
                    padding: '8px 20px', fontWeight: 600,
                    borderBottom: `1px solid rgba(255,255,255,0.2)`
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  Deep Telemetry  ›
                </button>
              </motion.div>
            )}

            {data && isExpanded && (
              <Dashboard key="dashboard" data={data} onClose={() => setIsExpanded(false)} />
            )}
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

