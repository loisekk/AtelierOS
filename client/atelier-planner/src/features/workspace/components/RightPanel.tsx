import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import type { PlacedItemMeta, AgentStatus , Task } from '../../ai-agents/types';

interface RightPanelProps {
  mode: 'main' | 'settings';
  placedItems: PlacedItemMeta[];
  selectedId: string | null;
  maxCapacity: number;
  roomArea: number;
  openCost: () => void;
  onStatusChange: (id: string, status: AgentStatus) => void;
  onConfigure: (id: string) => void;
  onWalkTo: (id: string, destination: string) => void;
  brainResponses: string[];
  isListening: boolean;
  toggleListening: () => void;
  getAudioData: () => Uint8Array | null;
  tasks: Task[];
}

/** Voice Command waveform — bar visualizer fed by useVoice's getAudioData().
 *  Flat baseline while idle; live frequency bars (cyan) while listening. */
const VoiceWave: FC<{ isListening: boolean; getAudioData: () => Uint8Array | null }> = ({ isListening, getAudioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const data = isListening ? getAudioData() : null;
      const bars = 24;
      const bw = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const level = data ? (data[i * 2] ?? 0) / 255 : 0.06;
        const h = Math.max(2, level * (canvas.height - 4));
        ctx.fillStyle = '#49D8EC';
        ctx.globalAlpha = isListening ? 0.9 : 0.3;
        ctx.fillRect(i * bw + 2, (canvas.height - h) / 2, bw - 4, h);
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isListening, getAudioData]);

  return (
    <div className="rounded-lg p-2" style={{ background: '#0E1418' }}>
      <canvas ref={canvasRef} width={268} height={40} style={{ width: '100%', display: 'block' }} />
    </div>
  );
};

