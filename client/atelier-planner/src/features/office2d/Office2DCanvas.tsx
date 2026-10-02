import { useEffect, useRef, useState } from 'react';
import type { FC, RefObject } from 'react';
import type { AtelierEngine } from '../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../ai-agents/types';
import { Office2DRenderer } from './renderer/Office2DRenderer';
import type { HitTarget } from './renderer/hitTest';

interface Office2DCanvasProps {
  engineRef: RefObject<AtelierEngine | null>;
  items: PlacedItemMeta[];
  selectedId: string | null;
  labelsVisible: boolean;
  /** Phase 14.4 — live Brain state (tasks running / HITL pending). */
  brainActive: boolean;
  onSelect: (id: string | null) => void;
}

/** Phase 14.5 — tooltip content derived from the hit target. */
function tooltipContent(hit: HitTarget): { title: string; subtitle: string } | null {
  if (!hit) return null;
  if (hit.kind === 'agent') {
    return {
      title: hit.agent.name,
      subtitle: `${hit.agent.role ?? 'Agent'} · ${(hit.agent.status ?? 'idle').toUpperCase()}`,
    };
  }
  if (hit.kind === 'workstation') return { title: hit.label, subtitle: 'WORKSTATION' };
  if (hit.kind === 'room') return { title: hit.label, subtitle: 'ROOM' };
  return null;
}

/** Hover card — x/y are the pointer in CSS px inside the canvas (== inside
 *  this root: the canvas is inset:0, so no conversion is needed). */
interface Tooltip { x: number; y: number; title: string; subtitle: string }

/**
 * Phase 14 — the 2D presentation of the ONE live office. Mounts/unmounts
 * freely (conditional render): it is a pure projection — every piece of
 * state arrives via props or engine reads — so the view switch can never
 * reset tasks, agents, selection, or the backend connection.
 *
 * 14.5: the hover tooltip is a single DOM div (crisper typography than
 * canvas text) positioned at the pointer, and the [Zones] overlay is a
 * floating chip that flips frame.zonesVisible.
 */
export const Office2DCanvas: FC<Office2DCanvasProps> = ({ engineRef, items, selectedId, labelsVisible, brainActive, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Office2DRenderer | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [zonesOn, setZonesOn] = useState(false);

  // Latest-callback refs: the renderer is created ONCE, its callbacks never
  // go stale. Synced in an effect (React-Compiler-safe — no ref writes
  // during render; same pattern as the 14.1 onSelectRef).
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef((hit: HitTarget, at: { x: number; y: number }) => {
    const c = tooltipContent(hit);
    setTooltip(c ? { x: at.x, y: at.y, ...c } : null);
  });
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

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

  // App state → renderer (no re-init; the rAF loop picks it up next frame).
  // hoveredId is NOT pushed from here: the renderer owns hover (it runs the
  // hit-test itself) and overrides this field in every frame it draws.
  useEffect(() => {
    rendererRef.current?.setFrame({ items, selectedId, labelsVisible, zonesVisible: zonesOn, hoveredId: null, brainActive });
  }, [items, selectedId, labelsVisible, zonesOn, brainActive]);

  return (
    <div className="office2d-root">
      <canvas ref={canvasRef} />

      {/* [Zones] overlay chip — floats over the plan, clear of both panels */}
      <button
        type="button"
        className={`btn ${zonesOn ? 'active' : ''}`}
        style={{ position: 'absolute', top: 74, right: 328, zIndex: 30, padding: '4px 10px', fontSize: '10px' }}
        onClick={() => setZonesOn(v => !v)}
        title="Toggle zone overlay"
      >
        <i className="fa-solid fa-layer-group text-[10px]"></i> Zones
      </button>

      {/* Hover tooltip — DOM, for crisp typography over the canvas */}
      {tooltip && (
        <div className="office2d-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="office2d-tooltip-title">{tooltip.title}</div>
          <div className="office2d-tooltip-sub">{tooltip.subtitle}</div>
        </div>
      )}
    </div>
  );
};