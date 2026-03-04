"use client";

import { useCallback, useState } from "react";
import type { RaccoonApi } from "@/lib/api/services";
import type { Agent, AgentEvent } from "@/lib/types";
import { AgentHealthIndicator } from "./AgentHealthIndicator";
import { StatsCards } from "./StatsCards";
import { ExecutionHistory } from "./ExecutionHistory";
import { CostBreakdown } from "./CostBreakdown";
import { MemoryViewer } from "./MemoryViewer";

type Props = {
  api: RaccoonApi;
  agent: Agent;
};

type DashTab = "overview" | "events" | "memories";

const TABS: Array<{ key: DashTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Events" },
  { key: "memories", label: "Memories" },
];

function deriveHealth(events: AgentEvent[]): "idle" | "running" | "error" {
  if (events.length === 0) return "idle";
  const latest = events[0];
  if (latest.status === "running") return "running";
  if (latest.status === "failed" || latest.status === "timeout") return "error";
  return "idle";
}

export function AgentDashboardView({ api, agent }: Props) {
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const handleEventsLoaded = useCallback((loaded: AgentEvent[]) => {
    setEvents(loaded);
  }, []);

  return (
    <div className="ad-dashboard" aria-label="agent-dashboard-view">
      <div className="ad-header">
        <div className="ad-header-info">
          <h3 className="ad-agent-name">{agent.name}</h3>
          <AgentHealthIndicator status={deriveHealth(events)} />
        </div>
        <div className="ad-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`ad-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ad-content">
        {activeTab === "overview" && (
          <div className="ad-overview">
            <StatsCards events={events} />
            <CostBreakdown events={events} />
          </div>
        )}

        {activeTab === "events" && (
          <ExecutionHistory
            api={api}
            agentId={agent.id}
            onEventsLoaded={handleEventsLoaded}
          />
        )}

        {activeTab === "memories" && (
          <MemoryViewer api={api} agentId={agent.id} />
        )}
      </div>
    </div>
  );
}
