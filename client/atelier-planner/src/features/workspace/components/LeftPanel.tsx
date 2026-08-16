import type { FC } from 'react';
import { ITEM_CATALOG } from '../../furniture/catalog';
import type { Template } from '../../furniture/templates';

interface LeftPanelProps {
  mode: 'main' | 'settings';
  templates: Template[];
  activeTemplate: string | null;
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  onLoadTemplate: (name: string) => void;
  onUndo: () => void;
  onClear: () => void;
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

export const LeftPanel: FC<LeftPanelProps> = ({ mode, templates, activeTemplate, selectedType, onSelectType, onLoadTemplate, onUndo, onClear, placedCount, onHireClick, setView }) => {
  const employees = Object.entries(ITEM_CATALOG).filter(([_, item]) => item.role);
  const furniture = Object.entries(ITEM_CATALOG).filter(([_, item]) => !item.role);

  return (
    <aside className="panel" style={{ width: 240, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', background: 'var(--surface)' }}>
      {mode === 'main' ? (
        <>
          <div className="p-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--charcoal-3)' }}>AI Company</div>
            <div className="text-[12px] mt-1 font-semibold" style={{ color: 'var(--charcoal)' }}>{placedCount} Employees</div>
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin p-2">
            {NAV_ITEMS.map(item => (
              <button 
                key={item.label} 
                onClick={() => setView(item.zone as any)}
                className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <i className={`fa-solid ${item.icon} text-[12px] w-5 text-center`} style={{ color: 'var(--accent)' }}></i>
                <span className="text-[12px] font-medium" style={{ color: 'var(--charcoal)' }}>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-3 border-t" style={{ borderColor: 'var(--line)' }}>
            <div className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--charcoal-3)' }}>Hire Employee</div>
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

          <div className="p-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--charcoal)' }}>
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
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <h3 className="panel-section-title">Templates</h3>
          <div className="space-y-1.5 mb-5">
            {templates.map(t => (
              <button key={t.name} type="button" className={`item-card w-full ${activeTemplate === t.name ? 'active' : ''}`} onClick={() => onLoadTemplate(t.name)}>
                <div className="item-icon"><i className={`fa-solid ${t.icon}`}></i></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>{t.name}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--charcoal-3)' }}>{t.description}</div>
                </div>
              </button>
            ))}
          </div>

          <h3 className="panel-section-title">Furniture & Fixtures</h3>
          {/* Added scrollable container for the expanding catalog */}
          <div className="space-y-1.5 mb-5 flex-1 overflow-y-auto scroll-thin pr-1">
            {furniture.map(([key, item]) => (
              <button key={key} type="button" className={`item-card w-full ${selectedType === key ? 'active' : ''}`} onClick={() => onSelectType(selectedType === key ? null : key)}>
                <div className="item-icon"><i className={`fa-solid ${item.icon}`}></i></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>{item.name}</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>${item.price}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-auto">
            <button type="button" className="btn justify-center" onClick={onUndo}><i className="fa-solid fa-rotate-left text-[10px]"></i>Undo</button>
            <button type="button" className="btn justify-center" onClick={onClear}><i className="fa-solid fa-eraser text-[10px]"></i>Clear</button>
          </div>
        </div>
      )}
    </aside>
  );
};