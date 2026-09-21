import type { FC } from 'react';
import { ITEM_CATALOG } from '../../furniture/catalog';

interface LeftPanelProps {
  mode: 'main' | 'settings';
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  onUndo: () => void;
  onClear: () => void;
  onExitCustomize: () => void;
  placedCount: number;
  onHireClick: (type: string) => void;
  setView: (v: 'office' | 'ceo' | 'command' | 'knowledge' | 'top') => void;
}

const NAV_ITEMS = [
  { icon: 'fa-house', label: 'Home Workspace', zone: 'ceo' },
  { icon: 'fa-building', label: 'Office Floor', zone: 'office' },
  { icon: 'fa-users', label: 'Agent Space', zone: 'office' },
  { icon: 'fa-chart-network', label: 'Command Hub', zone: 'command' },
  { icon: 'fa-brain', label: 'CEO Brain', zone: 'ceo' },
  { icon: 'fa-folder-tree', label: 'Workspace Showcase', zone: 'office' },
  { icon: 'fa-book', label: 'Knowledge Hub', zone: 'knowledge' },
];

export const LeftPanel: FC<LeftPanelProps> = ({ 
  mode, 
  selectedType, 
  onSelectType, 
  onUndo, 
  onClear,
  onExitCustomize,
  placedCount, 
  onHireClick, 
  setView 
}) => {
  const employees = Object.entries(ITEM_CATALOG).filter(([_, item]) => item.role);
  const furniture = Object.entries(ITEM_CATALOG).filter(([_, item]) => !item.role);

  return (
    // Phase 13 G — floating glass column: each section is its own glass block,
    // the full-bleed 3D office glows through the frosted background.
    <aside style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, background: 'transparent', border: 'none' }}>
      {mode === 'main' ? (
        <>
          <div className="glass-card">
            <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--charcoal-3)' }}>AI Company</div>
            <div className="text-[12px] mt-1 font-semibold" style={{ color: 'var(--charcoal)' }}>{placedCount} Employees</div>
          </div>

          <div className="glass-card">
            <div className="panel-section-title">Navigation</div>
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => setView(item.zone as 'office' | 'ceo' | 'command' | 'knowledge' | 'top')}
                  className="w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-[var(--accent-soft)]"
                >
                  <i className={`fa-solid ${item.icon} text-[12px] w-5 text-center`} style={{ color: 'var(--accent)' }}></i>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--charcoal)' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="panel-section-title">Hire Employee</div>
            <div className="space-y-1.5">
              {employees.map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`item-card w-full ${selectedType === key ? 'active' : ''}`}
                  onClick={() => selectedType === key ? onSelectType(null) : onHireClick(key)}
                >
                  <div className="item-icon"><i className={`fa-solid ${item.icon}`}></i></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--charcoal)' }}>{item.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>{item.role}</div>
                  </div>
                  <i className={`fa-solid ${selectedType === key ? 'fa-xmark' : 'fa-plus'} text-[10px]`} style={{ color: 'var(--charcoal-3)' }}></i>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--charcoal)' }}>
              <i className="fa-solid fa-user-tie text-white"></i>
            </div>
            <div>
              <div className="text-[12px] font-bold" style={{ color: 'var(--charcoal)' }}>You (CEO)</div>
              <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
                Master Controller
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="glass-card">
            <button
              type="button"
              className="btn btn-primary w-full justify-center"
              onClick={onExitCustomize}
            >
              <i className="fa-solid fa-arrow-left text-[11px]"></i>
              Exit Customize Mode
            </button>
          </div>

          <div className="glass-card">
            <h3 className="panel-section-title">Furniture & Fixtures</h3>
            <div className="text-[10px] font-mono mb-3" style={{ color: 'var(--charcoal-3)' }}>
              Click item → Click floor to place<br/>
              Q/E ±15° · R/Shift+R ±45° · Scroll<br/>
              Click a placed item → rotate · Del removes · Ctrl+Z undoes
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto scroll-thin pr-1">
              {furniture.map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`item-card w-full ${selectedType === key ? 'active' : ''}`}
                  onClick={() => onSelectType(selectedType === key ? null : key)}
                >
                  <div className="item-icon"><i className={`fa-solid ${item.icon}`}></i></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>{item.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>${item.price}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button type="button" className="btn justify-center" onClick={onUndo}>
                <i className="fa-solid fa-rotate-left text-[10px]"></i>
                Undo
              </button>
              <button type="button" className="btn justify-center" onClick={onClear}>
                <i className="fa-solid fa-eraser text-[10px]"></i>
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};