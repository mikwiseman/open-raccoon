"use client";

import { useState } from "react";
import type { WaiAgentsApi } from "@/lib/api/services";
import type { Agent, ToolConfig, McpServerConfig } from "@/lib/types";
import { ModelSelector } from "./ModelSelector";
import { SystemPromptEditor } from "./SystemPromptEditor";
import { ToolConfigurator } from "./ToolConfigurator";
import { VisibilitySelector } from "./VisibilitySelector";
import { ScheduleManager } from "./ScheduleManager";
import { AgentTestSandbox } from "./AgentTestSandbox";

type Props = {
  api: WaiAgentsApi;
  accessToken: string;
  agent?: Agent;
  onSaved: (agent: Agent) => void;
  onCancel: () => void;
};

const CATEGORIES = [
  "general",
  "coding",
  "writing",
  "research",
  "data",
  "creative",
  "education",
  "productivity",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AgentForm({ api, accessToken, agent, onSaved, onCancel }: Props) {
  const isEditing = !!agent;

  const [name, setName] = useState(agent?.name ?? "");
  const [slug, setSlug] = useState(agent?.slug ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [category, setCategory] = useState(agent?.category ?? "general");
  const [model, setModel] = useState(agent?.model ?? "claude-sonnet-4-6");
  const [executionMode, setExecutionMode] = useState<Agent["execution_mode"]>(
    agent?.execution_mode ?? "raw"
  );
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.max_tokens ?? 4096);
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");
  const [tools, setTools] = useState<ToolConfig[]>(agent?.tools ?? []);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>(agent?.mcp_servers ?? []);
  const [visibility, setVisibility] = useState<Agent["visibility"]>(agent?.visibility ?? "private");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestSandbox, setShowTestSandbox] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!isEditing) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        const res = await api.updateAgent(agent.id, {
          name,
          slug,
          description: description || undefined,
          system_prompt: systemPrompt,
          model,
          execution_mode: executionMode,
          temperature,
          max_tokens: maxTokens,
          tools,
          mcp_servers: mcpServers,
          visibility,
          category,
        });
        onSaved(res.agent);
      } else {
        const res = await api.createAgent({
          name,
          slug,
          description: description || undefined,
          system_prompt: systemPrompt,
          model,
          execution_mode: executionMode,
          temperature,
          max_tokens: maxTokens,
          tools,
          mcp_servers: mcpServers,
          visibility,
          category,
        });
        onSaved(res.agent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ab-form" onSubmit={(e) => void handleSubmit(e)} aria-label="agent-form">
      <div className="ab-form-header">
        <h3 className="ab-form-title">{isEditing ? "Edit Agent" : "Create Agent"}</h3>
        <div className="ab-form-header-actions">
          {isEditing && (
            <button
              type="button"
              className="ab-btn ab-btn-secondary"
              onClick={() => setShowTestSandbox(!showTestSandbox)}
            >
              {showTestSandbox ? "Hide Test" : "Test Agent"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* Basic Info */}
      <fieldset className="ab-fieldset">
        <legend className="ab-legend">Basic Info</legend>
        <div className="ab-field-grid">
          <div className="ab-field">
            <label className="ab-label" htmlFor="agent-name">Name</label>
            <input
              id="agent-name"
              className="ab-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Agent"
              required
            />
          </div>

          <div className="ab-field">
            <label className="ab-label" htmlFor="agent-slug">Slug</label>
            <input
              id="agent-slug"
              className="ab-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-agent"
              required
            />
          </div>

          <div className="ab-field ab-field-full">
            <label className="ab-label" htmlFor="agent-description">Description</label>
            <textarea
              id="agent-description"
              className="ab-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              rows={3}
            />
          </div>

          <div className="ab-field">
            <label className="ab-label" htmlFor="agent-category">Category</label>
            <select
              id="agent-category"
              className="ab-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <ModelSelector
        model={model}
        executionMode={executionMode}
        temperature={temperature}
        maxTokens={maxTokens}
        onModelChange={setModel}
        onExecutionModeChange={setExecutionMode}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
      />

      <SystemPromptEditor value={systemPrompt} onChange={setSystemPrompt} />

      <ToolConfigurator
        tools={tools}
        mcpServers={mcpServers}
        onToolsChange={setTools}
        onMcpServersChange={setMcpServers}
      />

      <VisibilitySelector value={visibility} onChange={setVisibility} />

      {isEditing && (
        <ScheduleManager api={api} agentId={agent.id} />
      )}

      {showTestSandbox && isEditing && (
        <AgentTestSandbox api={api} agentId={agent.id} accessToken={accessToken} />
      )}

      <div className="ab-form-actions ab-form-actions-main">
        <button type="button" className="ab-btn ab-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="ab-btn ab-btn-primary" disabled={saving || !name.trim() || !systemPrompt.trim()}>
          {saving ? "Saving..." : isEditing ? "Update Agent" : "Create Agent"}
        </button>
      </div>
    </form>
  );
}
