'use client';

import type { Agent } from '@/lib/types';

type Visibility = Agent['visibility'];

type Props = {
  value: Visibility;
  onChange: (value: Visibility) => void;
};

const OPTIONS: Array<{ value: Visibility; label: string; description: string }> = [
  { value: 'public', label: 'Public', description: 'Visible on marketplace and searchable' },
  { value: 'unlisted', label: 'Unlisted', description: 'Accessible via link, not listed' },
  { value: 'private', label: 'Private', description: 'Only you can access' },
];

export function VisibilitySelector({ value, onChange }: Props) {
  return (
    <fieldset className="ab-fieldset" aria-label="visibility-selector">
      <legend className="ab-legend">Visibility</legend>
      <div className="ab-radio-group">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`ab-radio-card ${value === opt.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="visibility"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="ab-radio-input"
            />
            <span className="ab-radio-label">{opt.label}</span>
            <span className="ab-radio-description">{opt.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
