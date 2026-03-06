"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createRaccoonApi } from "@/lib/api";
import { useSessionStore } from "@/lib/state";
import type { SessionUser } from "@/lib/state/session-store";
import { AuthView } from "@/features/auth";
import { AgentBuilderView } from "@/features/agent-builder";
import { ChatView } from "@/features/chat";
import { FeedView } from "@/features/feed";
import { PagesView } from "@/features/pages";
import { MarketplaceView } from "@/features/marketplace";
import { SettingsView } from "@/features/settings";

type Tab = "chats" | "agents" | "feed" | "pages" | "marketplace" | "settings";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "chats", label: "Chats", icon: "💬" },
  { key: "agents", label: "Agents", icon: "🤖" },
  { key: "feed", label: "Feed", icon: "📡" },
  { key: "pages", label: "Pages", icon: "📄" },
  { key: "marketplace", label: "Marketplace", icon: "🏪" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

export default function HomePage() {
  const api = useMemo(
    () => createRaccoonApi(() => useSessionStore.getState().accessToken),
    []
  );

  const {
    hydrated,
    isAuthenticated,
    accessToken,
    refreshToken,
    user,
    setSession,
    clearSession,
  } = useSessionStore((state) => ({
    hydrated: state.hydrated,
    isAuthenticated: state.isAuthenticated,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    user: state.user,
    setSession: state.setSession,
    clearSession: state.clearSession,
  }));

  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [focusConversationId, setFocusConversationId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !accessToken) return;

    void api
      .me()
      .then((response) => {
        const nextUser = toSessionUser(response.user);
        setSession({
          accessToken,
          refreshToken: refreshToken ?? undefined,
          user: nextUser,
        });
      })
      .catch(() => {
        clearSession();
      });
  }, [accessToken, api, clearSession, hydrated, isAuthenticated, refreshToken, setSession]);

  // Auto-clear status message
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  const onLogout = useCallback(async () => {
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // local session will still be cleared
      }
    }
    clearSession();
    setStatusMessage("Logged out.");
  }, [api, clearSession, refreshToken]);

  const handleStartAgentConversation = useCallback((conversationId: string) => {
    setFocusConversationId(conversationId);
    setActiveTab("chats");
  }, []);

  // Loading state
  if (!hydrated) {
    return (
      <main className="app-shell loading-shell" aria-label="loading-shell">
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
          <p className="loading-text">Restoring session...</p>
        </div>
      </main>
    );
  }

  // Auth state
  if (!isAuthenticated || !accessToken || !user) {
    return (
      <main className="app-shell auth-shell">
        <div className="auth-branding">
          <div className="auth-logo">🦝</div>
          <h1 className="auth-title">WaiAgents</h1>
          <p className="auth-subtitle">
            Messaging, AI agents, and pages — all in one place.
          </p>
        </div>

        <AuthView
          api={api}
          onAuthenticated={({ user: nextUser, tokens }) => {
            setSession({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              user: nextUser,
            });
            setStatusMessage(`Signed in as @${nextUser.username}`);
          }}
        />

        {statusMessage && <p className="info-banner">{statusMessage}</p>}
      </main>
    );
  }

  // Main app
  return (
    <div className="app-layout" aria-label="web-app-shell">
      {/* Sidebar Navigation */}
      <nav className="app-sidebar" aria-label="primary-navigation">
        <div className="sidebar-brand">
          <span className="brand-icon">🦝</span>
          <span className="brand-name">WaiAgents</span>
        </div>

        <div className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`sidebar-nav-item ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              title={tab.label}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="avatar avatar-sm">
            {getInitials(user.display_name || user.username)}
          </div>
          <span className="sidebar-username">
            {user.display_name || user.username}
          </span>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" aria-label="mobile-navigation">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`mobile-nav-item ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === "chats" && (
          <ChatView
            api={api}
            accessToken={accessToken}
            currentUser={user}
            focusConversationId={focusConversationId}
            onConversationFocused={() => {
              if (focusConversationId) setFocusConversationId(null);
            }}
          />
        )}

        {activeTab === "agents" && (
          <AgentBuilderView api={api} accessToken={accessToken} currentUser={user} />
        )}

        {activeTab === "feed" && <FeedView api={api} currentUser={user} />}

        {activeTab === "pages" && <PagesView api={api} currentUser={user} />}

        {activeTab === "marketplace" && (
          <MarketplaceView
            api={api}
            currentUser={user}
            onOpenConversation={handleStartAgentConversation}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            api={api}
            user={user}
            onUserUpdated={(nextUser) => {
              setSession({
                accessToken,
                refreshToken: refreshToken ?? undefined,
                user: nextUser,
              });
            }}
            onLogout={() => void onLogout()}
          />
        )}
      </main>

      {/* Status Toast */}
      {statusMessage && (
        <div className="toast-container">
          <div className="toast info-banner">{statusMessage}</div>
        </div>
      )}
    </div>
  );
}

function toSessionUser(user: {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  avatar_url: string | null;
  bio: string | null;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
  };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
