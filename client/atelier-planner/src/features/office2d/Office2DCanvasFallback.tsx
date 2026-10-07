import { useEffect, useRef } from 'react';
import type { FC, RefObject } from 'react';
import type { AtelierEngine } from '../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../ai-agents/types';
import { Office2DRenderer } from './renderer/Office2DRenderer';
import type { HitTarget } from './renderer/hitTest';

interface FallbackProps {
  engineRef: RefObject<AtelierEngine | null>;
  items: PlacedItemMeta[];
  selectedId: string | null;
  labelsVisible: boolean;
  zonesOn: boolean;
  brainActive: boolean;
  onSelect: (id: string | null) => void;
  onHover: (hit: HitTarget | null, at: { x: number; y: number }) => void;
}

/** Phase 18 — the Canvas renderer as automatic fallback. Identical logic to
 *  the 14.5 Office2DCanvas (tooltip/chip now live in the parent); engages
 *  only if the Phaser chunk fails to load. Zero feature loss either path. */
export const Office2DCanvasFallback: FC<FallbackProps> = ({
  engineRef, items, selectedId, labelsVisible, zonesOn, brainActive, onSelect, onHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Office2DRenderer | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  useEffect(() => { onSelectRef.current = onSelect; onHoverRef.current = onHover; }, [onSelect, onHover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Office2DRenderer(canvas, {
      onSelect: (id) => onSelectRef.current(id),
      onHover: (hit, at) => onHoverRef.current(hit, at),
      getAgents: () => engineRef.current?.getAgentSnapshot() ?? [],
    });
    rendererRef.current = renderer;
    renderer.start();
    return () => { renderer.dispose(); rendererRef.current = null; };
  }, [engineRef]);

  useEffect(() => {
    rendererRef.current?.setFrame({ items, selectedId, labelsVisible, zonesVisible: zonesOn, hoveredId: null, brainActive });
  }, [items, selectedId, labelsVisible, zonesOn, brainActive]);

  return <canvas ref={canvasRef} />;
};