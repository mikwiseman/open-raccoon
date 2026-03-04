"use client";

import { useCallback, useEffect, useState } from "react";
import type { RaccoonApi } from "@/lib/api/services";
import type { Agent } from "@/lib/types";
import type { SessionUser } from "@/lib/state/session-store";

type Props = {
  api: RaccoonApi;
  currentUser: SessionUser;
};

export function AgentsView({ api, currentUser }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMyAgents();
      setAgents(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  return (
    <section className="agents-view" aria-label="agents-view">
      <header className="view-header">
        <h2 className="view-title">My Agents</h2>
      </header>

      {loading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {!loading && !error && agents.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-text">No agents yet. Create your first agent to get started.</p>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card">
              <div className="agent-card-header">
                <div className="agent-card-avatar">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="avatar-img" />
                  ) : (
                    <span className="avatar avatar-sm">{agent.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="agent-card-info">
                  <h3 className="agent-card-name">{agent.name}</h3>
                  <span className="agent-card-model">{agent.model}</span>
                </div>
                <span className={`agent-visibility-badge ${agent.visibility}`}>
                  {agent.visibility}
                </span>
              </div>
              {agent.description && (
                <p className="agent-card-description">{agent.description}</p>
              )}
              <div className="agent-card-footer">
                <span className="agent-card-stat">
                  {agent.execution_mode}
                </span>
                <span className="agent-card-stat">
                  {agent.tools.length} tool{agent.tools.length !== 1 ? "s" : ""}
                </span>
                <span className="agent-card-stat">
                  {agent.mcp_servers.length} MCP server{agent.mcp_servers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
