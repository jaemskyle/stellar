import React, { useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';

interface AudioVisualizationProps {
  isRecording: boolean;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * AudioVisualization provides real-time visual feedback for audio input and output.
 * It renders two canvas elements:
 * 1. A circular visualization for audio input (microphone)
 * 2. A waveform visualization for audio output (playback)
 *
 * @param isRecording - Whether audio is currently being recorded
 * @param wavRecorderRef - Reference to the WavRecorder instance for input visualization
 * @param wavStreamPlayerRef - Reference to the WavStreamPlayer instance for output visualization
 */
export function AudioVisualization({
  isRecording,
  wavRecorderRef,
  wavStreamPlayerRef,
}: AudioVisualizationProps) {
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!clientCanvasRef.current || !serverCanvasRef.current) return;

    const clientCanvas = clientCanvasRef.current;
    const serverCanvas = serverCanvasRef.current;
    const clientCtx = clientCanvas.getContext('2d');
    const serverCtx = serverCanvas.getContext('2d');

    if (!clientCtx || !serverCtx) return;

    let isLoaded = true;

    const animate = () => {
      // Draw input audio visualization (circular)
      const width = clientCanvas.width;
      const height = clientCanvas.height;

      // Clear both canvases
      clientCtx.clearRect(0, 0, width, height);
      serverCtx.clearRect(0, 0, width, height);

      // Draw input visualization
      if (isRecording) {
        // Base circle
        clientCtx.beginPath();
        clientCtx.arc(width / 2, height / 2, 50, 0, 2 * Math.PI);
        clientCtx.strokeStyle = '#666';
        clientCtx.lineWidth = 2;
        clientCtx.stroke();

        // Animated waves
        const time = Date.now() / 1000;
        const numWaves = 3;

        for (let i = 0; i < numWaves; i++) {
          const audioData =
            wavRecorderRef.current?.getFrequencies?.('voice')?.values;
          const audioInfluence = audioData
            ? Array.from(audioData).reduce((sum, val) => sum + val, 0) /
              audioData.length
            : Math.sin(time * 2 + i);

          const radius = 50 + audioInfluence * 10;

          clientCtx.beginPath();
          clientCtx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
          clientCtx.strokeStyle = `rgba(0, 153, 255, ${0.3 - i * 0.1})`;
          clientCtx.stroke();
        }
      }

      // Draw output visualization (small waveform)
      if (wavStreamPlayerRef.current?.analyser) {
        const values =
          wavStreamPlayerRef.current.getFrequencies('voice')?.values ||
          new Float32Array([0]);

        serverCtx.beginPath();
        serverCtx.moveTo(0, height / 2);

        values.forEach((value, index) => {
          const x = (index / values.length) * width;
          const y = height / 2 + (value * height) / 4;
          serverCtx.lineTo(x, y);
        });

        serverCtx.strokeStyle = '#009900';
        serverCtx.stroke();
      }

      if (isLoaded) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      isLoaded = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, wavRecorderRef, wavStreamPlayerRef]);

  return (
    <div className="relative flex flex-col items-center space-y-2">
      <canvas
        ref={clientCanvasRef}
        className="w-32 h-32 rounded-full bg-gray-50"
        width={128}
        height={128}
      />
      <canvas
        ref={serverCanvasRef}
        className="w-32 h-8 rounded-lg bg-gray-50"
        width={128}
        height={32}
      />
    </div>
  );
}
