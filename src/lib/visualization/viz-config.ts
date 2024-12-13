// src/lib/visualization/viz-config.ts

/**
 * Layer group configuration type
 * @property ratio - Proportion of total layers in this group (0-1)
 * @property speed - Animation speed multiplier (0.1-2.0 recommended)
 * @property scale - Radius scale factor (0.5-2.0 recommended)
 */
export interface LayerGroup {
  ratio: number;
  speed: number;
  scale: number;
}

/**
 * Predefined layer group configurations.
 * These can be used as starting points for custom configurations.
 */
export const LayerPresets = {
  // Original 5-group configuration
  fiveGroups: [
    { ratio: 0.2, speed: 0.1, scale: 0.9 }, // Innermost, slowest
    { ratio: 0.2, speed: 0.2, scale: 1.0 },
    { ratio: 0.2, speed: 0.4, scale: 1.25 },
    { ratio: 0.2, speed: 0.6, scale: 1.4 },
    { ratio: 0.2, speed: 0.7, scale: 1.5 }, // Outermost, fastest
  ],

  // Three group configuration - more distinct layers
  threeGroups: [
    { ratio: 0.33, speed: 0.1, scale: 0.8 }, // Inner layer
    { ratio: 0.33, speed: 0.4, scale: 1.2 }, // Middle layer
    { ratio: 0.34, speed: 0.7, scale: 1.6 }, // Outer layer
  ],

  // Seven group configuration - more gradual transition
  sevenGroups: [
    { ratio: 0.14, speed: 0.1, scale: 0.8 },
    { ratio: 0.14, speed: 0.2, scale: 0.9 },
    { ratio: 0.14, speed: 0.3, scale: 1.0 },
    { ratio: 0.14, speed: 0.4, scale: 1.2 },
    { ratio: 0.14, speed: 0.5, scale: 1.3 },
    { ratio: 0.15, speed: 0.6, scale: 1.4 },
    { ratio: 0.15, speed: 0.7, scale: 1.5 },
  ],

  // Two group configuration - simple inner/outer effect
  twoGroups: [
    { ratio: 0.5, speed: 0.2, scale: 0.9 },
    { ratio: 0.5, speed: 0.6, scale: 1.4 },
  ],
} as const;

/**
 * Configuration for audio visualization rendering.
 * All numbers are in relative units unless specified.
 */
export const VizConfig = {
  // Core visualization settings
  core: {
    minRadius: 0.2, // Minimum allowed radius as fraction of canvas
    maxRadius: 2, // Maximum allowed radius as fraction of canvas
    baseRadius: 0.2, // Base radius for calculations
    safetyThreshold: 1e-3, // Minimum value before considering zero
    layerWidth: 1.5, // Width of each layer's line (pixels)
  },

  // Layer configuration
  layers: {
    total: 150, // Total number of layers across all groups
    minGroupSpeed: 0.1, // Minimum allowed speed multiplier
    maxGroupSpeed: 2.0, // Maximum allowed speed multiplier
    minGroupScale: 0.5, // Minimum allowed scale factor
    maxGroupScale: 2.0, // Maximum allowed scale factor
    groups: LayerPresets.fiveGroups, // Current layer configuration
    radiusRange: {
      min: 0.8,
      max: 1.2,
    },
  },

  // Particle system settings
  particles: {
    count: {
      min: 50, // Minimum recommended particles
      max: 500, // Maximum recommended particles
      default: 200, // Current particle count
    },
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
 * Utility functions for safe calculations, validation, and debugging
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
    return isNaN(value) ? VizConfig.core.safetyThreshold : value;
  },

  /**
   * Safely calculates radius to prevent extreme values
   * @param baseRadius - The base radius to scale
   * @param scale - The scaling factor
   * @returns A safe radius value within configured bounds
   */
  safeRadius(baseRadius: number, scale: number): number {
    const radius = this.safeNumber(baseRadius * scale);
    const minRadius = baseRadius * VizConfig.core.minRadius;
    const maxRadius = baseRadius * VizConfig.core.maxRadius;
    return Math.min(Math.max(radius, minRadius), maxRadius);
  },

  /**
   * Validates layer group configuration
   * @param groups - Array of layer groups to validate
   * @returns true if configuration is valid
   * @throws Error if configuration is invalid
   */
  validateLayerGroups(groups: LayerGroup[]): boolean {
    // Check total ratio
    const totalRatio = groups.reduce((sum, group) => sum + group.ratio, 0);
    if (Math.abs(totalRatio - 1) > 0.0001) {
      throw new Error('Layer group ratios must sum to 1.0');
    }

    // Check individual group parameters
    groups.forEach((group, index) => {
      if (
        group.speed < VizConfig.layers.minGroupSpeed ||
        group.speed > VizConfig.layers.maxGroupSpeed
      ) {
        throw new Error(`Group ${index} speed outside valid range`);
      }
      if (
        group.scale < VizConfig.layers.minGroupScale ||
        group.scale > VizConfig.layers.maxGroupScale
      ) {
        throw new Error(`Group ${index} scale outside valid range`);
      }
    });

    return true;
  },

  /**
   * Creates a new layer group configuration
   * @param numGroups - Number of groups to create
   * @param options - Optional custom settings for speed and scale ranges
   * @returns Array of evenly distributed layer groups
   */
  createLayerGroups(
    numGroups: number,
    options?: {
      minSpeed?: number;
      maxSpeed?: number;
      minScale?: number;
      maxScale?: number;
    }
  ): LayerGroup[] {
    const defaultRatio = 1 / numGroups;
    const opts = {
      minSpeed: options?.minSpeed ?? VizConfig.layers.minGroupSpeed,
      maxSpeed: options?.maxSpeed ?? VizConfig.layers.maxGroupSpeed,
      minScale: options?.minScale ?? VizConfig.layers.minGroupScale,
      maxScale: options?.maxScale ?? VizConfig.layers.maxGroupScale,
    };

    return Array.from({ length: numGroups }, (_, i) => ({
      ratio: defaultRatio,
      speed:
        opts.minSpeed + (opts.maxSpeed - opts.minSpeed) * (i / (numGroups - 1)),
      scale:
        opts.minScale + (opts.maxScale - opts.minScale) * (i / (numGroups - 1)),
    }));
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
 * Audio data structure for frequency analysis
 * @property total - Overall audio intensity (0-1)
 * @property low - Low frequency band intensity (0-1)
 * @property mid - Mid frequency band intensity (0-1)
 * @property high - High frequency band intensity (0-1)
 */
export interface AudioData {
  total: number;
  low: number;
  mid: number;
  high: number;
}

/**
 * Particle data structure for visualization effects
 * @property x - Horizontal position on canvas
 * @property y - Vertical position on canvas
 * @property speed - Movement speed
 * @property angle - Movement direction in radians
 * @property size - Particle size in pixels
 * @property opacity - Particle opacity (0-1)
 */
export interface ParticleData {
  x: number;
  y: number;
  speed: number;
  angle: number;
  size: number;
  opacity: number;
}

// // Export all types
// export type { LayerGroup, AudioData, ParticleData };
