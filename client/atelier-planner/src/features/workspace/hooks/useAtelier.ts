import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AtelierEngine } from '../../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../../ai-agents/types';

export const useAtelier = (containerRef: RefObject<HTMLDivElement | null>) => {
  const engineRef = useRef<AtelierEngine | null>(null);
  const [placedItems, setPlacedItems] = useState<PlacedItemMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new AtelierEngine(containerRef.current, {
      onStatsUpdate: (items) => setPlacedItems([...items]),
      onSelect: (id) => setSelectedId(id)
    });
    engineRef.current = engine;

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, [containerRef]);

  return { engineRef, placedItems, selectedId };
};
