'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WaiAgentsApi } from '@/lib/api/services';
import type { SessionUser } from '@/lib/state/session-store';
import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';
import { AgentForm } from './AgentForm';

type Props = {
  api: WaiAgentsApi;
  accessToken: string;
  currentUser: SessionUser;
};

export function AgentBuilderView({ api, accessToken }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMyAgents();
      setAgents(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  function handleSaved(agent: Agent) {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === agent.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = agent;
        return updated;
      }
      return [agent, ...prev];
    });
    setSelectedAgentId(agent.id);
    setShowCreateForm(false);
  }

  async function handleDelete(agentId: string) {
    if (!window.confirm('Delete this agent? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteAgent(agentId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgentId === agentId) {
        setSelectedAgentId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  }

  const showForm = showCreateForm || selectedAgent !== null;

  return (
    <div className="ab-layout">
      {/* Sidebar: Agent list */}
      <aside className="ab-sidebar">
        <div className="ab-sidebar-header">
          <h3 className="ab-sidebar-title">My Agents</h3>
          <button
            type="button"
            className="ab-btn ab-btn-primary ab-btn-small"
            onClick={() => {
              setSelectedAgentId(null);
              setShowCreateForm(true);
            }}
          >
            + New
          </button>
        </div>

        {loading && (
          <div className="loading-spinner-container">
            <div className="loading-spinner" />
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {!loading && agents.length === 0 && (
          <p className="ab-empty-hint">No agents yet. Create your first one.</p>
        )}

        <div className="ab-agent-list">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selectedAgentId === agent.id}
              onSelect={() => {
                setSelectedAgentId(agent.id);
                setShowCreateForm(false);
              }}
            />
          ))}
        </div>
      </aside>

      {/* Main: Form or empty state */}
      <main className="ab-main">
        {showForm ? (
          <div className="ab-form-container">
            <AgentForm
              key={selectedAgent?.id ?? 'new'}
              api={api}
              accessToken={accessToken}
              agent={selectedAgent ?? undefined}
              onSaved={handleSaved}
              onCancel={() => {
                setSelectedAgentId(null);
                setShowCreateForm(false);
              }}
            />
            {selectedAgent && (
              <div className="ab-danger-zone">
                <button
                  type="button"
                  className="ab-btn ab-btn-danger"
                  onClick={() => void handleDelete(selectedAgent.id)}
                >
                  Delete Agent
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ab-empty-main">
            <p className="ab-empty-main-text">Select an agent to edit, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
