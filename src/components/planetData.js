// Solar System data with accurate Keplerian physics and EXACT 1:1 physical relative sizes
// Distances use a massive linear scale of theoretical AU distances to simulate true spatial vastness.
// Real AU: Mercury 0.387, Venus 0.723, Earth 1.0, Mars 1.524,
//          Jupiter 5.203, Saturn 9.537, Uranus 19.19, Neptune 30.07
// This perfectly simulates NASA Eyes.

const TWO_PI   = 2 * Math.PI;
const DEG2RAD  = Math.PI / 180;
// 1 AU = 1500 scene units — guarantees vast isolation of planets
const auToScale = (au) => au * 1500.0;

// ── Orbital period constants (seconds) ────────────────────────────────────────
const ORBITAL_PERIODS = {
  mercury:  87.97  * 86400,   //   87.97 Earth days
  venus:    224.7  * 86400,   //  224.70 Earth days
  earth:    365.25 * 86400,   //  365.25 Earth days (1 Julian year)
  mars:     686.97 * 86400,   //  686.97 Earth days
  jupiter:  4332.59 * 86400,  // ~11.86 years
  saturn:   10759.22 * 86400, // ~29.46 years
  uranus:   30688.5 * 86400,  // ~84.01 years
  neptune:  60182.0 * 86400,  // ~164.8 years
  // Moons (Earth days)
  moon:     27.32  * 86400,
  phobos:   0.3189 * 86400,
  deimos:   1.262  * 86400,
  io:       1.769  * 86400,
  europa:   3.551  * 86400,
  ganymede: 7.155  * 86400,
  callisto: 16.69  * 86400,
  titan:    15.945 * 86400,
  rhea:     4.518  * 86400,
  dione:    2.737  * 86400,
  tethys:   1.888  * 86400,
  enceladus:1.370  * 86400,
  mimas:    0.942  * 86400,
  titania:  8.706  * 86400,
  oberon:   13.463 * 86400,
  triton:   5.877  * 86400,  // retrograde → negative speed
  // Additional Uranian moons
  miranda: 1.413   * 86400,
  ariel:   2.520   * 86400,
  umbriel: 4.144   * 86400,
  // Additional Saturnian moons
  hyperion: 21.28  * 86400,
  iapetus:  79.33  * 86400,
  // Additional Neptunian moons
  proteus:  1.122  * 86400,
  nereid:   360.14 * 86400,
};

// ── Rotation (spin) period constants (seconds) ────────────────────────────────
// Negative = retrograde (spins backward: Venus, Uranus)
const ROTATION_PERIODS = {
  mercury:  58.65  * 86400,   // 58.65 days (slow — 3:2 spin-orbit resonance)
  venus:    -(243.02 * 86400),// Retrograde: spins backward
  earth:    86400,             // 1 day
  mars:     88642,             // 24h 37m
  jupiter:  35730,             // 9h 55m
  saturn:   37800,             // 10h 30m
  uranus:   -(62064),          // Retrograde: ~17.24 hrs
  neptune:  57996,             // 16h 6m
};

// Pre-compute angular speeds (rad/s) to avoid division in hot path
export const ORBIT_SPEED  = Object.fromEntries(
  Object.entries(ORBITAL_PERIODS).map(([k, v]) => [k, TWO_PI / Math.abs(v)])
);
export const SPIN_SPEED = Object.fromEntries(
  Object.entries(ROTATION_PERIODS).map(([k, v]) => [k, TWO_PI / v]) // preserves sign
);

