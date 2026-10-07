import { useEffect, useRef, useState } from 'react';
import type { FC, RefObject } from 'react';
import type { AtelierEngine } from '../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../ai-agents/types';
import { Office2DCanvasFallback } from './Office2DCanvasFallback';
import type { HitTarget } from './renderer/hitTest';
import type { Office2DAppState, OfficeScene } from './phaser/OfficeScene';

interface Office2DCanvasProps {
  engineRef: RefObject<AtelierEngine | null>;
  items: PlacedItemMeta[];
  selectedId: string | null;
  labelsVisible: boolean;
  /** Phase 14.4 — live Brain state (tasks running / HITL pending). */
  brainActive: boolean;
  onSelect: (id: string | null) => void;
}

function tooltipContent(hit: HitTarget): { title: string; subtitle: string } | null {
  if (!hit) return null;
  if (hit.kind === 'agent') {
    return { title: hit.agent.name, subtitle: `${hit.agent.role ?? 'Agent'} · ${(hit.agent.status ?? 'idle').toUpperCase()}` };
  }
  if (hit.kind === 'workstation') return { title: hit.label, subtitle: 'WORKSTATION' };
  if (hit.kind === 'room') return { title: hit.label, subtitle: 'ROOM' };
  return null;
}

interface Tooltip { x: number; y: number; title: string; subtitle: string }

/**
 * Phase 18 — the 2D presentation of the ONE live office, Phaser-hybrid:
 * a lazily-loaded Phaser game renders the baked architectural sheet + live
 * sprite layer; the proven Canvas renderer stays as automatic fallback if
 * the chunk fails. Pure projection either way — mounting/unmounting can
 * never reset tasks, agents, selection, or the backend connection.
 */
export const Office2DCanvas: FC<Office2DCanvasProps> = ({ engineRef, items, selectedId, labelsVisible, brainActive, onSelect }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [mode, setMode] = useState<'loading' | 'phaser' | 'fallback'>('loading');
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [zonesOn, setZonesOn] = useState(false);

  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Latest-ref for the scene deps (created once, never stale).
  const hoverRef = useRef((hit: HitTarget | null, at: { x: number; y: number }) => {
    const c = tooltipContent(hit);
    setTooltip(c && at.x >= 0 ? { x: at.x, y: at.y, ...c } : null);
  });
  const agentsRef = useRef(() => engineRef.current?.getAgentSnapshot() ?? []);

  useEffect(() => {
    let disposed = false;
    let game: import('phaser').Game | null = null;
    Promise.all([import('phaser'), import('./phaser/OfficeScene')])
      .then(([phaserMod, { OfficeScene: Scene }]) => {
        const parent = hostRef.current;
        if (disposed || !parent) return;
        // 'phaser' is typed `export = Phaser`. Its ESM build exposes the
        // namespace as NAMED exports while its CJS/UMD build exposes it as
        // `default` — accept either chunk shape (Phase 18).
        const Phaser = (phaserMod as unknown as { default?: typeof phaserMod }).default ?? phaserMod;
        const scene = new Scene({
          getAgents: () => agentsRef.current(),
          onSelect: (id) => onSelectRef.current(id),
          onHover: (hit, at) => hoverRef.current(hit, at),
        });
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent,
          backgroundColor: '#F1E7D8',
          scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
          render: { antialias: true },
          scene: [scene],
        });
        sceneRef.current = scene;
        setMode('phaser');
      })
      .catch(() => { if (!disposed) setMode('fallback'); }); // Canvas fallback engages
    return () => {
      disposed = true;
      sceneRef.current = null;
      game?.destroy(true);
      game = null;
    };
  }, []);

  // App state → scene (no re-init; the game loop picks it up next frame).
  useEffect(() => {
    const state: Office2DAppState = { items, selectedId, labelsVisible, zonesVisible: zonesOn, brainActive };
    sceneRef.current?.setAppState(state);
  }, [items, selectedId, labelsVisible, zonesOn, brainActive, mode]);

  return (
    <div className="office2d-root">
      {mode === 'fallback' ? (
        <Office2DCanvasFallback
          engineRef={engineRef} items={items} selectedId={selectedId}
          labelsVisible={labelsVisible} zonesOn={zonesOn} brainActive={brainActive}
          onSelect={onSelect} onHover={(hit, at) => hoverRef.current(hit, at)}
        />
      ) : (
        <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      )}

      <button
        type="button"
        className={`btn ${zonesOn ? 'active' : ''}`}
        style={{ position: 'absolute', top: 74, right: 328, zIndex: 30, padding: '4px 10px', fontSize: '10px' }}
        onClick={() => setZonesOn(v => !v)}
        title="Toggle zone overlay"
      >
        <i className="fa-solid fa-layer-group text-[10px]"></i> Zones
      </button>

      {tooltip && (
        <div className="office2d-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="office2d-tooltip-title">{tooltip.title}</div>
          <div className="office2d-tooltip-sub">{tooltip.subtitle}</div>
        </div>
      )}
    </div>
  );
};