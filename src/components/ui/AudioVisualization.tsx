import React, { useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';

interface AudioVisualizerProps {
  isRecording: boolean;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * Enhanced audio visualization component with sophisticated effects
 * Features:
 * - Multiple layer groups with different behaviors
 * - Dynamic opacity and size based on audio intensity
 * - Smooth transitions between states
 * - Particle effects for additional visual interest
 * - Frequency-based color variations
 */
export function AudioVisualizer({
  isRecording,
  wavRecorderRef,
  wavStreamPlayerRef,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Store particles state
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      speed: number;
      angle: number;
      size: number;
      opacity: number;
    }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    let isActive = true;

    // Initialize particles
    const initParticles = () => {
      const particles = [];
      for (let i = 0; i < 200; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 0.05 + Math.random() * 0.05,
          angle: Math.random() * Math.PI * 2,
          size: 10 + Math.random() * 5,
          opacity: Math.random() * 0.2,
        });
      }
      particlesRef.current = particles;
    };

    initParticles();

    const updateParticles = (intensity: number) => {
      particlesRef.current.forEach(particle => {
        // Update position
        particle.x +=
          Math.cos(particle.angle) * particle.speed * (1 + intensity * 2);
        particle.y +=
          Math.sin(particle.angle) * particle.speed * (1 + intensity * 2);

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Gradually change angle
        particle.angle += (Math.random() - 0.5) * 0.1;
      });
    };

    const drawParticles = (
      ctx: CanvasRenderingContext2D,
      intensity: number
    ) => {
      particlesRef.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(
          particle.x / dpr,
          particle.y / dpr,
          particle.size * (1 + intensity),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * intensity})`;
        ctx.fill();
      });
    };

    const getFrequencyColor = (frequency: number, isInput: boolean) => {
      // Create color variations based on frequency ranges
      const hue = isInput ? 210 : 150; // Base hue for input/output
      const saturation = 70 + frequency * 30; // Vary saturation with frequency
      const lightness = 45 + frequency * 25; // Vary lightness with frequency
      return `hsla(${hue}, ${saturation}%, ${lightness}%, `;
    };

    const drawVisualization = (
      ctx: CanvasRenderingContext2D,
      inputData?: Float32Array,
      outputData?: Float32Array
    ) => {
      const width = ctx.canvas.width / dpr;
      const height = ctx.canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.1; // Smaller base radius

      // Clear canvas with subtle fade
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const time = Date.now() / 1000;

      // Calculate audio intensities with frequency separation
      const processAudioData = (data?: Float32Array) => {
        if (!data) return { total: 0, low: 0, mid: 0, high: 0 };
        const total =
          Array.from(data).reduce((sum, val) => sum + Math.abs(val), 0) /
          data.length;

        // Simulate frequency bands (in reality, you'd want to use proper FFT data)
        const third = Math.floor(data.length / 3);
        const low =
          Array.from(data.slice(0, third)).reduce(
            (sum, val) => sum + Math.abs(val),
            0
          ) / third;
        const mid =
          Array.from(data.slice(third, third * 2)).reduce(
            (sum, val) => sum + Math.abs(val),
            0
          ) / third;
        const high =
          Array.from(data.slice(third * 2)).reduce(
            (sum, val) => sum + Math.abs(val),
            0
          ) / third;

        return { total, low, mid, high };
      };

      const inputIntensity = processAudioData(inputData);
      const outputIntensity = processAudioData(outputData);

      // Base idle animation - super subtle
      const idleWave = Math.sin(time * 0.3) * 0.03 + 0.97;

      // Draw many more layers with different behaviors
      const totalLayers = 150;
      const groupRatios = [0.2, 0.2, 0.2, 0.2, 0.2]; // Must sum to 1
      const groupProperties = [
        { speedMult: 0.1, radiusMult: 0.9 }, // Slow, normal radius
        { speedMult: 0.2, radiusMult: 1.0 }, // Slow, normal radius
        { speedMult: 0.4, radiusMult: 1.25 }, // Medium, larger radius
        { speedMult: 0.6, radiusMult: 1.4 }, // Fast, largest radius
        { speedMult: 0.7, radiusMult: 1.5 }, // Fast, largest radius
      ];

      const layerGroups = groupRatios.map((ratio, index) => {
        const count =
          index === groupRatios.length - 1
            ? totalLayers -
              Math.floor(
                totalLayers *
                  groupRatios.slice(0, -1).reduce((a, b) => a + b, 0)
              )
            : Math.floor(totalLayers * ratio);

        return {
          count,
          ...groupProperties[index],
        };
      });

      let currentLayer = 0;
      layerGroups.forEach(group => {
        for (let i = 0; i < group.count; i++) {
          const layerRatio = currentLayer / totalLayers;
          const phase =
            (time * (0.2 + layerRatio * group.speedMult) +
              (currentLayer * Math.PI) / 8) %
            (2 * Math.PI);

          // Calculate radius with wider range
          let radius = baseRadius * (0.8 + layerRatio * 1.2) * group.radiusMult;

          // Apply audio-reactive modifications
          if (inputIntensity.total > 0) {
            // Expand outward for input audio with frequency influence
            radius *= 1 + inputIntensity.total * 0.8;
            radius += Math.sin(phase * 3) * inputIntensity.high * 20;
            radius += Math.cos(phase * 2) * inputIntensity.mid * 15;
            radius += Math.sin(phase) * inputIntensity.low * 10;
          }

          if (outputIntensity.total > 0) {
            // Create dynamic ripples for output audio
            radius *= 1 + Math.sin(phase * 2) * outputIntensity.total * 0.5;
            radius += Math.cos(phase * 3) * outputIntensity.high * 15;
            radius += Math.sin(phase * 2) * outputIntensity.mid * 12;
            radius += Math.cos(phase) * outputIntensity.low * 8;
          }

          // Apply idle animation when no audio
          if (inputIntensity.total === 0 && outputIntensity.total === 0) {
            radius *= idleWave;
          }

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

          // Sophisticated color handling
          if (outputIntensity.total > 0) {
            // Output audio colors
            const color = getFrequencyColor(outputIntensity.high, false);
            ctx.strokeStyle = `${color}${0.4 - layerRatio * 0.3})`;
          } else if (inputIntensity.total > 0) {
            // Input audio colors
            const color = getFrequencyColor(inputIntensity.high, true);
            ctx.strokeStyle = `${color}${0.4 - layerRatio * 0.3})`;
          } else {
            // Idle state colors - very subtle gradient
            ctx.strokeStyle = `rgba(156, 163, 175, ${0.15 - layerRatio * 0.1})`;
          }

          ctx.lineWidth = 1.5;
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

      // Central indicator with gradient
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
    };

    const animate = () => {
      if (!isActive) return;

      const inputData =
        wavRecorderRef.current?.getFrequencies?.('voice')?.values;
      const outputData =
        wavStreamPlayerRef.current?.getFrequencies?.('voice')?.values;

      drawVisualization(ctx, inputData, outputData);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, wavRecorderRef, wavStreamPlayerRef]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-64 h-64 rounded-full bg-gray-50"
        style={{ width: '256px', height: '256px' }}
      />
    </div>
  );
}
