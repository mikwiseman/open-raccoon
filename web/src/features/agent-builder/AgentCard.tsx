"use client";

import type { Agent } from "@/lib/types";

type Props = {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
};

export function AgentCard({ agent, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`ab-agent-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-label={`agent-card-${agent.slug}`}
    >
      <div className="ab-agent-card-top">
        <span className="avatar avatar-sm">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.name} className="avatar-img" />
          ) : (
            agent.name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="ab-agent-card-info">
          <span className="ab-agent-card-name">{agent.name}</span>
          <span className="ab-agent-card-model">{agent.model}</span>
        </div>
        <span className={`agent-visibility-badge ${agent.visibility}`}>
          {agent.visibility}
        </span>
      </div>
      {agent.description && (
        <p className="ab-agent-card-desc">{agent.description}</p>
      )}
    </button>
  );
}
