import React, { useState, useEffect } from 'react';
import { MODEL_REGISTRY, HARNESS_OPTIONS } from '../../../data/models';
import type { AgentConfig, PlacedItemMeta } from '../../ai-agents/types';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHire: (type: string, config: AgentConfig) => void;
  onUpdate: (id: string, config: AgentConfig) => void;
  selectedEmployee: PlacedItemMeta | null;
  hiringType: string | null;
}

export const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, onHire, onUpdate, selectedEmployee, hiringType }) => {
  const [name, setName] = useState('');
  const [harness, setHarness] = useState('opencode');
  const [model, setModel] = useState('glm-4');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (selectedEmployee) {
      setName(selectedEmployee.config?.name || selectedEmployee.name);
      setHarness(selectedEmployee.config?.harness || 'opencode');
      setModel(selectedEmployee.config?.model || 'glm-4');
    } else if (hiringType) {
      setName(`New ${hiringType.split('_')[0]} Engineer`);
      setHarness('opencode');
      setModel('glm-4');
    }
  }, [selectedEmployee, hiringType]);

  if (!isOpen) return null;

  const handleSave = () => {
    const selectedModel = MODEL_REGISTRY.find(m => m.id === model);
    const config: AgentConfig = {
      name,
      harness,
      model,
      provider: selectedModel?.provider || 'Custom',
    };

    if (selectedEmployee) {
      onUpdate(selectedEmployee.id, config);
    } else if (hiringType) {
      onHire(hiringType, config);
    }
    onClose();
  };

  return (
    <div className="export-modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="export-sheet" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-section-title" style={{ margin: 0 }}>
            {selectedEmployee ? 'Configure Employee' : 'Hire Employee'}
          </h3>
          <button className="btn btn-icon" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>Employee Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 p-2 rounded-md border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--charcoal)' }}
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>Agent Harness (CLI)</label>
            <select 
              value={harness} 
              onChange={(e) => setHarness(e.target.value)}
              className="w-full mt-1 p-2 rounded-md border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--charcoal)', background: 'var(--surface)' }}
            >
              {HARNESS_OPTIONS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>AI Model (BYOK)</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="w-full mt-1 p-2 rounded-md border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--charcoal)', background: 'var(--surface)' }}
            >
              {MODEL_REGISTRY.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isFree ? '(Free)' : ''} - {m.provider}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--charcoal-3)' }}>API Key (Stored Locally)</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full mt-1 p-2 rounded-md border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--charcoal)' }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button className="btn flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1 justify-center" onClick={handleSave}>
            <i className="fa-solid fa-check text-[11px]"></i>
            {selectedEmployee ? 'Save Changes' : 'Hire & Place'}
          </button>
        </div>
      </div>
    </div>
  );
};