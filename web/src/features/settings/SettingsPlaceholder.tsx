"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, type WaiAgentsApi } from "@/lib/api";
import type { BridgeConnection, User } from "@/lib/types";
import { toIsoLocal } from "@/lib/utils";
import type { SessionUser } from "@/lib/state/session-store";

type SettingsViewProps = {
  api: WaiAgentsApi;
  user: SessionUser;
  onUserUpdated: (user: SessionUser) => void;
  onLogout: () => void;
};

export function SettingsView({ api, user, onUserUpdated, onLogout }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");

  const [bridges, setBridges] = useState<BridgeConnection[]>([]);
  const [usage, setUsage] = useState<{
    tokens_used: number;
    tokens_limit: number;
    period_start: string;
    period_end: string;
  } | null>(null);

  const [telegramToken, setTelegramToken] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [bridgesUnavailable, setBridgesUnavailable] = useState(false);
  const [usageUnavailable, setUsageUnavailable] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return (
      displayName !== (user.display_name || "") ||
      bio !== (user.bio || "") ||
      avatarUrl !== (user.avatar_url || "")
    );
  }, [displayName, bio, avatarUrl, user.display_name, user.bio, user.avatar_url]);

  const usagePercent = useMemo(() => {
    if (!usage || usage.tokens_limit <= 0) return 0;
    return Math.min(100, (usage.tokens_used / usage.tokens_limit) * 100);
  }, [usage]);

  const periodLabel = useMemo(() => {
    if (!usage?.period_start) {
      const now = new Date();
      return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    const date = new Date(usage.period_start);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [usage]);

  const initials = useMemo(() => {
    const name = user.display_name || user.username || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "?";
  }, [user.display_name, user.username]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setBridgesUnavailable(false);
    setUsageUnavailable(false);

    const [bridgesResult, usageResult] = await Promise.allSettled([
      api.listBridges({ limit: 20 }),
      api.usage(),
    ]);

    if (bridgesResult.status === "fulfilled") {
      setBridges(bridgesResult.value.items);
    } else if (isNotFoundError(bridgesResult.reason)) {
      setBridges([]);
      setBridgesUnavailable(true);
    } else {
      setError(getErrorMessage(bridgesResult.reason));
    }

    if (usageResult.status === "fulfilled") {
      setUsage(usageResult.value.usage);
    } else if (isNotFoundError(usageResult.reason)) {
      setUsage(null);
      setUsageUnavailable(true);
    } else {
      setError((previous) => previous ?? getErrorMessage(usageResult.reason));
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (info) {
      const timer = setTimeout(() => setInfo(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await api.updateMe({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
      });
      onUserUpdated(toSessionUser(response.user));
      setInfo("Profile updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const connectTelegram = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await api.connectTelegram({ bot_token: telegramToken });
      setBridges((previous) => mergeBridge(previous, response.bridge));
      setTelegramToken("");
      setInfo("Telegram bridge connected.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const connectWhatsapp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await api.connectWhatsapp({ api_token: whatsappToken });
      setBridges((previous) => mergeBridge(previous, response.bridge));
      setWhatsappToken("");
      setInfo("WhatsApp bridge connected.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const disconnectBridge = async (bridge: BridgeConnection) => {
    setError(null);

    try {
      await api.disconnectBridge(bridge.id);
      setBridges((previous) => previous.filter((b) => b.id !== bridge.id));
      setInfo(`Disconnected ${bridge.platform}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    onLogout();
  };

  return (
    <section className="settings-layout" aria-label="settings-module" style={layoutStyle}>
      <div style={containerStyle}>
        {info && <p className="success-banner">{info}</p>}
        {error && <p className="error-banner">{error}</p>}

        {/* ── Profile Section ── */}
        <form onSubmit={saveProfile} style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Profile</h3>

          <div style={profileHeaderStyle}>
            <div style={avatarStyle}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.username}
                  style={avatarImgStyle}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: "var(--weight-semibold)" as unknown as number, fontSize: "var(--text-lg)" }}>
                @{user.username}
              </p>
              <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
                {user.email || "No email"}
              </p>
            </div>
          </div>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Display Name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              style={bioTextareaStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </label>

          {isDirty && (
            <button type="submit" className="btn-primary" disabled={saving} style={saveButtonStyle}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </form>

        {/* ── Usage Section ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Usage</h3>

          {loading ? (
            <div style={skeletonBlockStyle}>
              <div className="skeleton" style={{ height: 20, width: "60%" }} />
              <div className="skeleton" style={{ height: 6, width: "100%", marginTop: 12 }} />
            </div>
          ) : usage ? (
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
                {periodLabel}
              </p>
              <div style={usageNumbersStyle}>
                <span style={usageCountStyle}>
                  {usage.tokens_used.toLocaleString()}
                </span>
                <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
                  {" / "}
                  {usage.tokens_limit.toLocaleString()} tokens
                </span>
              </div>
              <div className="progress-track" aria-label="usage-progress" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
              {usageUnavailable
                ? "Usage reporting is not available on the active public API."
                : "No usage data available."}
            </p>
          )}
        </section>

        {/* ── Bridge Connections Section ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Bridge Connections</h3>

          {loading ? (
            <div style={skeletonBlockStyle}>
              <div className="skeleton" style={{ height: 48, width: "100%" }} />
              <div className="skeleton" style={{ height: 48, width: "100%", marginTop: 8 }} />
            </div>
          ) : bridgesUnavailable ? (
            <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
              Bridge management is not available on the active public API.
            </p>
          ) : (
            <>
              {bridges.length > 0 && (
                <ul style={bridgeListStyle}>
                  {bridges.map((bridge) => (
                    <li key={bridge.id} style={bridgeItemStyle}>
                      <div style={bridgeInfoStyle}>
                        <div style={bridgeIconRowStyle}>
                          <span style={platformIconStyle(bridge.platform)}>
                            {bridge.platform === "telegram" ? telegramIcon : whatsappIcon}
                          </span>
                          <span style={{ fontWeight: "var(--weight-medium)" as unknown as number, textTransform: "capitalize" as const }}>
                            {bridge.platform}
                          </span>
                          <span style={statusDotStyle(bridge.status)} />
                        </div>
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--text-xs)" }}>
                          {bridge.status} {bridge.last_sync_at ? `· synced ${toIsoLocal(bridge.last_sync_at)}` : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => void disconnectBridge(bridge)}
                        style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)" }}
                      >
                        Disconnect
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={connectSectionStyle}>
                <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as unknown as number }}>
                  Connect a new bridge
                </p>

                <form onSubmit={connectTelegram} style={connectFormStyle}>
                  <div style={{ flex: 1, display: "grid", gap: "var(--space-1)" }}>
                    <span style={labelTextStyle}>Telegram Bot Token</span>
                    <input
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="123456:ABC-DEF..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bridgesUnavailable || !telegramToken.trim()}
                    style={telegramButtonStyle}
                  >
                    {telegramIcon}
                    Connect
                  </button>
                </form>

                <form onSubmit={connectWhatsapp} style={connectFormStyle}>
                  <div style={{ flex: 1, display: "grid", gap: "var(--space-1)" }}>
                    <span style={labelTextStyle}>WhatsApp API Token</span>
                    <input
                      value={whatsappToken}
                      onChange={(e) => setWhatsappToken(e.target.value)}
                      placeholder="wa_..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bridgesUnavailable || !whatsappToken.trim()}
                    style={whatsappButtonStyle}
                  >
                    {whatsappIcon}
                    Connect
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

        {/* ── Danger Zone ── */}
        <section style={dangerSectionStyle}>
          <h3 style={{ ...sectionHeaderStyle, color: "var(--color-error)" }}>Danger Zone</h3>
          <button
            type="button"
            className="btn-danger"
            onClick={() => void handleLogout()}
            style={logoutButtonStyle}
          >
            Log Out
          </button>
        </section>
      </div>
    </section>
  );
}

export function SettingsPlaceholder() {
  return <section aria-label="settings-placeholder">Settings module placeholder</section>;
}

/* ── Helpers ── */

function mergeBridge(previous: BridgeConnection[], bridge: BridgeConnection): BridgeConnection[] {
  const existing = previous.findIndex((item) => item.id === bridge.id);

  if (existing === -1) {
    return [bridge, ...previous];
  }

  const next = [...previous];
  next[existing] = bridge;
  return next;
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Request failed";
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/* ── Inline Icons ── */

const telegramIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const whatsappIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

/* ── Inline Styles (CSS Variables) ── */

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  border: "none",
  background: "transparent",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  width: "100%",
  display: "grid",
  gap: "var(--space-6)",
};

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  border: "1px solid var(--color-border-primary)",
  borderRadius: "var(--radius-xl)",
  background: "var(--color-bg-elevated)",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "var(--text-lg)",
  fontWeight: "var(--weight-medium)" as unknown as number,
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-1)",
};

const labelTextStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-text-secondary)",
  fontWeight: "var(--weight-medium)" as unknown as number,
};

const profileHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-4)",
};

const avatarStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: "var(--radius-full)",
  background: "var(--color-accent-primary)",
  color: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "var(--text-2xl)",
  fontWeight: "var(--weight-semibold)" as unknown as number,
  flexShrink: 0,
  overflow: "hidden",
};

const avatarImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const bioTextareaStyle: React.CSSProperties = {
  minHeight: 100,
  maxHeight: 200,
  resize: "vertical",
};

const saveButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
};

const usageNumbersStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-2)",
};

const usageCountStyle: React.CSSProperties = {
  fontSize: "var(--text-2xl)",
  fontWeight: "var(--weight-bold)" as unknown as number,
};

const bridgeListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "var(--space-2)",
};

const bridgeItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  border: "1px solid var(--color-border-primary)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-bg-secondary)",
};

const bridgeInfoStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-1)",
};

const bridgeIconRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

function platformIconStyle(platform: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    color: platform === "telegram" ? "#0088cc" : "#25D366",
  };
}

function statusDotStyle(status: string): React.CSSProperties {
  let bg = "var(--color-text-tertiary)";
  if (status === "connected" || status === "active") bg = "var(--color-success)";
  else if (status === "reconnecting") bg = "var(--color-warning)";
  else if (status === "disconnected" || status === "error") bg = "var(--color-error)";

  return {
    width: 8,
    height: 8,
    borderRadius: "var(--radius-full)",
    background: bg,
    flexShrink: 0,
  };
}

const connectSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  paddingTop: "var(--space-4)",
  borderTop: "1px solid var(--color-border-primary)",
};

const connectFormStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "var(--space-3)",
};

const telegramButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  background: "#0088cc",
  color: "#FFFFFF",
  borderColor: "#0088cc",
  whiteSpace: "nowrap",
  flexShrink: 0,
  height: 48,
};

const whatsappButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  background: "#25D366",
  color: "#FFFFFF",
  borderColor: "#25D366",
  whiteSpace: "nowrap",
  flexShrink: 0,
  height: 48,
};

const dangerSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  border: "1px solid var(--color-error)",
  borderRadius: "var(--radius-xl)",
  background: "var(--color-bg-elevated)",
};

const logoutButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
};

const skeletonBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-2)",
};
