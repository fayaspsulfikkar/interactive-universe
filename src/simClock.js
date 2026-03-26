/**
 * simClock.js — UTC-anchored simulation clock
 *
 * ALL orbital and rotation positions are derived from:
 *   simulatedTime = (Date.now() / 1000) * timeScale + _offset
 *
 * This means:
 *  • Positions are ALWAYS in sync with the real-world UTC clock.
 *  • Refreshing the page gives the same positions as not refreshing.
 *  • Changing timeScale smoothly preserves the current position.
 *  • Pause freezes the exact moment; resume continues from there.
 *  • No accumulated floating-point drift from frame deltas.
 */

export const simClock = {
  timeScale: 10000,   // 10 000× real-time by default (Earth orbits in ~52 min)
  _offset:   0,       // Correction applied when scale changes or on resume
  _paused:   false,
  _pausedAt: 0,       // simTime snapshot taken at the moment of pause
  simDelta:  0,       // Simulated seconds elapsed this frame (for smooth lerps)
  _lastSim:  null,    // Previous frame's simTime (for delta computation)

  // ── Core: current simulated time (seconds) ────────────────────────────────
  // Pure function of UTC clock — no accumulated state.
  get simTime() {
    if (this._paused) return this._pausedAt;
    return (Date.now() / 1000) * this.timeScale + this._offset;
  },

  // ── Per-frame tick (call once from Scene.jsx useFrame) ───────────────────
  // Only computes simDelta; does NOT accumulate simTime (that's the getter's job).
  tick() {
    const now = this.simTime;
    if (this._lastSim === null) { this._lastSim = now; }
    // Clamp delta: if tab blurred for a long time, don't jump wildly
    const raw = now - this._lastSim;
    this.simDelta = Math.abs(raw) < this.timeScale * 0.5 ? raw : 0;
    this._lastSim = now;
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  /**
   * Change the time scale while preserving the current simulated position.
   * Solves: (Date.now()/1000) * newScale + newOffset = currentSimTime
   */
  setScale(newScale) {
    const currentSim = this.simTime;          // snapshot before changing scale
    this.timeScale   = newScale;
    // Keep simTime continuous across the scale change
    this._offset = this._paused
      ? 0  // while paused, _pausedAt is the source of truth — offset irrelevant
      : currentSim - (Date.now() / 1000) * newScale;
    this._lastSim = this.simTime;
  },

  /**
   * Pause: freeze simTime at this exact moment.
   */
  pause() {
    if (this._paused) return;
    this._pausedAt = this.simTime;  // capture the exact UTC-derived moment
    this._paused   = true;
  },

  /**
   * Resume: adjust _offset so the simulation continues from exactly where it paused.
   * Solves: (Date.now()/1000) * timeScale + newOffset = _pausedAt
   */
  resume() {
    if (!this._paused) return;
    this._offset  = this._pausedAt - (Date.now() / 1000) * this.timeScale;
    this._paused  = false;
    this._lastSim = this.simTime;
  },

  /**
   * Reset: sync back to current UTC (zero offset, unpaused).
   */
  reset() {
    this._offset  = 0;
    this._paused  = false;
    this._lastSim = null;
  },

  isPaused() { return this._paused; },
};