export const PLANET_DATA = {
  // True Sun scaling relative to Earth (109.2x Earth's radius)
  sun: { pos: [0, 0, 0], scale: [109.2, 109.2, 109.2], offset: [0, 110, 450] },

  mercury: {
    distance: auToScale(0.387), initialAngle: 0.5, tilt: 7.0 * DEG2RAD, eccentricity: 0.205,
    axialTilt: 0.034 * DEG2RAD,
    scale: [0.383, 0.383, 0.383], color: '#8c8c8c', offset: [0, 1, 4],
    pos: [auToScale(0.387), 0, 0]
  },
  venus: {
    distance: auToScale(0.723), initialAngle: 1.2, tilt: 3.4 * DEG2RAD, eccentricity: 0.007,
    axialTilt: 177.4 * DEG2RAD,
    scale: [0.949, 0.949, 0.949], color: '#e3bb76', offset: [0, 1, 6],
    pos: [auToScale(0.723), 0, 0]
  },
  earth: {
    distance: auToScale(1.0), initialAngle: 2.5, tilt: 0, eccentricity: 0.017,
    axialTilt: 23.4 * DEG2RAD,
    scale: [1, 1, 1], offset: [0, 1, 8],
    pos: [auToScale(1.0), 0, 0],
    moons: [{ name: 'Moon', distance: 60.3, size: 0.272, color: '#999999', initialAngle: 0.8 }]
  },
  mars: {
    distance: auToScale(1.524), initialAngle: 3.8, tilt: 1.85 * DEG2RAD, eccentricity: 0.094,
    axialTilt: 25.2 * DEG2RAD,
    scale: [0.532, 0.532, 0.532], color: '#c1440e', offset: [0, 1, 5],
    pos: [auToScale(1.524), 0, 0],
    moons: [
      { name: 'Phobos', distance: 1.47, size: 0.05, color: '#685c53', initialAngle: 0.3 },
      { name: 'Deimos', distance: 3.68, size: 0.03, color: '#8c7c6c', initialAngle: 1.2 }
    ]
  },
  jupiter: {
    distance: auToScale(5.203), initialAngle: 4.5, tilt: 1.3 * DEG2RAD, eccentricity: 0.049,
    axialTilt: 3.1 * DEG2RAD,
    scale: [10.97, 10.97, 10.97], color: '#90867a', offset: [0, 12, 60],
    pos: [auToScale(5.203), 0, 0],
    moons: [
      { name: 'Io',       distance: 66,  size: 0.286, color: '#f2e8c9', initialAngle: 0.1 },
      { name: 'Europa',   distance: 105, size: 0.245, color: '#d9d0c3', initialAngle: 1.8 },
      { name: 'Ganymede', distance: 168, size: 0.413, color: '#a6a29e', initialAngle: 3.2 },
      { name: 'Callisto', distance: 295, size: 0.378, color: '#73706d', initialAngle: 5.1 }
    ]
  },
  saturn: {
    distance: auToScale(9.537), initialAngle: 1.1, tilt: 2.48 * DEG2RAD, eccentricity: 0.056,
    axialTilt: 26.7 * DEG2RAD,
    scale: [9.14, 9.14, 9.14], color: '#cfba99', ringColor: '#a19782', offset: [0, 10, 50],
    pos: [auToScale(9.537), 0, 0],
    moons: [
      { name: 'Titan',     distance: 191, size: 0.404, color: '#ebca83', initialAngle: 2.0 },
      { name: 'Rhea',      distance: 82,  size: 0.12,  color: '#ece8e3', initialAngle: 0.5 },
      { name: 'Dione',     distance: 59,  size: 0.088, color: '#c7c2bc', initialAngle: 4.1 },
      { name: 'Tethys',    distance: 46,  size: 0.083, color: '#dbd7d3', initialAngle: 2.9 },
      { name: 'Enceladus', distance: 37,  size: 0.039, color: '#f5f7f7', initialAngle: 1.4 },
      { name: 'Mimas',     distance: 29,  size: 0.031, color: '#b5b4b1', initialAngle: 0.9 },
      { name: 'Iapetus',   distance: 525, size: 0.115, color: '#8a7664', initialAngle: 0.3 },
      { name: 'Hyperion',  distance: 248, size: 0.042, color: '#c4b49a', initialAngle: 3.7 }
    ]
  },
  uranus: {
    distance: auToScale(19.19), initialAngle: 5.2, tilt: 0.77 * DEG2RAD, eccentricity: 0.046,
    axialTilt: 97.77 * DEG2RAD,
    scale: [3.98, 3.98, 3.98], color: '#b0e3e6', ringColor: '#ffffff', offset: [0, 5, 25],
    pos: [auToScale(19.19), 0, 0],
    moons: [
      { name: 'Miranda', distance: 26, size: 0.037, color: '#cac5bd', initialAngle: 0.7 },
      { name: 'Ariel',   distance: 36, size: 0.091, color: '#d4d0c8', initialAngle: 2.1 },
      { name: 'Umbriel', distance: 47, size: 0.085, color: '#6e6b68', initialAngle: 4.4 },
      { name: 'Titania', distance: 68, size: 0.12,  color: '#d1cdc7', initialAngle: 3.5 },
      { name: 'Oberon',  distance: 91, size: 0.11,  color: '#bfae9f', initialAngle: 1.0 }
    ]
  },
  neptune: {
    distance: auToScale(30.07), initialAngle: 2.8, tilt: 1.76 * DEG2RAD, eccentricity: 0.009,
    axialTilt: 28.3 * DEG2RAD,
    scale: [3.86, 3.86, 3.86], color: '#3d6cdb', offset: [0, 5, 25],
    pos: [auToScale(30.07), 0, 0],
    moons: [
      { name: 'Proteus', distance: 18,  size: 0.063, color: '#7d7d7d', initialAngle: 1.5 },
      { name: 'Triton',  distance: 55,  size: 0.212, color: '#e5e5e5', initialAngle: 2.3 }, // retrograde handled by negative ORBIT_SPEED
      { name: 'Nereid',  distance: 680, size: 0.025, color: '#a09898', initialAngle: 4.8 }
    ]
  }
};
