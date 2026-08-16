import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import { ITEM_CATALOG } from '../features/furniture/catalog';
import { TEMPLATES } from '../features/furniture/templates';
import { useAtelier } from '../features/workspace/hooks/useAtelier';
import { useGateway } from '../features/workspace/hooks/useGateway';
import type { GatewayMessage } from '../features/workspace/hooks/useGateway';
import { useVoice } from '../features/workspace/hooks/useVoice';
import { TopBar } from '../features/workspace/components/TopBar';
import { LeftPanel } from '../features/workspace/components/LeftPanel';
import { RightPanel } from '../features/workspace/components/RightPanel';
import { AgentModal } from '../features/workspace/components/AgentModal';
import { DispatchModal } from '../features/workspace/components/DispatchModal';
import type { AgentStatus, AgentConfig, Task } from '../features/ai-agents/types';

const ROOM_AREA = 1800; // 60x30
const MAX_CAPACITY = 100;
const BRAND_SWATCHES = ['#C75D3F', '#1F3A5F', '#6B8E4E', '#D49B3B', '#2A2826'];

const HELP_SHORTCUTS = [
  { keys: 'Click item + floor', desc: 'Place furniture/employee' },
  { keys: 'Drag item', desc: 'Move furniture/employee' },
  { keys: 'Delete / Backspace', desc: 'Remove selected item' },
  { keys: 'Ctrl+Z', desc: 'Undo last action' },
  { keys: 'Esc', desc: 'Cancel / close panels' },
];

// NEW: Interface to prevent 'any' warnings
interface DagStep {
  role: string;
  status: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { engineRef, placedItems, selectedId } = useAtelier(containerRef);
  const toastTimer = useRef<number | null>(null);
  
  // FIX: Use useRef instead of useState because the value is only passed to the 3D engine, not rendered in React
  const dagStepsRef = useRef<DagStep[]>([]);

