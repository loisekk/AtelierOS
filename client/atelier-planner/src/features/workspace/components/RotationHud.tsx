/**
 * Floating rotation controls for Customize Mode — appears while a ghost is
 * being placed or an item is selected. Buttons mirror the keyboard/wheel
 * shortcuts (Q/E ±15°, R/Shift+R ±45°) and reuse the app's .hud styling.
 */
import type { FC, RefObject } from 'react';
import type { AtelierEngine } from '../../canvas/engine/AtelierEngine';
import type { PlacedItemMeta } from '../../ai-agents/types';

const ROT_FINE = Math.PI / 12; // 15°
const ROT_SNAP = Math.PI / 4;  // 45°
const normDeg = (rad: number): number => Math.round((((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI);

interface RotationHudProps {
  customizing: boolean;
  selectedType: string | null;
  selectedItem: PlacedItemMeta | null | undefined;
  ghostDegrees: number;
  engineRef: RefObject<AtelierEngine | null>;
  onUndo: () => void;
}

export const RotationHud: FC<RotationHudProps> = ({
  customizing, selectedType, selectedItem, ghostDegrees, engineRef, onUndo,
}) => {
  const placing = customizing && !!selectedType;
  const rotatingItem = customizing && !selectedType && !!selectedItem;
  if (!placing && !rotatingItem) return null;

  const degrees = placing ? ghostDegrees : normDeg(selectedItem!.rotation);
  const step = (delta: number) => {
    if (placing) engineRef.current?.rotateGhost(delta);
    else engineRef.current?.rotateSelected(delta);
  };

  return (
    <div className="hud" style={{ bottom: 64, left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold tracking-widest uppercase mr-1" style={{ color: 'var(--charcoal-3)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {placing ? 'Rotate ghost' : (selectedItem?.name ?? 'Rotate item')}
        </span>
        <button className="btn btn-icon" title="Q — rotate −15°" onClick={() => step(-ROT_FINE)}>⟲ 15°</button>
        <button className="btn btn-icon" title="E — rotate +15°" onClick={() => step(ROT_FINE)}>⟳ 15°</button>
        <button className="btn btn-icon" title="Shift+R — rotate −45°" onClick={() => step(-ROT_SNAP)}>⟲ 45°</button>
        <button className="btn btn-icon" title="R — rotate +45°" onClick={() => step(ROT_SNAP)}>⟳ 45°</button>
        {rotatingItem && (
          <button className="btn btn-icon" title="Delete selected item (Del) — undoable via Ctrl+Z"
            onClick={() => engineRef.current?.deleteSelected()}>
            <i className="fa-solid fa-trash text-[10px]" style={{ color: 'var(--danger)' }}></i>
          </button>
        )}
        <span className="font-mono text-[12px] text-center" style={{ minWidth: 44, color: 'var(--charcoal)' }}>{degrees}°</span>
        <button className="btn btn-icon" title="Undo last action (Ctrl+Z) — rotations & deletions included" onClick={onUndo}>
          <i className="fa-solid fa-rotate-left text-[10px]"></i>
        </button>
      </div>
      <div className="text-[9px] font-mono mt-1 text-center" style={{ color: 'var(--charcoal-3)' }}>
        {placing
          ? 'Q/E fine · R/Shift+R snap · Scroll fine'
          : 'Q/E fine · R/Shift+R snap · Scroll fine · Del removes · Undo reverses'}
      </div>
    </div>
  );
};