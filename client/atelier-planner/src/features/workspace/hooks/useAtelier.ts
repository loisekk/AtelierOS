import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AtelierEngine } from '../../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../../ai-agents/types';

declare global {
  interface Window {
    /** Console diagnostics: window.atelierEngine.validateLayout() etc. (Quirk #5) */
    atelierEngine?: AtelierEngine;
  }
}

export function useAtelier(containerRef: RefObject<HTMLDivElement | null>) {
  const engineRef = useRef<AtelierEngine | null>(null);
  const [placedItems, setPlacedItems] = useState<PlacedItemMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new AtelierEngine(containerRef.current, {
      // Engine mutates its internal array in place — clone to trigger re-render.
      onStatsUpdate: (items) => setPlacedItems([...items]),
      onSelect: (id) => setSelectedId(id),
    });
    engineRef.current = engine;

    // Quirk #5: expose engine for browser-console diagnostics
    window.atelierEngine = engine;

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.atelierEngine = undefined;
      engine.dispose();
      engineRef.current = null;
    };
  }, [containerRef]);

  return { engineRef, placedItems, selectedId };
}