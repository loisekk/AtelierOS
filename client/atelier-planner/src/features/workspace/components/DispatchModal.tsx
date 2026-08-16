import React, { useState } from 'react';
import type { PlacedItemMeta, Task } from '../../ai-agents/types';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatch: (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => void;
  employees: PlacedItemMeta[];
}

export const DispatchModal: React.FC<DispatchModalProps> = ({ isOpen, onClose, onDispatch, employees }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  if (!isOpen) return null;

  const handleToggleEmployee = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExecute = () => {
    if (!prompt.trim() || selectedIds.length === 0) return;
    onDispatch({ prompt, assigneeIds: selectedIds, priority });
    setPrompt('');
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="export-modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="export-sheet" style={{ maxWidth: 520 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-section-title" style={{ margin: 0 }}>Dispatch Task to Company</h3>
          <button className="btn btn-icon" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>Task Description</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full mt-1 p-2 rounded-md border bg-transparent resize-none"
              style={{ borderColor: 'var(--line)', color: 'var(--charcoal)' }}
              placeholder="e.g., Build a login screen with Google OAuth..."
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>Assign to Employees</label>
            <div className="mt-1 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scroll-thin p-1">
              {employees.length === 0 ? (
                <div className="col-span-2 text-[11px] text-center py-4" style={{ color: 'var(--charcoal-3)' }}>Hire employees first!</div>
              ) : (
                employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleToggleEmployee(emp.id)}
                    className={`p-2 rounded-md border text-left transition-colors ${selectedIds.includes(emp.id) ? 'bg-[var(--accent-soft)] border-[var(--accent)]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]'}`}
                  >
                    <div className="text-[11px] font-semibold truncate">{emp.config?.name || emp.name}</div>
                    <div className="text-[9px] font-mono" style={{ color: 'var(--charcoal-3)' }}>{emp.role}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>Priority</label>
            <div className="flex gap-2 mt-1">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 p-1.5 rounded-md text-[11px] capitalize border transition-colors ${priority === p ? 'bg-[var(--charcoal)] text-[var(--bg)] border-[var(--charcoal)]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button className="btn flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary flex-1 justify-center" 
            onClick={handleExecute}
            disabled={!prompt.trim() || selectedIds.length === 0}
            style={{ opacity: (!prompt.trim() || selectedIds.length === 0) ? 0.5 : 1 }}
          >
            <i className="fa-solid fa-paper-plane text-[11px]"></i>
            Execute Task
          </button>
        </div>
      </div>
    </div>
  );
};