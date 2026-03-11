'use client';

import { useState } from 'react';

type Props = {
  service: string;
  onSave: (apiKey: string) => void;
  saved: boolean;
};

export function BYOKPanel({ service, onSave, saved }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    onSave(apiKey.trim());
    setSaving(false);
    setApiKey('');
  }

  return (
    <div className="is-byok-panel">
      <h4 className="is-byok-title">Bring Your Own Key</h4>
      <p className="is-byok-desc">
        Use your own API key for {service}. Keys are encrypted at rest.
      </p>
      <div className="is-byok-input-row">
        <input
          type="password"
          className="ab-input"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`sk-... or API key for ${service}`}
        />
        <button
          type="button"
          className="ab-btn ab-btn-primary ab-btn-small"
          onClick={() => void handleSave()}
          disabled={saving || !apiKey.trim()}
        >
          {saving ? 'Saving...' : 'Save Key'}
        </button>
      </div>
      {saved && <span className="is-byok-saved">Key saved</span>}
    </div>
  );
}