export const RightPanel: FC<RightPanelProps> = ({ mode, placedItems, selectedId, maxCapacity, roomArea, openCost, onStatusChange, onConfigure, onWalkTo, brainResponses, isListening, toggleListening, getAudioData, tasks }) => {
  const seats = placedItems.reduce((s, i) => s + i.seats, 0);
  const total = placedItems.reduce((s, i) => s + i.price, 0);
  const pct = maxCapacity > 0 ? Math.min(100, Math.round((seats / maxCapacity) * 100)) : 0;
  const overCapacity = seats > maxCapacity;
  
  const employees = placedItems.filter(i => i.role);
  const selectedEmployee = placedItems.find(i => i.id === selectedId && i.role);

  if (mode === 'main') {
    return (
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'transparent', border: 'none' }}>
        <div className="glass-card">
          <div className="panel-section-title">Company Status</div>
          <div className="space-y-0.5">
            <div className="stat-row"><span className="stat-label">Total Employees</span><span className="stat-value font-mono">{employees.length}</span></div>
            <div className="stat-row"><span className="stat-label">Working</span><span className="stat-value font-mono" style={{color: 'var(--success)'}}>{employees.filter(e => e.status === 'working').length}</span></div>
            <div className="stat-row"><span className="stat-label">Idle</span><span className="stat-value font-mono">{employees.filter(e => e.status === 'idle').length}</span></div>
          </div>
        </div>

        <div className="glass-card">
          <div className="panel-section-title">Employee Workstation</div>
          {!selectedEmployee ? (
            <div className="text-[11px] text-center py-4" style={{ color: 'var(--charcoal-3)' }}>
              Select an employee in the office to view their details.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--charcoal-3)' }}>Name</div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--charcoal)' }}>{selectedEmployee.config?.name || selectedEmployee.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--charcoal-3)' }}>Role</div>
                <div className="text-[13px] font-mono" style={{ color: 'var(--charcoal)' }}>{selectedEmployee.role}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--charcoal-3)' }}>Status</div>
                <div className="text-[13px] font-mono" style={{ color: selectedEmployee.status === 'working' ? 'var(--success)' : selectedEmployee.status === 'error' ? 'var(--danger)' : 'var(--charcoal)' }}>
                  {selectedEmployee.status?.toUpperCase()}
                </div>
              </div>
              
              <button className="btn btn-primary w-full justify-center" onClick={() => onConfigure(selectedEmployee.id)}>
                <i className="fa-solid fa-sliders text-[11px]"></i>Configure Agent
              </button>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                <div className="text-[10px] uppercase mb-2" style={{ color: 'var(--charcoal-3)' }}>Navigation Controls</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button className="btn justify-center text-[10px]" onClick={() => onWalkTo(selectedEmployee.id, 'meeting_table')}>Walk to Meeting</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onWalkTo(selectedEmployee.id, 'knowledge_center')}>Walk to Knowledge</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onWalkTo(selectedEmployee.id, 'ceo_center')}>Walk to Brain</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onWalkTo(selectedEmployee.id, 'desk')}>Return to Desk</button>
                </div>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                <div className="text-[10px] uppercase mb-2" style={{ color: 'var(--charcoal-3)' }}>Simulate Status (OODA Test)</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button className="btn justify-center text-[10px]" onClick={() => onStatusChange(selectedEmployee.id, 'idle')}>Idle</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onStatusChange(selectedEmployee.id, 'working')}>Working</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onStatusChange(selectedEmployee.id, 'waiting')}>Waiting</button>
                  <button className="btn justify-center text-[10px]" onClick={() => onStatusChange(selectedEmployee.id, 'error')}>Error</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="panel-section-title">Voice Command</div>
          <div className="flex items-center gap-2 mb-2">
            <button
              className={`btn ${isListening ? 'active' : ''}`}
              style={isListening ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : undefined}
              onClick={toggleListening}
            >
              <i className={`fa-solid ${isListening ? 'fa-wave-square' : 'fa-microphone'} text-[11px]`}></i>
              <span>{isListening ? 'Listening…' : 'Speak'}</span>
            </button>
            <span className="text-[10px] font-mono truncate" style={{ color: 'var(--charcoal-3)' }}>
              {isListening ? 'Say something to your AI team' : 'Tap to talk'}
            </span>
          </div>
          <VoiceWave isListening={isListening} getAudioData={getAudioData} />
        </div>

        <div className="glass-card">
          <div className="panel-section-title">AI Brain Response</div>
          {brainResponses.length === 0 ? (
            <div className="text-[11px] text-center py-3" style={{ color: 'var(--charcoal-3)' }}>Brain idle. Dispatch a task.</div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto scroll-thin">
              {brainResponses.map((line, i) => (
                <div key={i} className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--charcoal-2)' }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="panel-section-title">Live Activity</div>
          {tasks.length === 0 ? (
            <div className="text-[11px] text-center py-4" style={{ color: 'var(--charcoal-3)' }}>No active tasks. Dispatch work to your team!</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="p-2 rounded-md border" style={{ borderColor: 'var(--line-soft)', background: 'rgba(255,255,255,0.5)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-semibold" style={{ color: task.status === 'running' ? 'var(--success)' : 'var(--charcoal-3)' }}>
                      {task.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--charcoal)' }}>{task.prompt}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'transparent', border: 'none' }}>
      <div className="glass-card">
        <div className="panel-section-title">Capacity Planner</div>
        <div className="mb-3">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span style={{ color: 'var(--charcoal-3)' }}>Occupancy</span>
            <span className="font-mono"><span className="font-semibold">{pct}</span>% of max</span>
          </div>
          <div className="meter"><div className="meter-fill" style={{ width: `${pct}%` }}></div></div>
        </div>
        <div className="space-y-0.5">
          <div className="stat-row"><span className="stat-label">Seats placed</span><span className="stat-value font-mono">{seats}</span></div>
          <div className="stat-row"><span className="stat-label">Floor area</span><span className="stat-value font-mono">{roomArea} m²</span></div>
        </div>
      </div>
      <div className="glass-card">
        <div className="stat-row" style={{ paddingBottom: 8 }}>
          <span className="stat-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: overCapacity ? 'var(--danger)' : 'var(--success)' }}></span>
            Fire egress
          </span>
          <span className="stat-value text-[12px]" style={{ color: overCapacity ? 'var(--danger)' : 'var(--charcoal)' }}>{overCapacity ? 'Over limit' : 'Compliant'}</span>
        </div>
      </div>
      <div className="glass-card">
        <div className="panel-section-title">Live Costing</div>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px]" style={{ color: 'var(--charcoal-3)' }}>Estimated total</span>
          <span className="font-display font-black text-2xl" style={{ color: 'var(--accent)' }}>${total.toLocaleString()}</span>
        </div>
        <button className="btn btn-primary w-full justify-center" onClick={openCost}><i className="fa-solid fa-receipt text-[11px]"></i>View breakdown</button>
      </div>
      <div className="glass-card">
        <div className="panel-section-title">Placed Items</div>
        {placedItems.length === 0 ? <div className="text-[11px] text-center py-4" style={{ color: 'var(--charcoal-3)' }}>No items yet.</div> : (
          <div className="space-y-1.5">
            {placedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-md border" style={{ borderColor: 'var(--line-soft)', background: 'rgba(255,255,255,0.5)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--charcoal)' }}>{item.name}</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>${item.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};