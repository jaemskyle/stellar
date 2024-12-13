// src/components/ui/AudioVisualization.tsx

import React, { useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
import {
  VizConfig,
  VizUtils,
  type AudioData,
  type ParticleData,
  type LayerGroup,
} from '@/lib/visualization/viz-config';
import { logger } from '@/utils/logger';

const VISUALIZER_SIZE = {
  width: 264, // Easily change this number
  height: 264, // And this number
};

interface AudioVisualizerProps {
  isRecording: boolean;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * Enhanced audio visualization component with sophisticated effects.
 * Provides real-time visualization of both input (microphone) and output (model speech) audio
 * using multiple layer groups, particles, and frequency-based effects.
 *
 * Features:
 * - Multiple configurable layer groups with different behaviors
 * - Dynamic opacity and size based on audio intensity
 * - Smooth transitions between states
 * - Particle effects for additional visual interest
 * - Frequency-based color variations
 * - Performance monitoring and error handling
 */
export function AudioVisualizer({
  isRecording,
  wavRecorderRef,
  wavStreamPlayerRef,
}: AudioVisualizerProps) {
  // Core refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<ParticleData[]>([]);
  const errorRef = useRef<Error | null>(null);

  useEffect(() => {
    logger.debug('Initializing audio visualization');

    const canvas = canvasRef.current;
    if (!canvas) {
      logger.error('Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('Could not get 2D context from canvas');
      return;
    }

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    let isActive = true;

    /**
     * Initialize particle system with configured settings
     */
    const initParticles = () => {
      logger.debug('Initializing particle system');
      const particles: ParticleData[] = [];

      for (let i = 0; i < VizConfig.particles.count.default; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed:
            VizConfig.particles.speed.min +
            Math.random() *
              (VizConfig.particles.speed.max - VizConfig.particles.speed.min),
          angle: Math.random() * Math.PI * 2,
          size:
            VizConfig.particles.size.min +
            Math.random() *
              (VizConfig.particles.size.max - VizConfig.particles.size.min),
          opacity:
            VizConfig.particles.opacity.min +
            Math.random() *
              (VizConfig.particles.opacity.max -
                VizConfig.particles.opacity.min),
        });
      }
      particlesRef.current = particles;
    };

    /**
     * Update particle positions and properties based on audio intensity
     */
    const updateParticles = (intensity: number) => {
      particlesRef.current.forEach(particle => {
        // Update position with intensity-based speed
        particle.x +=
          Math.cos(particle.angle) * particle.speed * (1 + intensity * 2);
        particle.y +=
          Math.sin(particle.angle) * particle.speed * (1 + intensity * 2);

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Gradually change angle for natural movement
        particle.angle +=
          (Math.random() - 0.5) * VizConfig.animation.particleAngleChange;
      });
    };

    /**
     * Render particles to canvas with intensity-based scaling
     */
    const drawParticles = (
      ctx: CanvasRenderingContext2D,
      intensity: number
    ) => {
      particlesRef.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(
          particle.x / dpr,
          particle.y / dpr,
          VizUtils.safeNumber(particle.size * (1 + intensity)),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * intensity})`;
        ctx.fill();
      });
    };

    /**
     * Process audio data into frequency bands
     */
    const processAudioData = (data?: Float32Array): AudioData => {
      if (!data) return { total: 0, low: 0, mid: 0, high: 0 };

      const total =
        Array.from(data).reduce((sum, val) => sum + Math.abs(val), 0) /
        data.length;

      const third = Math.floor(
        data.length * VizConfig.audio.frequencyBands.low.max
      );
      const twoThirds = Math.floor(
        data.length * VizConfig.audio.frequencyBands.mid.max
      );

      const low =
        Array.from(data.slice(0, third)).reduce(
          (sum, val) => sum + Math.abs(val),
          0
        ) / third;
      const mid =
        Array.from(data.slice(third, twoThirds)).reduce(
          (sum, val) => sum + Math.abs(val),
          0
        ) /
        (twoThirds - third);
      const high =
        Array.from(data.slice(twoThirds)).reduce(
          (sum, val) => sum + Math.abs(val),
          0
        ) /
        (data.length - twoThirds);

      return { total, low, mid, high };
    };

    /**
     * Get color based on frequency and input type
     */
    const getFrequencyColor = (frequency: number, isInput: boolean): string => {
      const config = isInput ? VizConfig.colors.input : VizConfig.colors.output;
      const saturation =
        config.saturation.min +
        frequency * (config.saturation.max - config.saturation.min);
      const lightness =
        config.lightness.min +
        frequency * (config.lightness.max - config.lightness.min);
      return `hsla(${config.hue}, ${saturation}%, ${lightness}%, `;
    };

    /**
     * Main visualization rendering function
     */
    const drawVisualization = (
      ctx: CanvasRenderingContext2D,
      inputData?: Float32Array,
      outputData?: Float32Array
    ) => {
      try {
        const width = ctx.canvas.width / dpr;
        const height = ctx.canvas.height / dpr;
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = VizUtils.safeNumber(
          Math.min(width, height) * VizConfig.core.baseRadius
        );

        // Clear canvas with subtle fade
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, width, height);

        const time = Date.now() / 1000;
        const inputIntensity = processAudioData(inputData);
        const outputIntensity = processAudioData(outputData);

        // Base idle animation
        const idleWave =
          Math.sin(time * VizConfig.animation.idleSpeed) *
            VizConfig.animation.idleAmplitude +
          VizConfig.animation.idleOffset;

        // Render layer groups
        let currentLayer = 0;
        VizConfig.layers.groups.forEach((group: LayerGroup) => {
          const layerCount = Math.floor(VizConfig.layers.total * group.ratio);

          for (let i = 0; i < layerCount; i++) {
            const layerRatio = currentLayer / VizConfig.layers.total;
            const phase =
              (time * (0.2 + layerRatio * group.speed) +
                (currentLayer * Math.PI) / 8) %
              (2 * Math.PI);

            // Calculate radius with safety checks
            let radius = VizUtils.safeRadius(
              baseRadius,
              (VizConfig.layers.radiusRange.min +
                layerRatio *
                  (VizConfig.layers.radiusRange.max -
                    VizConfig.layers.radiusRange.min)) *
                group.scale
            );

            // Apply audio-reactive modifications
            if (inputIntensity.total > 0) {
              radius = VizUtils.safeRadius(
                radius,
                1 + inputIntensity.total * VizConfig.audio.scaling.input.radius
              );
              radius += VizUtils.safeNumber(
                Math.sin(phase * 3) *
                  inputIntensity.high *
                  VizConfig.audio.scaling.input.high
              );
              radius += VizUtils.safeNumber(
                Math.cos(phase * 2) *
                  inputIntensity.mid *
                  VizConfig.audio.scaling.input.mid
              );
              radius += VizUtils.safeNumber(
                Math.sin(phase) *
                  inputIntensity.low *
                  VizConfig.audio.scaling.input.low
              );
            }

            if (outputIntensity.total > 0) {
              radius = VizUtils.safeRadius(
                radius,
                1 +
                  Math.sin(phase * 2) *
                    outputIntensity.total *
                    VizConfig.audio.scaling.output.radius
              );
              radius += VizUtils.safeNumber(
                Math.cos(phase * 3) *
                  outputIntensity.high *
                  VizConfig.audio.scaling.output.high
              );
              radius += VizUtils.safeNumber(
                Math.sin(phase * 2) *
                  outputIntensity.mid *
                  VizConfig.audio.scaling.output.mid
              );
              radius += VizUtils.safeNumber(
                Math.cos(phase) *
                  outputIntensity.low *
                  VizConfig.audio.scaling.output.low
              );
            }

            if (inputIntensity.total === 0 && outputIntensity.total === 0) {
              radius *= idleWave;
            }

            // Draw the layer
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

            if (outputIntensity.total > 0) {
              const color = getFrequencyColor(outputIntensity.high, false);
              ctx.strokeStyle = `${color}${0.4 - layerRatio * 0.3})`;
            } else if (inputIntensity.total > 0) {
              const color = getFrequencyColor(inputIntensity.high, true);
              ctx.strokeStyle = `${color}${0.4 - layerRatio * 0.3})`;
            } else {
              ctx.strokeStyle = `rgba(156, 163, 175, ${
                VizConfig.colors.idle.baseOpacity -
                layerRatio * VizConfig.colors.idle.fadeRate
              })`;
            }

            ctx.lineWidth = VizConfig.core.layerWidth;
            ctx.stroke();

            currentLayer++;
          }
        });

        // Update and draw particles
        const maxIntensity = Math.max(
          inputIntensity.total,
          outputIntensity.total,
          0.1
        );
        updateParticles(maxIntensity);
        drawParticles(ctx, maxIntensity);

        // Draw central indicator
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          6
        );
        gradient.addColorStop(0, isRecording ? '#3B82F6' : '#9CA3AF');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Log performance in development
        if (process.env.NODE_ENV === 'development') {
          VizUtils.debug.logPerformance(Date.now());
        }
      } catch (error) {
        logger.error('Error in visualization render:', error);
        errorRef.current = error as Error;
      }
    };

    /**
     * Animation loop
     */
    const animate = () => {
      if (!isActive) return;

      try {
        const inputData =
          wavRecorderRef.current?.getFrequencies?.('voice')?.values;
        const outputData =
          wavStreamPlayerRef.current?.getFrequencies?.('voice')?.values;

        drawVisualization(ctx, inputData, outputData);
        animationFrameRef.current = requestAnimationFrame(animate);
      } catch (error) {
        logger.error('Animation loop error:', error);
        errorRef.current = error as Error;
      }
    };

    // Initialize and start animation
    try {
      initParticles();
      animate();
    } catch (error) {
      logger.error('Error initializing visualization:', error);
      errorRef.current = error as Error;
    }

    // Cleanup
    return () => {
      logger.debug('Cleaning up visualization');
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, wavRecorderRef, wavStreamPlayerRef]);

  // Show error state in development only
  if (errorRef.current && process.env.NODE_ENV === 'development') {
    logger.error('Visualization error state:', errorRef.current);
    return (
      <div className="flex items-center justify-center text-red-500">
        Visualization Error: {errorRef.current.message}
      </div>
    );
  }

  // In production, show an empty container if there's an error
  if (errorRef.current) {
    return <div className="w-48 h-48 rounded-full bg-gray-50" />;
  }

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-full bg-gray-50"
        style={{
          width: `${VISUALIZER_SIZE.width}px`,
          height: `${VISUALIZER_SIZE.height}px`,
        }}
      />
    </div>
  );
}
