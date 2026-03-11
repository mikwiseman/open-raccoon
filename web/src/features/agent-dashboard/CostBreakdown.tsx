'use client';

import type { AgentEvent } from '@/lib/types';

type Props = {
  events: AgentEvent[];
};

type ModelUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  count: number;
};

export function CostBreakdown({ events }: Props) {
  const byModel = new Map<string, ModelUsage>();

  for (const event of events) {
    const model = event.model ?? 'unknown';
    const existing = byModel.get(model) ?? {
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      count: 0,
    };
    existing.inputTokens += event.input_tokens ?? 0;
    existing.outputTokens += event.output_tokens ?? 0;
    existing.totalTokens += (event.input_tokens ?? 0) + (event.output_tokens ?? 0);
    existing.count += 1;
    byModel.set(model, existing);
  }

  const models = Array.from(byModel.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  const maxTokens = models.length > 0 ? models[0].totalTokens : 1;

  const COLORS = [
    'var(--color-accent-primary)',
    'var(--color-info)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-error)',
  ];

  if (models.length === 0) {
    return (
      <div className="ad-cost-breakdown">
        <p className="ab-empty-hint">No token usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="ad-cost-breakdown">
      <div className="ad-cost-bars">
        {models.map((m, i) => (
          <div key={m.model} className="ad-cost-bar-row">
            <span className="ad-cost-model">{m.model}</span>
            <div className="ad-cost-bar-track">
              <div
                className="ad-cost-bar-fill"
                style={{
                  width: `${(m.totalTokens / maxTokens) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
            <span className="ad-cost-tokens">{m.totalTokens.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <table className="ad-cost-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Executions</th>
            <th>Input</th>
            <th>Output</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.model}>
              <td>{m.model}</td>
              <td>{m.count}</td>
              <td>{m.inputTokens.toLocaleString()}</td>
              <td>{m.outputTokens.toLocaleString()}</td>
              <td>{m.totalTokens.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
