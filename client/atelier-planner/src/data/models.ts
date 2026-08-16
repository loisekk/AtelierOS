export interface ModelOption {
  id: string;
  name: string;
  provider: 'OpenRouter' | 'Anthropic' | 'OpenAI' | 'Local' | 'Custom';
  isFree?: boolean;
}

export const MODEL_REGISTRY: ModelOption[] = [
  // OpenRouter (BYOK / Free Tiers)
  { id: 'glm-4', name: 'GLM-4 (Free)', provider: 'OpenRouter', isFree: true },
  { id: 'qwen-2.5', name: 'Qwen 2.5 (Free)', provider: 'OpenRouter', isFree: true },
  { id: 'llama-3.3', name: 'Llama 3.3 (Free)', provider: 'OpenRouter', isFree: true },
  { id: 'claude-opus', name: 'Claude Opus', provider: 'OpenRouter' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenRouter' },
  
  // Direct Anthropic
  { id: 'anthropic-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  
  // Local
  { id: 'ollama-code', name: 'Ollama (Local)', provider: 'Local', isFree: true },
];

export const HARNESS_OPTIONS = [
  { id: 'opencode', name: 'OpenCode' },
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'kiro', name: 'Kiro CLI' },
  { id: 'custom', name: 'Custom CLI' },
];