import React, { useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';

interface AudioVisualizerProps {
  isRecording: boolean;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * A unified audio visualization component that seamlessly handles both input and output audio
 * Creates a single, elegant visualization that responds differently to:
 * - User input (microphone) - Shown in shades of blue with expanding waves
 * - Model output (speech) - Shown in shades of green with contracting ripples
 *
 * The visualization maintains a continuous, fluid motion even when idle,
 * but becomes more dynamic and energetic when processing audio.
 */
export function AudioVisualizer({
  isRecording,
  wavRecorderRef,
  wavStreamPlayerRef,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

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

    const drawVisualization = (
      ctx: CanvasRenderingContext2D,
      inputData?: Float32Array,
      outputData?: Float32Array
    ) => {
      const width = ctx.canvas.width / dpr;
      const height = ctx.canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.4;

      // Clear canvas with slight fade effect for smooth transitions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(0, 0, width, height);

      const time = Date.now() / 1000;

      // Calculate audio intensities
      const inputIntensity = inputData
        ? Array.from(inputData).reduce((sum, val) => sum + Math.abs(val), 0) /
          inputData.length
        : 0;

      const outputIntensity = outputData
        ? Array.from(outputData).reduce((sum, val) => sum + Math.abs(val), 0) /
          outputData.length
        : 0;

      // Base animation for idle state - much slower and subtler
      const idleWave = Math.sin(time * 0.25) * 0.05 + 0.975;

      // Draw multiple layers of circles
      for (let i = 0; i < 200; i++) {
        // Slower phase movement for more gentle animation
        const phase =
          (time * (0.2 + i * 0.1) + (i * Math.PI) / 4) % (2 * Math.PI);

        // Calculate radius based on audio intensity and idle animation
        let radius = baseRadius * (1 + Math.sin(phase) * 0.2);

        if (inputIntensity > 0) {
          // Expand outward for input audio
          radius *= 1 + inputIntensity * 0.5;
        }

        if (outputIntensity > 0) {
          // Create ripple effect for output audio
          radius *= 1 + Math.sin(phase * 2) * outputIntensity * 0.3;
        }

        // Scale by idle wave when no audio
        if (inputIntensity === 0 && outputIntensity === 0) {
          radius *= idleWave;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

        // Color based on audio source
        if (outputIntensity > 0) {
          // Green for model output
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.6 - i * 0.1})`;
        } else if (inputIntensity > 0) {
          // Blue for user input
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.6 - i * 0.1})`;
        } else {
          // Subtle gray for idle state
          // More subtle gray for idle state with lower opacity
          ctx.strokeStyle = `rgba(156, 163, 175, ${0.2 - i * 0.03})`;
        }

        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Add central indicator dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = isRecording ? '#3B82F6' : '#9CA3AF';
      ctx.fill();
    };

    const animate = () => {
      if (!isActive) return;

      // Get both input and output audio data
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
        className="w-48 h-48 rounded-full bg-gray-50"
        style={{ width: '192px', height: '192px' }}
      />
    </div>
  );
}
