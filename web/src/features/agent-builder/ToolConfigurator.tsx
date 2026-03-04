"use client";

import { useState } from "react";
import type { ToolConfig, McpServerConfig } from "@/lib/types";
import { MCPServerForm } from "./MCPServerForm";

type Props = {
  tools: ToolConfig[];
  mcpServers: McpServerConfig[];
  onToolsChange: (tools: ToolConfig[]) => void;
  onMcpServersChange: (servers: McpServerConfig[]) => void;
};

const BUILT_IN_TOOLS: Array<{ name: string; description: string }> = [
  { name: "memory", description: "Store and retrieve agent memories" },
  { name: "web_search", description: "Search the web for information" },
  { name: "code_execution", description: "Execute code in a sandboxed environment" },
  { name: "filesystem", description: "Read and write files" },
];

export function ToolConfigurator({ tools, mcpServers, onToolsChange, onMcpServersChange }: Props) {
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [editingMcpIndex, setEditingMcpIndex] = useState<number | null>(null);

  function isToolEnabled(name: string): boolean {
    return tools.some((t) => t.name === name);
  }

  function toggleTool(name: string, description: string) {
    if (isToolEnabled(name)) {
      onToolsChange(tools.filter((t) => t.name !== name));
    } else {
      onToolsChange([
        ...tools,
        { name, description, input_schema: {}, requires_approval: false },
      ]);
    }
  }

  function handleSaveMcp(config: McpServerConfig) {
    if (editingMcpIndex !== null) {
      const updated = [...mcpServers];
      updated[editingMcpIndex] = config;
      onMcpServersChange(updated);
      setEditingMcpIndex(null);
    } else {
      onMcpServersChange([...mcpServers, config]);
    }
    setShowMcpForm(false);
  }

  function removeMcp(index: number) {
    onMcpServersChange(mcpServers.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="ab-fieldset" aria-label="tool-configurator">
      <legend className="ab-legend">Tools &amp; MCP Servers</legend>

      <div className="ab-section">
        <h4 className="ab-section-title">Built-in Tools</h4>
        <div className="ab-toggle-list">
          {BUILT_IN_TOOLS.map((bt) => (
            <label key={bt.name} className="ab-toggle-item">
              <input
                type="checkbox"
                checked={isToolEnabled(bt.name)}
                onChange={() => toggleTool(bt.name, bt.description)}
                className="ab-checkbox"
              />
              <div className="ab-toggle-info">
                <span className="ab-toggle-name">{bt.name}</span>
                <span className="ab-toggle-desc">{bt.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="ab-section">
        <div className="ab-section-header">
          <h4 className="ab-section-title">MCP Servers</h4>
          <button
            type="button"
            className="ab-btn ab-btn-small"
            onClick={() => {
              setEditingMcpIndex(null);
              setShowMcpForm(true);
            }}
          >
            + Add Server
          </button>
        </div>

        {mcpServers.length === 0 && !showMcpForm && (
          <p className="ab-empty-hint">No MCP servers configured.</p>
        )}

        {mcpServers.map((server, i) => (
          <div key={`${server.name}-${i}`} className="ab-mcp-item">
            <div className="ab-mcp-item-info">
              <span className="ab-mcp-item-name">{server.name}</span>
              <span className="ab-mcp-item-transport">{server.transport}</span>
            </div>
            <div className="ab-mcp-item-actions">
              <button
                type="button"
                className="ab-btn ab-btn-ghost"
                onClick={() => {
                  setEditingMcpIndex(i);
                  setShowMcpForm(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="ab-btn ab-btn-ghost ab-btn-danger"
                onClick={() => removeMcp(i)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {showMcpForm && (
          <MCPServerForm
            initial={editingMcpIndex !== null ? mcpServers[editingMcpIndex] : undefined}
            onSave={handleSaveMcp}
            onCancel={() => {
              setShowMcpForm(false);
              setEditingMcpIndex(null);
            }}
          />
        )}
      </div>
    </fieldset>
  );
}
