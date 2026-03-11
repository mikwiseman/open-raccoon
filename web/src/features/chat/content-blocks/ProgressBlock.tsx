'use client';

export type ProgressStep = {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
};

export type ProgressBlockData = {
  type: 'progress';
  steps: ProgressStep[];
  currentStep?: number;
};

const STEP_ICONS: Record<ProgressStep['status'], string> = {
  pending: '\u25CB', // empty circle
  active: '\u25CF', // filled circle
  done: '\u2713', // checkmark
  error: '\u2717', // X
};

export function ProgressBlock({ block }: { block: ProgressBlockData }) {
  return (
    <div className="cb-progress-block">
      <ul className="cb-progress-steps">
        {block.steps.map((step, idx) => (
          <li key={idx} className={`cb-progress-step cb-progress-step-${step.status}`}>
            <span className="cb-progress-step-icon">{STEP_ICONS[step.status]}</span>
            <span className="cb-progress-step-label">{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
