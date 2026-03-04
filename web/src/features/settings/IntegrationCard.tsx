"use client";

import type { IntegrationStatus } from "@/lib/types";

type Props = {
  integration: IntegrationStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
};

const STATUS_LABELS: Record<IntegrationStatus["status"], { label: string; className: string }> = {
  active: { label: "Connected", className: "is-status-active" },
  expired: { label: "Expired", className: "is-status-expired" },
  revoked: { label: "Revoked", className: "is-status-revoked" },
  not_connected: { label: "Not Connected", className: "is-status-disconnected" },
};

export function IntegrationCard({ integration, onConnect, onDisconnect, connecting }: Props) {
  const status = STATUS_LABELS[integration.status];
  const isConnected = integration.connected;

  return (
    <div className="is-card" aria-label={`integration-${integration.service}`}>
      <div className="is-card-header">
        <span className="is-card-icon">{getServiceIcon(integration.service)}</span>
        <div className="is-card-info">
          <span className="is-card-name">{formatServiceName(integration.service)}</span>
          <span className={`is-card-status ${status.className}`}>{status.label}</span>
        </div>
      </div>

      {integration.scopes.length > 0 && (
        <div className="is-card-scopes">
          {integration.scopes.map((scope) => (
            <span key={scope} className="is-scope-tag">{scope}</span>
          ))}
        </div>
      )}

      {integration.expires_at && isConnected && (
        <span className="is-card-expires">
          Expires: {new Date(integration.expires_at).toLocaleDateString()}
        </span>
      )}

      <div className="is-card-actions">
        {isConnected ? (
          <button
            type="button"
            className="ab-btn ab-btn-secondary ab-btn-small"
            onClick={onDisconnect}
            disabled={connecting}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="ab-btn ab-btn-primary ab-btn-small"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatServiceName(service: string): string {
  return service
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getServiceIcon(service: string): string {
  const icons: Record<string, string> = {
    github: "GH",
    gmail: "GM",
    google_calendar: "GC",
    slack: "SL",
    discord: "DC",
    notion: "NO",
    linear: "LN",
    jira: "JR",
    confluence: "CF",
    dropbox: "DB",
  };
  return icons[service] ?? service.slice(0, 2).toUpperCase();
}
