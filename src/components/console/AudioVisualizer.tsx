// src/components/console/AudioVisualizer.tsx

import React, { useEffect, useRef } from 'react';
import type { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { WavRenderer } from '@/utils/wav_renderer';

interface AudioVisualizerProps {
  recorder: WavRecorder;
  player: WavStreamPlayer;
}

export function AudioVisualizer({ recorder, player }: AudioVisualizerProps) {
  // Direct port of canvas refs from ConsolePage
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);

  // Direct port of visualization effect from ConsolePage
  useEffect(() => {
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
    }

    function render() {
      if (!isLoaded) return;

      renderContext.clientCtx = renderCanvas(
        renderContext.clientCanvas,
        renderContext.clientCtx,
        renderContext.wavRecorder.recording ? renderContext.wavRecorder : {},
        '#0099ff'
      );

      renderContext.serverCtx = renderCanvas(
        renderContext.serverCanvas,
        renderContext.serverCtx,
        renderContext.wavStreamPlayer.analyser
          ? renderContext.wavStreamPlayer
          : {},
        '#009900'
      );

      window.requestAnimationFrame(render);
    }

    render();
    return () => {
      isLoaded = false;
    };
  }, [recorder, player]);

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
