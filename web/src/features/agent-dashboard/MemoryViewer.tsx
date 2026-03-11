'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WaiAgentsApi } from '@/lib/api/services';
import type { AgentMemory } from '@/lib/types';

type Props = {
  api: WaiAgentsApi;
  agentId: string;
};

export function MemoryViewer({ api, agentId }: Props) {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMemories(agentId);
      setMemories(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [api, agentId]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  async function handleDelete(memoryId: string) {
    try {
      await api.deleteMemory(agentId, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  }

  return (
    <div className="ad-memory-viewer">
      {error && <p className="error-text">{error}</p>}

      {loading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
        </div>
      )}

      {!loading && memories.length === 0 && (
        <p className="ab-empty-hint">No memories stored yet.</p>
      )}

      <div className="ad-memory-list">
        {memories.map((memory) => (
          <div key={memory.id} className="ad-memory-card">
            <div className="ad-memory-header">
              <span className="ad-memory-type">{memory.memory_type}</span>
              <div className="ad-memory-meta">
                <span className="ad-memory-importance" title="Importance">
                  {memory.importance.toFixed(1)}
                </span>
                <span className="ad-memory-access" title="Access count">
                  {memory.access_count}x
                </span>
              </div>
            </div>
            <p className="ad-memory-content">{memory.content}</p>
            <div className="ad-memory-footer">
              {memory.tags.length > 0 && (
                <div className="ad-memory-tags">
                  {memory.tags.map((tag) => (
                    <span key={tag} className="ad-memory-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="ab-btn ab-btn-ghost ab-btn-danger ab-btn-small"
                onClick={() => void handleDelete(memory.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
