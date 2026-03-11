'use client';

import { useState } from 'react';
import type { McpServerConfig } from '@/lib/types';

type Props = {
  initial?: McpServerConfig;
  onSave: (config: McpServerConfig) => void;
  onCancel: () => void;
};

type Transport = McpServerConfig['transport'];

export function MCPServerForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [transport, setTransport] = useState<Transport>(initial?.transport ?? 'stdio');
  const [command, setCommand] = useState(initial?.command ?? '');
  const [args, setArgs] = useState(initial?.args?.join(', ') ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [envText, setEnvText] = useState(
    initial?.env
      ? Object.entries(initial.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      : '',
  );
  const [headersText, setHeadersText] = useState(
    initial?.headers
      ? Object.entries(initial.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : '',
  );

  function parseKeyValue(text: string, sep: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(sep);
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + sep.length).trim();
      if (key) result[key] = val;
    }
    return result;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const config: McpServerConfig = {
      name: name.trim(),
      transport,
    };
    if (transport === 'stdio') {
      config.command = command.trim();
      config.args = args
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    } else {
      config.url = url.trim();
    }
    const env = parseKeyValue(envText, '=');
    if (Object.keys(env).length > 0) config.env = env;
    const headers = parseKeyValue(headersText, ':');
    if (Object.keys(headers).length > 0) config.headers = headers;
    onSave(config);
  }

  return (
    <form className="ab-mcp-form" onSubmit={handleSubmit} aria-label="mcp-server-form">
      <h4 className="ab-mcp-form-title">{initial ? 'Edit' : 'Add'} MCP Server</h4>

      <div className="ab-field">
        <label className="ab-label" htmlFor="mcp-name">
          Name
        </label>
        <input
          id="mcp-name"
          className="ab-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. web-search"
          required
        />
      </div>

      <div className="ab-field">
        <label className="ab-label" htmlFor="mcp-transport">
          Transport
        </label>
        <select
          id="mcp-transport"
          className="ab-select"
          value={transport}
          onChange={(e) => setTransport(e.target.value as Transport)}
        >
          <option value="stdio">stdio</option>
          <option value="sse">SSE</option>
          <option value="streamable_http">Streamable HTTP</option>
        </select>
      </div>

      {transport === 'stdio' ? (
        <>
          <div className="ab-field">
            <label className="ab-label" htmlFor="mcp-command">
              Command
            </label>
            <input
              id="mcp-command"
              className="ab-input"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. npx"
              required
            />
          </div>
          <div className="ab-field">
            <label className="ab-label" htmlFor="mcp-args">
              Arguments (comma-separated)
            </label>
            <input
              id="mcp-args"
              className="ab-input"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. -y, @modelcontextprotocol/server-web-search"
            />
          </div>
        </>
      ) : (
        <div className="ab-field">
          <label className="ab-label" htmlFor="mcp-url">
            URL
          </label>
          <input
            id="mcp-url"
            className="ab-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
      )}

      <div className="ab-field">
        <label className="ab-label" htmlFor="mcp-env">
          Environment Variables (KEY=VALUE per line)
        </label>
        <textarea
          id="mcp-env"
          className="ab-textarea"
          value={envText}
          onChange={(e) => setEnvText(e.target.value)}
          placeholder={'API_KEY=sk-...\nDEBUG=true'}
          rows={3}
        />
      </div>

      <div className="ab-field">
        <label className="ab-label" htmlFor="mcp-headers">
          Headers (Key: Value per line)
        </label>
        <textarea
          id="mcp-headers"
          className="ab-textarea"
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder="Authorization: Bearer token"
          rows={3}
        />
      </div>

      <div className="ab-form-actions">
        <button type="button" className="ab-btn ab-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="ab-btn ab-btn-primary">
          {initial ? 'Update' : 'Add'} Server
        </button>
      </div>
    </form>
  );
}
