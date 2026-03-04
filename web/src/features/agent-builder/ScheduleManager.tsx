"use client";

import { useCallback, useEffect, useState } from "react";
import type { RaccoonApi } from "@/lib/api/services";
import type { AgentSchedule } from "@/lib/types";

type Props = {
  api: RaccoonApi;
  agentId: string;
};

type ScheduleType = AgentSchedule["schedule_type"];

export function ScheduleManager({ api, agentId }: Props) {
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [scheduleType, setScheduleType] = useState<ScheduleType>("cron");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [intervalSeconds, setIntervalSeconds] = useState(3600);
  const [runAt, setRunAt] = useState("");
  const [enabled, setEnabled] = useState(true);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSchedules(agentId);
      setSchedules(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [api, agentId]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data: Parameters<typeof api.createSchedule>[1] = {
        schedule_type: scheduleType,
        enabled,
      };
      if (scheduleType === "cron") data.cron_expression = cronExpression;
      if (scheduleType === "interval") data.interval_seconds = intervalSeconds;
      if (scheduleType === "once") data.run_at = runAt;

      const res = await api.createSchedule(agentId, data);
      setSchedules((prev) => [...prev, res.schedule]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    }
  }

  async function handleToggle(schedule: AgentSchedule) {
    try {
      const res = await api.updateSchedule(agentId, schedule.id, {
        enabled: !schedule.enabled,
      });
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? res.schedule : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  }

  async function handleDelete(scheduleId: string) {
    try {
      await api.deleteSchedule(agentId, scheduleId);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  }

  return (
    <fieldset className="ab-fieldset" aria-label="schedule-manager">
      <legend className="ab-legend">Schedules</legend>

      {error && <p className="error-text">{error}</p>}

      {loading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
        </div>
      )}

      {!loading && schedules.length === 0 && !showForm && (
        <p className="ab-empty-hint">No schedules configured.</p>
      )}

      {schedules.map((s) => (
        <div key={s.id} className="ab-schedule-item">
          <div className="ab-schedule-info">
            <span className="ab-schedule-type">{s.schedule_type}</span>
            <span className="ab-schedule-detail">
              {s.schedule_type === "cron" && s.cron_expression}
              {s.schedule_type === "interval" && `Every ${s.interval_seconds}s`}
              {s.schedule_type === "once" && s.run_at}
            </span>
          </div>
          <div className="ab-schedule-actions">
            <label className="ab-toggle-switch">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={() => void handleToggle(s)}
              />
              <span className="ab-toggle-track" />
            </label>
            <button
              type="button"
              className="ab-btn ab-btn-ghost ab-btn-danger"
              onClick={() => void handleDelete(s.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <form className="ab-schedule-form" onSubmit={(e) => void handleCreate(e)}>
          <div className="ab-field">
            <label className="ab-label" htmlFor="sched-type">Type</label>
            <select
              id="sched-type"
              className="ab-select"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
            >
              <option value="cron">Cron</option>
              <option value="interval">Interval</option>
              <option value="once">One-shot</option>
            </select>
          </div>

          {scheduleType === "cron" && (
            <div className="ab-field">
              <label className="ab-label" htmlFor="sched-cron">Cron Expression</label>
              <input
                id="sched-cron"
                className="ab-input"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 * * * *"
                required
              />
            </div>
          )}

          {scheduleType === "interval" && (
            <div className="ab-field">
              <label className="ab-label" htmlFor="sched-interval">Interval (seconds)</label>
              <input
                id="sched-interval"
                className="ab-input"
                type="number"
                min={60}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10) || 3600)}
                required
              />
            </div>
          )}

          {scheduleType === "once" && (
            <div className="ab-field">
              <label className="ab-label" htmlFor="sched-runat">Run At</label>
              <input
                id="sched-runat"
                className="ab-input"
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                required
              />
            </div>
          )}

          <label className="ab-toggle-item">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="ab-checkbox"
            />
            <span className="ab-toggle-name">Enabled</span>
          </label>

          <div className="ab-form-actions">
            <button type="button" className="ab-btn ab-btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="ab-btn ab-btn-primary">
              Create Schedule
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="ab-btn ab-btn-small"
          onClick={() => setShowForm(true)}
        >
          + Add Schedule
        </button>
      )}
    </fieldset>
  );
}
