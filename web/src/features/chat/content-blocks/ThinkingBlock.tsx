"use client";

import { useState } from "react";

export type ThinkingBlockData = {
  type: "thinking";
  text: string;
};

export function ThinkingBlock({ block }: { block: ThinkingBlockData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="cb-thinking-block">
      <button
        type="button"
        className="cb-thinking-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="cb-thinking-icon">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span className="cb-thinking-label">Thinking...</span>
      </button>
      {expanded && (
        <div className="cb-thinking-content">
          {block.text}
        </div>
      )}
    </div>
  );
}
