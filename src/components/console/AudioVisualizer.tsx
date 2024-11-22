/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/console/AudioVisualizer.tsx

import React, { useEffect, useRef } from 'react';
import { WavRenderer } from '@/utils/wav_renderer';
import type { AudioVisualizerProps } from '@/types/console';

export function AudioVisualizer({
  recorder,
  player,
  clientColor = '#0099ff',
  serverColor = '#009900',
}: AudioVisualizerProps) {
  // Direct port of canvas refs and context from ConsolePageOG
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);

  // Audio visualization effect - exact port from ConsolePageOG
  useEffect(() => {
    // Add missing initialization check
    if (!clientCanvasRef.current || !serverCanvasRef.current) {
      console.warn('Canvas elements not initialized');
      return;
    }

    if (!recorder || !player) {
      console.warn('Audio devices not initialized');
      return;
    }

    let isLoaded = true;
    const renderContext = {
      wavRecorder: recorder,
      wavStreamPlayer: player,
      clientCanvas: clientCanvasRef.current,
      serverCanvas: serverCanvasRef.current,
      clientCtx: null as CanvasRenderingContext2D | null,
      serverCtx: null as CanvasRenderingContext2D | null,
    };

    function renderCanvas(
      canvas: HTMLCanvasElement | null,
      ctx: CanvasRenderingContext2D | null,
      source: any,
      color: string
    ) {
      try {
        if (!canvas) return null;

        if (!canvas.width || !canvas.height) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
        }

        ctx = ctx || canvas.getContext('2d');
        if (!ctx) return null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const values =
          source.getFrequencies?.('voice')?.values || new Float32Array([0]);

        WavRenderer.drawBars(canvas, ctx, values, color, 10, 0, 8);
        return ctx;
      } catch (error) {
        console.error('Audio visualization error:', error);
        return null;
      }
    }

    function render() {
      if (!isLoaded) return;

      renderContext.clientCtx = renderCanvas(
        renderContext.clientCanvas,
        renderContext.clientCtx,
        renderContext.wavRecorder.recording ? renderContext.wavRecorder : {},
        clientColor
      );

      renderContext.serverCtx = renderCanvas(
        renderContext.serverCanvas,
        renderContext.serverCtx,
        renderContext.wavStreamPlayer.analyser
          ? renderContext.wavStreamPlayer
          : {},
        serverColor
      );

      window.requestAnimationFrame(render);
    }

    render();

    return () => {
      isLoaded = false;
    };
  }, [recorder, player, clientColor, serverColor]);

  if (!recorder || !player) {
    return null;
  }

  // Exact structure from ConsolePageOG
  return (
    <div className="visualization">
      <div className="visualization-entry client">
        <canvas ref={clientCanvasRef} />
      </div>
      <div className="visualization-entry server">
        <canvas ref={serverCanvasRef} />
      </div>
    </div>
  );
}
