'use client';

type Status = 'idle' | 'running' | 'error';

type Props = {
  status: Status;
};

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'ad-health-idle' },
  running: { label: 'Running', className: 'ad-health-running' },
  error: { label: 'Error', className: 'ad-health-error' },
};

export function AgentHealthIndicator({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <output className={`ad-health-badge ${config.className}`} aria-label="agent-health">
      <span className="ad-health-dot" />
      {config.label}
    </output>
  );
}
