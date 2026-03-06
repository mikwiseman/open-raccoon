"use client";

import { useCallback, useState } from "react";
import type { WaiAgentsApi } from "@/lib/api/services";

type Props = {
  api: WaiAgentsApi;
  service: string;
  onConnected: () => void;
};

export function OAuthConnectButton({ api, service, onConnected }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await api.authorizeIntegration(service);
      const popup = window.open(res.authorize_url, `oauth-${service}`, "width=600,height=700");
      if (!popup) {
        setError("Popup blocked. Please allow popups for this site.");
        setConnecting(false);
        return;
      }

      // Poll for popup closure
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          setConnecting(false);
          onConnected();
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth flow");
      setConnecting(false);
    }
  }, [api, service, onConnected]);

  return (
    <div className="is-oauth-connect">
      <button
        type="button"
        className="ab-btn ab-btn-primary ab-btn-small"
        onClick={() => void handleConnect()}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect"}
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
