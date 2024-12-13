// src/lib/visualization/config.ts

/**
 * Configuration for audio visualization rendering.
 * All numbers are in relative units unless specified.
 */
export const VizConfig = {
  // Core visualization settings
  core: {
    minRadius: 0.05, // Minimum allowed radius as fraction of canvas
    maxRadius: 0.8, // Maximum allowed radius as fraction of canvas
    baseRadius: 0.15, // Base radius for calculations
    safetyThreshold: 1e-6, // Minimum value before considering zero
  },

  // Layer configuration
  layers: {
    total: 150,
    groups: [
      { ratio: 0.2, speed: 0.1, scale: 0.9 }, // Innermost, slowest
      { ratio: 0.2, speed: 0.2, scale: 1.0 },
      { ratio: 0.2, speed: 0.4, scale: 1.25 },
      { ratio: 0.2, speed: 0.6, scale: 1.4 },
      { ratio: 0.2, speed: 0.7, scale: 1.5 }, // Outermost, fastest
    ],
  },

  // Particle system settings
  particles: {
    count: 200,
    size: {
      min: 10,
      max: 15,
    },
    speed: {
      min: 0.05,
      max: 0.1,
    },
    opacity: {
      min: 0,
      max: 0.2,
    },
  },

  // Audio processing configuration
  audio: {
    frequencyBands: {
      low: { min: 0, max: 1 / 3 },
      mid: { min: 1 / 3, max: 2 / 3 },
      high: { min: 2 / 3, max: 1 },
    },
    scaling: {
      input: {
        radius: 0.8,
        high: 20,
        mid: 15,
        low: 10,
      },
      output: {
        radius: 0.5,
        high: 15,
        mid: 12,
        low: 8,
      },
    },
  },

  // Color configuration
  colors: {
    input: {
      hue: 210,
      saturation: { min: 70, max: 100 },
      lightness: { min: 45, max: 70 },
    },
    output: {
      hue: 150,
      saturation: { min: 70, max: 100 },
      lightness: { min: 45, max: 70 },
    },
    idle: {
      baseOpacity: 0.15,
      fadeRate: 0.1,
    },
  },

  // Animation timing
  animation: {
    idleSpeed: 0.3,
    idleAmplitude: 0.03,
    idleOffset: 0.97,
    particleAngleChange: 0.1,
  },
};

/**
 * Utility functions for safe calculations and debugging
 */
export const VizUtils = {
  /**
   * Ensures a number is within safe range to prevent instability
   * @param value - The number to check
   * @returns A safe number that won't cause rendering issues
   */
  safeNumber(value: number): number {
    if (Math.abs(value) < VizConfig.core.safetyThreshold) {
      return VizConfig.core.safetyThreshold * Math.sign(value);
    }
    return value;
  },

  /**
   * Safely calculates radius to prevent extreme values
   * @param baseRadius - The base radius to scale
   * @param scale - The scaling factor
   * @returns A safe radius value within configured bounds
   */
  safeRadius(baseRadius: number, scale: number): number {
    const radius = this.safeNumber(baseRadius * scale);
    return Math.min(
      Math.max(radius, VizConfig.core.minRadius),
      VizConfig.core.maxRadius
    );
  },

  /**
   * Debug logger for visualization performance
   */
  debug: {
    lastFrameTime: 0,
    frameCount: 0,

    logPerformance(timestamp: number) {
      this.frameCount++;
      if (timestamp - this.lastFrameTime > 1000) {
        console.debug(`Viz FPS: ${this.frameCount}`);
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
      }
    },
  },
};

/**
 * Types for audio visualization data
 */
export interface AudioData {
  total: number;
  low: number;
  mid: number;
  high: number;
}

export interface ParticleData {
  x: number;
  y: number;
  speed: number;
  angle: number;
  size: number;
  opacity: number;
}
