"use client";

import { useCallback, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const VARIABLES = [
  { label: "User Name", token: "{{user.name}}" },
  { label: "Date", token: "{{date}}" },
  { label: "Time", token: "{{time}}" },
  { label: "Agent Name", token: "{{agent.name}}" },
];

export function SystemPromptEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback(
    (token: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = before + token + after;
      onChange(next);

      requestAnimationFrame(() => {
        textarea.selectionStart = start + token.length;
        textarea.selectionEnd = start + token.length;
        textarea.focus();
      });
    },
    [value, onChange]
  );

  return (
    <fieldset className="ab-fieldset" aria-label="system-prompt-editor">
      <legend className="ab-legend">System Prompt</legend>

      <div className="ab-variable-bar">
        <span className="ab-variable-label">Insert:</span>
        {VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            className="ab-variable-btn"
            onClick={() => insertVariable(v.token)}
            title={`Insert ${v.token}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        className="ab-textarea ab-system-prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="You are a helpful assistant that..."
        rows={10}
      />

      <div className="ab-char-count">
        {value.length.toLocaleString()} characters
      </div>
    </fieldset>
  );
}
