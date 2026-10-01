import { useEffect, useRef } from 'react';
import type { FC, RefObject } from 'react';
import type { AtelierEngine } from '../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../ai-agents/types';
import { Office2DRenderer } from './renderer/Office2DRenderer';

interface Office2DCanvasProps {
  engineRef: RefObject<AtelierEngine | null>;
  items: PlacedItemMeta[];
  selectedId: string | null;
  labelsVisible: boolean;
  /** Phase 14.4 — live Brain state (tasks running / HITL pending). */
  brainActive: boolean;
  onSelect: (id: string | null) => void;
}

/**
 * Phase 14 — the 2D presentation of the ONE live office. Mounts/unmounts
 * freely (conditional render): it is a pure projection — every piece of
 * state arrives via props or engine reads — so the view switch can never
 * reset tasks, agents, selection, or the backend connection.
 */
export const Office2DCanvas: FC<Office2DCanvasProps> = ({ engineRef, items, selectedId, labelsVisible, brainActive, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Office2DRenderer | null>(null);

  // Latest-callback ref: renderer is created ONCE, callbacks never stale.
  // Synced in an effect (React-Compiler-safe — no ref writes during render).
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Office2DRenderer(canvas, {
      onSelect: (id) => onSelectRef.current(id),
      getAgents: () => engineRef.current?.getAgentSnapshot() ?? [],
    });
    rendererRef.current = renderer;
    renderer.start();
    return () => { renderer.dispose(); rendererRef.current = null; };
  }, [engineRef]);

  // App state → renderer (no re-init; the rAF loop picks it up next frame).
  useEffect(() => {
    rendererRef.current?.setFrame({ items, selectedId, labelsVisible, brainActive });
  }, [items, selectedId, labelsVisible, brainActive]);

  return (
    <div className="office2d-root">
      <canvas ref={canvasRef} />
    </div>
  );
};