  const [view, setView] = useState<'office' | 'ceo' | 'command' | 'knowledge' | 'top'>('office');
  const [brandColor, setBrandColor] = useState('#C75D3F');
  const [fireActive, setFireActive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [hiringType, setHiringType] = useState<string | null>(null);

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  
  // HITL State
  const [approvalData, setApprovalData] = useState<{ taskId: string, command: string, subTaskId: string } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const handleGatewayMessage = useCallback((msg: GatewayMessage) => {
    if (msg.type === 'agent_status' && msg.agent_id && msg.status) {
      engineRef.current?.updateAgentStatus(msg.agent_id, msg.status as AgentStatus);
      if (msg.status === 'idle') {
        setTasks(prev => prev.map(t => t.id === msg.task_id ? { ...t, status: 'completed' } : t));
        showToast(`Task completed!`);
      }
    } else if (msg.type === 'terminal_log' && msg.agent_id && msg.log) {
      const agentId = msg.agent_id;
      const logMessage = msg.log;
      engineRef.current?.updateAgentLog(agentId, logMessage);
      setLogs(prev => {
        const currentLogs = prev[agentId] || [];
        return { ...prev, [agentId]: [...currentLogs, logMessage] };
      });
    } else if (msg.type === 'approval_required' && msg.command && msg.sub_task_id) {
      setApprovalData({ taskId: msg.task_id, command: msg.command, subTaskId: msg.sub_task_id });
      engineRef.current?.updateAgentStatus(msg.sub_task_id, 'waiting');
      const targetEmployee = placedItems.find(i => i.role);
      if (targetEmployee) {
        engineRef.current?.updateAgentStatus(targetEmployee.id, 'waiting');
        engineRef.current?.updateAgentLog(targetEmployee.id, `REQ APPROVAL: ${msg.command}`);
      }
      showToast(`⚠️ Approval Required for destructive command!`);
    } else if (msg.type === 'cognitive_step') {
      const logMessage = `[${msg.role || 'CEO Brain'}] ${msg.message} (${msg.status})`;
      
      // Update 3D DAG Screen using Ref
      const newSteps = [...dagStepsRef.current];
      const existing = newSteps.findIndex(s => s.role === (msg.role || 'Decompose'));
      if (existing > -1) {
        newSteps[existing] = { ...newSteps[existing], status: msg.status || 'pending' };
      } else {
        newSteps.push({ role: msg.role || 'Decompose', status: msg.status || 'pending' });
      }
      dagStepsRef.current = newSteps;
      engineRef.current?.updateDAG(newSteps);

      const targetEmployee = placedItems.find(i => i.role?.toLowerCase() === msg.role?.toLowerCase());
      if (targetEmployee) {
        engineRef.current?.updateAgentLog(targetEmployee.id, logMessage);
        setLogs(prev => {
          const currentLogs = prev[targetEmployee.id] || [];
          return { ...prev, [targetEmployee.id]: [...currentLogs, logMessage] };
        });
        if (msg.status === 'working') {
          engineRef.current?.updateAgentStatus(targetEmployee.id, 'working');
        } else if (msg.status === 'completed') {
          engineRef.current?.updateAgentStatus(targetEmployee.id, 'celebrate');
          setTimeout(() => {
            engineRef.current?.updateAgentStatus(targetEmployee.id, 'idle');
          }, 2500);
        }
      } else {
        const fallbackEmployee = placedItems.find(i => i.role);
        if (fallbackEmployee) {
          engineRef.current?.updateAgentLog(fallbackEmployee.id, logMessage);
        }
      }
      showToast(logMessage);
    } else if (msg.type === 'cognitive_complete') {
      setTasks(prev => prev.map(t => t.id === msg.task_id ? { ...t, status: 'completed' } : t));
      // Clear DAG after completion
      setTimeout(() => {
        dagStepsRef.current = [];
        engineRef.current?.updateDAG([]);
      }, 5000);
      showToast('DAG Execution Complete!');
    }
  }, [engineRef, showToast, placedItems]);

  const { isConnected, sendMessage } = useGateway(handleGatewayMessage);

  const handleTranscript = useCallback((text: string) => {
    showToast(`Heard: "${text}"`);
    const employees = placedItems.filter(i => i.role);
    if (employees.length > 0) {
      handleDispatch({ prompt: text, assigneeIds: [employees[0].id], priority: 'high' });
      showToast(`Task dispatched via voice!`);
    } else {
      showToast('Hire an employee first!');
    }
  }, [placedItems]);

  const { isListening, startListening, stopListening, getAudioData } = useVoice(handleTranscript);

  useEffect(() => {
    let raf: number;
    const loop = () => { raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [isListening, getAudioData, engineRef]);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleApprove = () => {
    if (approvalData) {
      sendMessage({ type: 'approve_command', task_id: approvalData.taskId });
      showToast('Command Approved. Executing in Sandbox...');
      setApprovalData(null);
    }
  };

  const handleDeny = () => {
    if (approvalData) {
      sendMessage({ type: 'deny_command', task_id: approvalData.taskId });
      showToast('Command Denied by CEO.');
      setApprovalData(null);
    }
  };

  const seats = placedItems.reduce((s, i) => s + i.seats, 0);
  const total = placedItems.reduce((s, i) => s + i.price, 0);
  const employees = placedItems.filter(i => i.role);

  const handleView = (v: 'office' | 'ceo' | 'command' | 'knowledge' | 'top') => {
    setView(v);
    engineRef.current?.setView(v);
  };

  const handleBrand = (c: string) => {
    setBrandColor(c);
    engineRef.current?.setBrandColor(c);
  };

  const handleToggleFire = () => {
    setFireActive(prev => {
      const next = !prev;
      engineRef.current?.toggleFireEgress(next);
      return next;
    });
  };

  const handleSelectType = (type: string | null) => {
    setSelectedType(type);
    setActiveTemplate(null);
    engineRef.current?.setSelectedItemType(type);
  };

  const handleHireClick = (type: string) => {
    setHiringType(type);
    setAgentModalOpen(true);
  };

  const handleHire = (type: string, config: AgentConfig) => {
    setSelectedType(type);
    engineRef.current?.setSelectedItemType(type);
    showToast(`${config.name} hired. Click Office Floor to place desk.`);
  };

  const handleConfigure = (id: string) => {
    engineRef.current?.setSelected(id);
    setHiringType(null);
    setAgentModalOpen(true);
  };

  const handleUpdateAgent = (id: string, config: AgentConfig) => {
    engineRef.current?.updateAgentConfig(id, config);
    showToast(`${config.name} updated.`);
  };

  const handleDispatch = (taskData: Omit<Task, 'id' | 'status' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'running',
      createdAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);
    sendMessage({ type: 'dispatch', task_id: newTask.id, assignee_ids: newTask.assigneeIds, prompt: newTask.prompt });
    showToast(`Task dispatched to Python Engine!`);
  };

  const handleStartMeeting = () => {
    const ids = employees.map(e => e.id);
    if (ids.length === 0) {
      showToast("Hire employees before starting a meeting!");
      return;
    }
    engineRef.current?.startMeeting(ids);
    showToast("Team gathering in the Meeting Room...");
  };

  const handleLoadTemplate = (name: string) => {
    const template = TEMPLATES.find(t => t.name === name);
    if (!template) return;
    engineRef.current?.clearAll();
    setActiveTemplate(name);
    setSelectedType(null);
    template.items.forEach(item => {
      engineRef.current?.placeItem(item.type, new THREE.Vector3(item.x + 30, 0, item.z), item.rotY);
    });
    showToast(`Loaded "${template.name}" layout`);
  };

  const handleUndo = () => engineRef.current?.undo();

  const handleClear = () => {
    engineRef.current?.clearAll();
    setSelectedType(null);
    setActiveTemplate(null);
    showToast('Canvas cleared');
  };

  const handleStatusChange = (id: string, status: AgentStatus) => engineRef.current?.updateAgentStatus(id, status);

  const handleExport = () => {
    if (placedItems.length === 0) { setExportOpen(false); showToast('Add some items before exporting'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Atelier HQ — Floor Plan', 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25); doc.setTextColor(0);
    doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(14, 29, 196, 29);

    const scale = 150 / 60;
    const ox = 14, oy = 42;
    doc.setLineWidth(0.8); doc.rect(ox, oy, 60 * scale, 30 * scale);
    doc.setDrawColor(199, 93, 63); doc.setLineWidth(0.4);
    placedItems.forEach(item => {
      const cx = ox + (item.position.x - -15) * scale;
      const cy = oy + (item.position.z + 15) * scale;
      const dim = ITEM_CATALOG[item.type]?.dim ?? [0.6, 0.6];
      const w = dim[0] * scale, h = dim[1] * scale;
      if (item.type === 'chair' || item.type === 'stool') doc.circle(cx, cy, 2.2);
      else doc.rect(cx - w / 2, cy - h / 2, w, h);
    });

    let y = 170;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Inventory', 14, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); y += 7;
    placedItems.forEach(item => {
      if (y > 278) return;
      doc.text(`${item.name}  (${item.position.x.toFixed(1)}, ${item.position.z.toFixed(1)})`, 14, y);
      doc.text(`$${item.price}`, 185, y, { align: 'right' }); y += 5;
    });
    y += 7; doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`Seats: ${seats}    Estimated total: $${total.toLocaleString()}`, 14, y);
    doc.save('atelier-hq-floorplan.pdf'); setExportOpen(false); showToast('PDF exported');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExportOpen(false); setHelpOpen(false); setSettingsOpen(false);
        setAgentModalOpen(false); setDispatchModalOpen(false); setSelectedType(null);
        engineRef.current?.setSelectedItemType(null); return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !helpOpen && !settingsOpen && !agentModalOpen && !dispatchModalOpen) {
        engineRef.current?.deleteSelected(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); engineRef.current?.undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, settingsOpen, agentModalOpen, dispatchModalOpen, engineRef]);

  const selectedItem = placedItems.find(i => i.id === selectedId);
  const breakdown = placedItems.reduce<Record<string, { count: number; unit: number }>>((acc, i) => {
    const entry = acc[i.name] ?? { count: 0, unit: i.price };
    entry.count += 1; acc[i.name] = entry; return acc;
  }, {});

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <TopBar
        view={view} setView={handleView} brandColor={brandColor} setBrandColor={handleBrand}
        toggleFire={handleToggleFire} fireActive={fireActive}
        openExport={() => setExportOpen(true)} openHelp={() => setHelpOpen(true)}
        openSettings={() => setSettingsOpen(true)} openDispatch={() => setDispatchModalOpen(true)}
        isListening={isListening} toggleListening={toggleListening}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          mode={isCustomizing ? 'settings' : 'main'} templates={TEMPLATES} activeTemplate={activeTemplate}
          selectedType={selectedType} onSelectType={handleSelectType} onLoadTemplate={handleLoadTemplate}
          onUndo={handleUndo} onClear={handleClear} placedCount={placedItems.filter(i => i.role).length} onHireClick={handleHireClick}
          setView={(v) => handleView(v)}
        />

        <main className="flex-1 relative">
          <div ref={containerRef} className="blueprint-grid" style={{ position: 'absolute', inset: 0 }} />

          {/* Top Right HUD - System Status */}
          <div className="hud hud-tr">
            <div className="flex items-center gap-4 text-[10.5px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></span>
                <span className="font-mono" style={{ color: 'var(--charcoal)' }}>System Health: 100%</span>
              </div>
              <div className="font-mono" style={{ color: 'var(--charcoal-3)' }}>{employees.length} Agents</div>
            </div>
          </div>

          {/* Bottom Center HUD - Camera Controls / Stats */}
          <div className="hud hud-bc">
            <div className="flex items-center gap-3 text-[10.5px]">
              <button className="btn btn-icon" title="Walk Mode" onClick={() => handleView('office')}><i className="fa-solid fa-person-walking text-[10px]"></i></button>
              <button className="btn btn-icon" title="Fly Mode" onClick={() => handleView('top')}><i className="fa-solid fa-paper-plane text-[10px]"></i></button>
              <button className="btn btn-icon" title="Focus Agent" onClick={() => handleView('office')}><i className="fa-solid fa-crosshairs text-[10px]"></i></button>
              
              {/* Start Meeting Button */}
              <button className="btn btn-accent" title="Gather Team for Meeting" onClick={handleStartMeeting}>
                <i className="fa-solid fa-users-medical text-[10px]"></i> Start Standup
              </button>

              <div className="w-px h-4" style={{ background: 'var(--line)' }}></div>
              <span className="font-mono" style={{ color: 'var(--charcoal)' }}>{seats} Seats</span>
              <span className="w-px h-3" style={{ background: 'var(--line)' }}></span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? 'var(--success)' : 'var(--danger)' }}></span>
                <span style={{ color: isConnected ? 'var(--success)' : 'var(--danger)' }}>{isConnected ? 'Cognitive Engine Online' : 'Engine Offline'}</span>
              </span>
            </div>
          </div>

