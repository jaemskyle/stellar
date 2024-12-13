import React, { useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';

interface AudioVisualizerProps {
  isRecording: boolean;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * A component that provides real-time visualization of audio input and output
 * Renders dual circular visualizations:
 * 1. Top: Input visualization (microphone) with dynamic pulse effect
 * 2. Bottom: Output visualization (model speech) with ripple effect
 */
export function AudioVisualizer({
  isRecording,
  wavRecorderRef,
  wavStreamPlayerRef,
}: AudioVisualizerProps) {
  const inputCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const inputCanvas = inputCanvasRef.current;
    const outputCanvas = outputCanvasRef.current;
    if (!inputCanvas || !outputCanvas) return;

    const inputCtx = inputCanvas.getContext('2d');
    const outputCtx = outputCanvas.getContext('2d');
    if (!inputCtx || !outputCtx) return;

    // Set canvas dimensions for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    [inputCanvas, outputCanvas].forEach(canvas => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
    });

    let isActive = true;

    const drawInputVisualization = (
      ctx: CanvasRenderingContext2D,
      audioData?: Float32Array
    ) => {
      const width = ctx.canvas.width / dpr;
      const height = ctx.canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.3;

      ctx.clearRect(0, 0, width, height);

      // Draw base circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = isRecording ? '#3B82F6' : '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isRecording && audioData) {
        // Calculate audio intensity
        const intensity =
          Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) /
          audioData.length;

        // Draw dynamic waves
        const numWaves = 3;
        const maxRadius = baseRadius * 1.5;
        const time = Date.now() / 1000;

        for (let i = 0; i < numWaves; i++) {
          const phase = (time * 2 + i * 0.7) % (2 * Math.PI);
          const waveRadius =
            baseRadius + Math.sin(phase) * intensity * maxRadius * 0.3;

          ctx.beginPath();
          ctx.arc(centerX, centerY, waveRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 - i * 0.1})`;
          ctx.stroke();
        }
      }
    };

    const drawOutputVisualization = (
      ctx: CanvasRenderingContext2D,
      audioData?: Float32Array
    ) => {
      const width = ctx.canvas.width / dpr;
      const height = ctx.canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.25;

      ctx.clearRect(0, 0, width, height);

      if (audioData) {
        // Calculate audio intensity for output
        const intensity =
          Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) /
          audioData.length;

        // Draw ripple effect
        const time = Date.now() / 1000;
        const numRipples = 5;

        for (let i = 0; i < numRipples; i++) {
          const ripplePhase = (time * 3 + i * 0.5) % (2 * Math.PI);
          const rippleRadius =
            baseRadius * (1 + Math.sin(ripplePhase) * 0.3 * intensity);

          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 - i * 0.1})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // Idle state
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const animate = () => {
      if (!isActive) return;

      // Get audio data from recorder and player
      const inputData =
        wavRecorderRef.current?.getFrequencies?.('voice')?.values;
      const outputData =
        wavStreamPlayerRef.current?.getFrequencies?.('voice')?.values;

      // Draw visualizations
      drawInputVisualization(inputCtx, inputData);
      drawOutputVisualization(outputCtx, outputData);

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
    <div className="flex flex-col items-center space-y-6">
      <canvas
        ref={inputCanvasRef}
        className="w-40 h-40 rounded-full bg-gray-50"
        style={{ width: '160px', height: '160px' }}
      />
      <canvas
        ref={outputCanvasRef}
        className="w-40 h-40 rounded-full bg-gray-50"
        style={{ width: '160px', height: '160px' }}
      />
    </div>
  );
}
