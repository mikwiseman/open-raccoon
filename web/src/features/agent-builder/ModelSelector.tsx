'use client';

import type { Agent } from '@/lib/types';

type ExecutionMode = Agent['execution_mode'];

type Props = {
  model: string;
  executionMode: ExecutionMode;
  temperature: number;
  maxTokens: number;
  onModelChange: (model: string) => void;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
};

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-6', label: 'Claude Haiku 4.6' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const EXECUTION_MODES: Array<{ value: ExecutionMode; label: string; description: string }> = [
  {
    value: 'raw',
    label: 'Raw Streaming',
    description: 'Direct LLM streaming with manual tool handling',
  },
  {
    value: 'claude_sdk',
    label: 'Claude Agent SDK',
    description: "Agentic loop with Claude's tool_use",
  },
  {
    value: 'openai_sdk',
    label: 'OpenAI Agents SDK',
    description: 'OpenAI function calling with agent loop',
  },
];

export function ModelSelector({
  model,
  executionMode,
  temperature,
  maxTokens,
  onModelChange,
  onExecutionModeChange,
  onTemperatureChange,
  onMaxTokensChange,
}: Props) {
  return (
    <fieldset className="ab-fieldset" aria-label="model-selector">
      <legend className="ab-legend">Model Configuration</legend>
      <div className="ab-field-grid">
        <div className="ab-field">
          <label className="ab-label" htmlFor="model-select">
            Model
          </label>
          <select
            id="model-select"
            className="ab-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ab-field">
          <label className="ab-label" htmlFor="execution-mode-select">
            Execution Mode
          </label>
          <select
            id="execution-mode-select"
            className="ab-select"
            value={executionMode}
            onChange={(e) => onExecutionModeChange(e.target.value as ExecutionMode)}
          >
            {EXECUTION_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="ab-hint">
            {EXECUTION_MODES.find((m) => m.value === executionMode)?.description}
          </span>
        </div>

        <div className="ab-field">
          <label className="ab-label" htmlFor="temperature-slider">
            Temperature: {temperature.toFixed(2)}
          </label>
          <input
            id="temperature-slider"
            type="range"
            className="ab-slider"
            min={0}
            max={1}
            step={0.01}
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          />
        </div>

        <div className="ab-field">
          <label className="ab-label" htmlFor="max-tokens-input">
            Max Tokens
          </label>
          <input
            id="max-tokens-input"
            type="number"
            className="ab-input"
            min={1}
            max={200000}
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(parseInt(e.target.value, 10) || 4096)}
          />
        </div>
      </div>
    </fieldset>
  );
}
