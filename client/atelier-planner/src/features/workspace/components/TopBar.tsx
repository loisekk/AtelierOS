import React from 'react';

export const TopBar: React.FC<{ 
  view: string; setView: (v: 'office' | 'ceo' | 'command' | 'knowledge' | 'top') => void;
  brandColor: string; setBrandColor: (c: string) => void;
  toggleFire: () => void; fireActive: boolean;
  openExport: () => void; openHelp: () => void;
  openSettings: () => void;
  openDispatch: () => void;
  isListening: boolean;
  toggleListening: () => void;
  labelsVisible: boolean;
  toggleLabels: () => void;
}> = ({ view, setView, brandColor, setBrandColor, toggleFire, fireActive, openExport, openHelp, openSettings, openDispatch, isListening, toggleListening, labelsVisible, toggleLabels }) => {
  return (
    // Phase 13 G — fully transparent top bar: floating glass chips, no bar background.
    // The 3D office canvas runs behind it (full-bleed stage).
    <header className="topbar-glass">
      <div className="glass-chip">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--charcoal)' }}>
          <i className="fa-solid fa-brain text-white text-lg"></i>
        </div>
        <div>
          <div className="font-display font-bold text-[15px] leading-none" style={{ color: 'var(--charcoal)' }}>Atelier</div>
          <div className="text-[9px] tracking-[0.18em] uppercase mt-0.5" style={{ color: 'var(--charcoal-3)' }}>AI Company OS</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button className="btn btn-accent" onClick={openDispatch}>
          <i className="fa-solid fa-paper-plane text-[11px]"></i>
          <span>Dispatch Task</span>
        </button>

        <div className="glass-chip">
          <button
            className={`btn ${isListening ? 'active' : ''}`}
            style={{ border: 'none', background: isListening ? 'var(--danger)' : 'transparent', color: isListening ? 'white' : 'var(--charcoal)', boxShadow: isListening ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none' }}
            onClick={toggleListening}
          >
            <i className={`fa-solid ${isListening ? 'fa-wave-square' : 'fa-microphone'} text-[11px]`}></i>
            <span>{isListening ? 'Listening...' : 'Speak'}</span>
          </button>
        </div>

        <div className="glass-chip">
          {([
            ['office', 'fa-building', 'Office'],
            ['ceo', 'fa-user-tie', 'CEO'],
            ['command', 'fa-chart-network', 'Cmd'],
            ['top', 'fa-vector-square', '2D'],
          ] as const).map(([v, icon, label]) => (
            <button key={v} style={{ padding: '5px 11px', border: 'none', background: view === v ? 'var(--charcoal)' : 'transparent', color: view === v ? '#fff' : 'var(--charcoal-3)', fontSize: '11px', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={() => setView(v)}>
              <i className={`fa-solid ${icon} text-[10px]`}></i> {label}
            </button>
          ))}
        </div>

        <div className="glass-chip">
          <span className="text-[11px] font-medium" style={{ color: 'var(--charcoal-3)' }}>Brand</span>
          <div className="w-6 h-6 rounded-md border-2 cursor-pointer transition-transform hover:scale-110" style={{ background: brandColor, borderColor: 'var(--charcoal-3)' }} onClick={() => {
            const c = prompt("Enter color hex:", brandColor);
            if (c) setBrandColor(c);
          }}></div>
        </div>

        <div className="glass-chip">
          <button className={`btn ${labelsVisible ? '' : 'active'}`} onClick={toggleLabels} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} title="Show / hide room banners">
            <i className={`fa-solid ${labelsVisible ? 'fa-tags' : 'fa-eye-slash'} text-[11px]`}></i>
            <span>Labels</span>
          </button>
          <button className={`btn ${fireActive ? 'active' : ''}`} onClick={toggleFire} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <i className="fa-solid fa-route text-[11px]"></i><span>Fire</span>
          </button>
          <button className="btn btn-primary" onClick={openExport}><i className="fa-solid fa-file-arrow-down text-[11px]"></i><span>Export</span></button>
          <button className="btn btn-icon" onClick={openHelp}><i className="fa-solid fa-keyboard text-[11px]"></i></button>
          <button className="btn btn-icon" onClick={openSettings} title="Settings"><i className="fa-solid fa-gear text-[11px]"></i></button>
        </div>
      </div>
    </header>
  );
};