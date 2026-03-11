'use client';

import type { AgentEvent } from '@/lib/types';

type Props = {
  events: AgentEvent[];
};

export function StatsCards({ events }: Props) {
  const totalExecutions = events.length;
  const completed = events.filter((e) => e.status === 'completed').length;
  const successRate = totalExecutions > 0 ? Math.round((completed / totalExecutions) * 100) : 0;
  const totalTokens = events.reduce(
    (sum, e) => sum + (e.input_tokens ?? 0) + (e.output_tokens ?? 0),
    0,
  );
  const durations = events.filter((e) => e.duration_ms != null).map((e) => e.duration_ms ?? 0);
  const avgLatency =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const cards = [
    { label: 'Total Executions', value: totalExecutions.toLocaleString() },
    { label: 'Success Rate', value: `${successRate}%` },
    { label: 'Total Tokens', value: totalTokens.toLocaleString() },
    { label: 'Avg Latency', value: `${avgLatency.toLocaleString()}ms` },
  ];

  return (
    <div className="ad-stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="ad-stat-card">
          <span className="ad-stat-value">{card.value}</span>
          <span className="ad-stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