          {/* Selected Item HUD */}
          {selectedItem && (
            <div className="hud hud-bl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--charcoal)' }}>{selectedItem.config?.name || selectedItem.name}</span>
              </div>
              {logs[selectedItem.id] && (
                <div className="mt-1 p-2 rounded-md text-[9px] font-mono max-h-24 overflow-y-auto scroll-thin" style={{ background: '#000', color: 'var(--success)', border: '1px solid var(--line)' }}>
                  {logs[selectedItem.id].map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
          )}
        </main>

        <RightPanel 
          mode={isCustomizing ? 'settings' : 'main'} 
          placedItems={placedItems} 
          selectedId={selectedId}
          maxCapacity={MAX_CAPACITY} 
          roomArea={ROOM_AREA} 
          openCost={() => setSettingsOpen(true)} 
          onStatusChange={handleStatusChange} 
          onConfigure={handleConfigure} 
          onWalkTo={(id, dest) => {
            if (dest === 'desk') engineRef.current?.returnAgentToDesk(id);
            else engineRef.current?.walkAgentTo(id, dest);
          }}
          tasks={tasks}
        />
      </div>

      <AgentModal 
        isOpen={agentModalOpen} onClose={() => setAgentModalOpen(false)} onHire={handleHire} 
        onUpdate={handleUpdateAgent} selectedEmployee={selectedItem?.role ? selectedItem : null} hiringType={hiringType}
      />
      <DispatchModal 
        isOpen={dispatchModalOpen} onClose={() => setDispatchModalOpen(false)} onDispatch={handleDispatch} employees={employees}
      />

      {/* CEO HITL Approval Modal */}
      <div className={`export-modal ${approvalData ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleDeny(); }}>
        <div className="export-sheet" style={{ width: 500, borderColor: 'var(--warn)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--warn)' }}>
              <i className="fa-solid fa-shield-halved text-white"></i>
            </div>
            <div>
              <h3 className="panel-section-title" style={{ margin: 0 }}>Security Approval Required</h3>
              <div className="text-[11px] font-mono" style={{ color: 'var(--charcoal-3)' }}>Agent requesting destructive execution</div>
            </div>
          </div>
          <div className="p-3 rounded-md border mb-4" style={{ borderColor: 'var(--line)', background: '#000' }}>
            <div className="text-[9px] uppercase mb-1" style={{ color: 'var(--warn)' }}>Proposed Command</div>
            <div className="font-mono text-[12px]" style={{ color: 'var(--success)' }}>{approvalData?.command}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1 justify-center" onClick={handleDeny}><i className="fa-solid fa-ban text-[11px]"></i> Deny</button>
            <button className="btn btn-accent flex-1 justify-center" onClick={handleApprove}><i className="fa-solid fa-check text-[11px]"></i> Approve & Execute</button>
          </div>
        </div>
      </div>

      {/* Export modal */}
      <div className={`export-modal ${exportOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setExportOpen(false); }}>
        <div className="export-sheet">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-section-title" style={{ margin: 0 }}>Export Floor Plan</h3>
            <button className="btn btn-icon" onClick={() => setExportOpen(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border mb-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-2)' }}>
            <div>
              <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>{placedItems.length} items</div>
              <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>${total.toLocaleString()} · {seats} seats</div>
            </div>
            <button className="btn btn-primary" onClick={handleExport}><i className="fa-solid fa-file-arrow-down text-[11px]"></i>Generate PDF</button>
          </div>
          <div className="flex items-center gap-3">
            {BRAND_SWATCHES.map(c => (
              <button key={c} type="button" className={`w-7 h-7 rounded-full border-2 ${brandColor.toLowerCase() === c.toLowerCase() ? 'border-[var(--charcoal)]' : 'border-transparent'}`} style={{ background: c }} onClick={() => handleBrand(c)} title={c} />
            ))}
          </div>
        </div>
      </div>

      {/* Settings modal - Now contains Cost Breakdown */}
      <div className={`export-modal ${settingsOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <div className="export-sheet" style={{ width: 600 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-section-title" style={{ margin: 0 }}>Settings & Analytics</h3>
            <button className="btn btn-icon" onClick={() => setSettingsOpen(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>Workspace</h4>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>Customize Office Layout</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>Switch to furniture placement mode</div>
                  </div>
                </div>
                <button className="btn btn-primary w-full justify-center" onClick={() => { setIsCustomizing(true); setSettingsOpen(false); showToast("Entered Customization Mode"); }}>
                  <i className="fa-solid fa-couch text-[11px]"></i> Enter Customization Mode
                </button>
              </div>
            </div>

            {/* Cost Breakdown Section */}
            <div>
              <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>Cost Breakdown</h4>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-2)' }}>
                {Object.keys(breakdown).length === 0 ? (
                  <div className="text-[11px] text-center py-2" style={{ color: 'var(--charcoal-3)' }}>No items placed yet.</div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto scroll-thin">
                    {Object.entries(breakdown).map(([name, { count, unit }]) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-md border" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
                        <div>
                          <div className="text-[12px] font-semibold" style={{ color: 'var(--charcoal)' }}>{name}</div>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--charcoal-3)' }}>× {count} @ ${unit}</div>
                        </div>
                        <div className="font-display font-bold text-[13px]" style={{ color: 'var(--charcoal)' }}>${(count * unit).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-baseline justify-between mt-3 pt-2 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--charcoal-3)' }}>Estimated total</span>
                  <span className="font-display font-black text-lg" style={{ color: 'var(--charcoal)' }}>${total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help modal */}
      <div className={`export-modal ${helpOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
        <div className="export-sheet">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-section-title" style={{ margin: 0 }}>Shortcuts</h3>
            <button className="btn btn-icon" onClick={() => setHelpOpen(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="space-y-2.5">
            {HELP_SHORTCUTS.map(s => (
              <div key={s.desc} className="flex items-center justify-between gap-4">
                <span className="text-[12px]" style={{ color: 'var(--charcoal-3)' }}>{s.desc}</span>
                <span className="font-mono text-[11px] px-2 py-1 rounded-md" style={{ background: 'var(--bg-2)', color: 'var(--charcoal)' }}>{s.keys}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}><i className="fa-solid fa-circle-check"></i>{toast}</div>
    </div>
  );
}

export default App;