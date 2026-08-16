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
}> = ({ view, setView, brandColor, setBrandColor, toggleFire, fireActive, openExport, openHelp, openSettings, openDispatch, isListening, toggleListening }) => {
  return (
    <header className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', height: '60px', borderBottom: '1px solid var(--line)', zIndex: 50, position: 'relative', background: 'var(--surface)' }}>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--charcoal)' }}>
            <i className="fa-solid fa-brain text-white text-lg"></i>
          </div>
          <div>
            <div className="font-display font-bold text-[15px] leading-none" style={{ color: 'var(--charcoal)' }}>Atelier</div>
            <div className="text-[9px] tracking-[0.18em] uppercase mt-0.5" style={{ color: 'var(--charcoal-3)' }}>AI Company OS</div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5">
        <button className="btn btn-accent" onClick={openDispatch}>
          <i className="fa-solid fa-paper-plane text-[11px]"></i>
          <span>Dispatch Task</span>
        </button>

        <button 
          className={`btn ${isListening ? 'active' : ''}`} 
          onClick={toggleListening}
          style={isListening ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' } : {}}
        >
          <i className={`fa-solid ${isListening ? 'fa-wave-square' : 'fa-microphone'} text-[11px]`}></i>
          <span>{isListening ? 'Listening...' : 'Speak'}</span>
        </button>

        <div className="h-6 w-px" style={{ background: 'var(--line)' }}></div>

        <div className="flex" style={{ background: 'var(--bg-2)', borderRadius: '7px', padding: '3px', border: '1px solid var(--line)' }}>
          <button style={{ padding: '5px 11px', border: 'none', background: view === 'office' ? 'var(--charcoal)' : 'transparent', color: view === 'office' ? '#fff' : 'var(--charcoal-3)', fontSize: '11px', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={() => setView('office')}><i className="fa-solid fa-building text-[10px]"></i> Office</button>
          <button style={{ padding: '5px 11px', border: 'none', background: view === 'ceo' ? 'var(--charcoal)' : 'transparent', color: view === 'ceo' ? '#fff' : 'var(--charcoal-3)', fontSize: '11px', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={() => setView('ceo')}><i className="fa-solid fa-user-tie text-[10px]"></i> CEO</button>
          <button style={{ padding: '5px 11px', border: 'none', background: view === 'command' ? 'var(--charcoal)' : 'transparent', color: view === 'command' ? '#fff' : 'var(--charcoal-3)', fontSize: '11px', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={() => setView('command')}><i className="fa-solid fa-chart-network text-[10px]"></i> Cmd</button>
          <button style={{ padding: '5px 11px', border: 'none', background: view === 'top' ? 'var(--charcoal)' : 'transparent', color: view === 'top' ? '#fff' : 'var(--charcoal-3)', fontSize: '11px', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={() => setView('top')}><i className="fa-solid fa-vector-square text-[10px]"></i> 2D</button>
        </div>
        
        <div className="h-6 w-px" style={{ background: 'var(--line)' }}></div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium" style={{ color: 'var(--charcoal-3)' }}>Brand</span>
          <div className="w-6 h-6 rounded-md border-2 cursor-pointer transition-transform hover:scale-110" style={{ background: brandColor, borderColor: 'var(--charcoal-3)' }} onClick={() => { 
            const c = prompt("Enter color hex:", brandColor); 
            if(c) setBrandColor(c); 
          }}></div>
        </div>

        <div className="h-6 w-px" style={{ background: 'var(--line)' }}></div>
        <button className={`btn ${fireActive ? 'active' : ''}`} onClick={toggleFire}><i className="fa-solid fa-route text-[11px]"></i><span>Fire</span></button>
        <button className="btn btn-primary" onClick={openExport}><i className="fa-solid fa-file-arrow-down text-[11px]"></i><span>Export</span></button>
        <button className="btn btn-icon" onClick={openHelp}><i className="fa-solid fa-keyboard text-[11px]"></i></button>
        <button className="btn btn-icon" onClick={openSettings} title="Settings"><i className="fa-solid fa-gear text-[11px]"></i></button>
      </div>
    </header>
  );
};