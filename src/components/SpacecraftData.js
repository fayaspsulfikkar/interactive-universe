/**
 * SpacecraftData.js — Human-Made Space Objects
 *
 * Scale reference: 1 AU = 1500 scene units, Earth radius = 1 scene unit
 * Spacecraft orbiting planets use scene-unit distances (exaggerated for visibility)
 *
 * Orbit types:
 *   'leo'    — Low Earth Orbit (around Earth world-pos)
 *   'meo'    — Medium Earth Orbit
 *   'l2'     — Earth-Sun L2 fixed offset behind Earth
 *   'lunar'  — Around Moon world-pos
 *   'mars_surface' — Fixed on Mars surface
 *   'mars_orbit'   — Around Mars world-pos
 *   'probe'  — Fixed position in solar system (deep space, slow drift)
 */

const AU = 1500.0;

export const SPACECRAFT_DATA = [
  // ── Earth Orbit ────────────────────────────────────────────────────────────
  {
    id: 'iss',
    name: 'ISS',
    fullName: 'International Space Station',
    type: 'leo',
    parent: 'earth',
    orbitRadius: 28,         // scene units (~408 km, exaggerated for visibility)
    orbitPeriod: 92.68 * 60, // 92.68 minutes in seconds
    initialAngle: 0.8,
    inclinationY: 0.9,       // rad — 51.6° inclination
    color: '#00e5ff',
    size: 1.4,
  },
  {
    id: 'hubble',
    name: 'Hubble',
    fullName: 'Hubble Space Telescope',
    type: 'leo',
    parent: 'earth',
    orbitRadius: 24,         // ~547 km altitude
    orbitPeriod: 95.4 * 60,
    initialAngle: 2.1,
    inclinationY: 0.49,      // 28.5° inclination
    color: '#7df9ff',
    size: 1.2,
  },
  {
    id: 'jwst',
    name: 'JWST',
    fullName: 'James Webb Space Telescope',
    type: 'l2',
    parent: 'earth',
    // L2 is ~1.5M km behind Earth from Sun — in scene units: 1.5M/149.6M * 1500 ≈ 15 units
    // But we exaggerate to 70 units for visibility
    l2Offset: 70,
    color: '#ffd700',
    size: 1.3,
  },
  {
    id: 'gps_a',
    name: 'GPS-IIF',
    fullName: 'GPS Constellation (Block IIF)',
    type: 'meo',
    parent: 'earth',
    orbitRadius: 80,         // MEO ~20,200 km
    orbitPeriod: 12 * 3600,  // 12 hours
    initialAngle: 0.0,
    inclinationY: 0.96,
    color: '#88ff88',
    size: 0.9,
  },
  {
    id: 'gps_b',
    name: 'GPS-III',
    fullName: 'GPS Constellation (Block III)',
    type: 'meo',
    parent: 'earth',
    orbitRadius: 80,
    orbitPeriod: 12 * 3600,
    initialAngle: Math.PI * 0.5,
    inclinationY: 0.96,
    color: '#88ff88',
    size: 0.9,
  },
  {
    id: 'starlink_a',
    name: 'Starlink',
    fullName: 'Starlink Group 6 (SpaceX)',
    type: 'leo',
    parent: 'earth',
    orbitRadius: 18,         // ~550 km
    orbitPeriod: 95 * 60,
    initialAngle: 1.0,
    inclinationY: 0.96,
    color: '#ccbbff',
    size: 0.8,
  },
  {
    id: 'starlink_b',
    name: 'Starlink',
    fullName: 'Starlink Group 7 (SpaceX)',
    type: 'leo',
    parent: 'earth',
    orbitRadius: 18,
    orbitPeriod: 95 * 60,
    initialAngle: 1.0 + Math.PI,
    inclinationY: 0.96,
    color: '#ccbbff',
    size: 0.8,
  },

  // ── Moon Missions ──────────────────────────────────────────────────────────
  {
    id: 'lro',
    name: 'LRO',
    fullName: 'Lunar Reconnaissance Orbiter',
    type: 'lunar',
    parent: 'moon',
    orbitRadius: 10,
    orbitPeriod: 1.968 * 3600, // ~118 minutes
    initialAngle: 1.5,
    inclinationY: 1.57,        // near-polar orbit
    color: '#ffffff',
    size: 0.8,
  },

  // ── Mars Missions ──────────────────────────────────────────────────────────
  {
    id: 'perseverance',
    name: 'Perseverance',
    fullName: 'Mars Perseverance Rover (Jezero Crater)',
    type: 'mars_surface',
    parent: 'mars',
    surfaceOffset: [7, 0.5, 2], // scene units from Mars center
    color: '#ff9944',
    size: 0.9,
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    fullName: 'Mars Curiosity Rover (Gale Crater)',
    type: 'mars_surface',
    parent: 'mars',
    surfaceOffset: [-6, 0.3, 3],
    color: '#ffba66',
    size: 0.9,
  },
  {
    id: 'mro',
    name: 'MRO',
    fullName: 'Mars Reconnaissance Orbiter',
    type: 'mars_orbit',
    parent: 'mars',
    orbitRadius: 22,
    orbitPeriod: 1.88 * 3600,
    initialAngle: 0.5,
    inclinationY: 0.5,
    color: '#ff6633',
    size: 0.9,
  },
  {
    id: 'maven',
    name: 'MAVEN',
    fullName: 'Mars Atmosphere and Volatile EvolutioN',
    type: 'mars_orbit',
    parent: 'mars',
    orbitRadius: 35,
    orbitPeriod: 4.5 * 3600,
    initialAngle: 2.8,
    inclinationY: 1.15,
    color: '#ff8855',
    size: 0.9,
  },

  // ── Deep Space Probes ─────────────────────────────────────────────────────
  // Compressed to scene scale — actual positions approximate as of 2025
  // Voyager 1: ~163 AU from Sun (heading toward heliopause in Ophiuchus direction)
  {
    id: 'voyager1',
    name: 'Voyager 1',
    fullName: 'Voyager 1 (Interstellar Space)',
    type: 'probe',
    // Real bearing: RA ~17h 12m, Dec ~+12° — compressed to ~100k units
    position: [AU * 95 * Math.sin(4.5), AU * 95 * 0.22, AU * 95 * Math.cos(4.5)],
    color: '#44ddff',
    size: 1.5,
    trailColor: '#44ddff',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    fullName: 'Voyager 2 (Interstellar Space)',
    type: 'probe',
    // Heading toward Pavo constellation, ~135 AU
    position: [AU * 75 * Math.sin(1.2), AU * 75 * -0.62, AU * 75 * Math.cos(1.2)],
    color: '#44bbff',
    size: 1.4,
  },
  {
    id: 'pioneer10',
    name: 'Pioneer 10',
    fullName: 'Pioneer 10 — Beyond Kuiper Belt',
    type: 'probe',
    // Heading toward Taurus, ~128 AU
    position: [AU * 70 * Math.sin(2.3), AU * 70 * 0.05, AU * 70 * Math.cos(2.3)],
    color: '#88aaff',
    size: 1.2,
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    fullName: 'New Horizons — Kuiper Belt Explorer',
    type: 'probe',
    // Heading toward Sagittarius, ~58 AU (post-Pluto flyby)
    position: [AU * 55 * Math.sin(5.4), AU * 55 * -0.08, AU * 55 * Math.cos(5.4)],
    color: '#ee88ff',
    size: 1.3,
  },
];

// Map from spacecraft id to parent planet id (for orbit tracking)
export const SPACECRAFT_PARENTS = {
  iss: 'earth', hubble: 'earth', jwst: 'earth',
  gps_a: 'earth', gps_b: 'earth',
  starlink_a: 'earth', starlink_b: 'earth',
  lro: 'moon',
  perseverance: 'mars', curiosity: 'mars',
  mro: 'mars', maven: 'mars',
};
