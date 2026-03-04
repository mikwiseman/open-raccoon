"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { RaccoonApi } from "@/lib/api";
import type { SessionUser } from "@/lib/state/session-store";
import type { Page, PageVersion } from "@/lib/types";
import { toIsoLocal } from "@/lib/utils";

interface PagesViewProps {
  api: RaccoonApi;
  currentUser: SessionUser;
}

const VISIBILITY_OPTIONS: Array<Page["visibility"]> = ["public", "unlisted", "private"];

export function PagesView({ api, currentUser }: PagesViewProps) {
  const [items, setItems] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PageVersion[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugManual, setCreateSlugManual] = useState(false);
  const [createVisibility, setCreateVisibility] = useState<Page["visibility"]>("private");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Page["visibility"]>("public");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [forking, setForking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const isDirty = useMemo(() => {
    if (!selected) return false;
    return (
      title !== selected.title ||
      description !== (selected.description || "") ||
      visibility !== selected.visibility
    );
  }, [selected, title, description, visibility]);

  const loadPages = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.listPages({ limit: 50 });
      setItems(response.items);

      if (response.items.length === 0) {
        setSelectedId(null);
      } else if (!selectedId || !response.items.some((item) => item.id === selectedId)) {
        setSelectedId(response.items[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setVersions([]);
      setTitle("");
      setDescription("");
      setVisibility("public");
      return;
    }

    setTitle(selected.title);
    setDescription(selected.description || "");
    setVisibility(selected.visibility);

    void api
      .listPageVersions(selected.id)
      .then((response) => setVersions(response.items))
      .catch(() => setVersions([]));
  }, [api, selected]);

  const createPage = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const nextTitle = createTitle.trim();
    const nextSlug = normalizeSlug(createSlug.trim() || nextTitle);
    if (!nextTitle || !nextSlug) {
      setError("Title and slug are required.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.createPage({
        title: nextTitle,
        slug: nextSlug,
        description: "",
        visibility: createVisibility
      });

      setItems((previous) => [response.page, ...previous.filter((item) => item.id !== response.page.id)]);
      setSelectedId(response.page.id);
      setCreateTitle("");
      setCreateSlug("");
      setCreateSlugManual(false);
      setCreateVisibility("private");
      setShowCreateForm(false);
      setInfo(`Created page "${response.page.title}"`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const savePage = async (event: FormEvent) => {
    event.preventDefault();

    if (!selected) return;

    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await api.updatePage(selected.id, {
        title: nextTitle,
        description: description.trim() || undefined,
        visibility
      });

      setItems((previous) =>
        previous.map((item) => (item.id === selected.id ? response.page : item))
      );
      setInfo("Page updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deployPage = async () => {
    if (!selected) return;

    setDeploying(true);
    setError(null);
    setInfo(null);

    try {
      const response = await api.deployPage(selected.id);
      setItems((previous) =>
        previous.map((item) => (item.id === selected.id ? response.page : item))
      );
      const versionsResponse = await api.listPageVersions(selected.id);
      setVersions(versionsResponse.items);
      setInfo(`Deployed version ${response.page.version}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeploying(false);
    }
  };

  const forkPage = async () => {
    if (!selected) return;

    setForking(true);
    setError(null);
    setInfo(null);

    const forkSlug = `${selected.slug}-fork-${Date.now().toString().slice(-6)}`;

    try {
      const response = await api.forkPage(selected.id, forkSlug);
      setItems((previous) => [response.page, ...previous]);
      setSelectedId(response.page.id);
      setInfo(`Forked to "${response.page.title}"`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setForking(false);
    }
  };

  return (
    <section className="pages-layout" aria-label="pages-module">
      {(info || error) && (
        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          {info && <p className="info-banner">{info}</p>}
          {error && <p className="error-banner">{error}</p>}
        </div>
      )}

      <div className="pages-columns">
        {/* Left Column: Page List */}
        <div className="pages-sidebar">
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "Create Page"}
          </button>

          {showCreateForm && (
            <form className="pages-create-form" onSubmit={createPage}>
              <label>
                Title
                <input
                  value={createTitle}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCreateTitle(next);
                    if (!createSlugManual) {
                      setCreateSlug(normalizeSlug(next));
                    }
                  }}
                  placeholder="My Cool Page"
                  autoFocus
                />
              </label>

              <label>
                Slug
                <input
                  value={createSlug}
                  onChange={(event) => {
                    setCreateSlugManual(true);
                    setCreateSlug(normalizeSlug(event.target.value));
                  }}
                  placeholder="my-cool-page"
                />
                {createSlug && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                    /{currentUser.username}/{createSlug}
                  </span>
                )}
              </label>

              <label>
                Visibility
                <select
                  value={createVisibility}
                  onChange={(event) => setCreateVisibility(event.target.value as Page["visibility"])}
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </button>
            </form>
          )}

          {loading ? (
            <div className="page-list" aria-label="loading-skeleton">
              {[1, 2, 3].map((n) => (
                <div key={n} className="page-card-skeleton">
                  <div className="skeleton" style={{ height: 18, width: "70%" }} />
                  <div className="skeleton" style={{ height: 14, width: "50%", marginTop: 6 }} />
                  <div style={{ display: "flex", gap: "var(--space-1)", marginTop: 6 }}>
                    <div className="skeleton" style={{ height: 20, width: 32 }} />
                    <div className="skeleton" style={{ height: 20, width: 52 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="pages-empty-state">
              <p>No pages yet</p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                Create your first page to get started.
              </p>
            </div>
          ) : (
            <ul className="page-list" aria-label="page-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === selectedId ? "page-row active" : "page-row"}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <strong className="page-card-title">{item.title}</strong>
                    <span className="page-card-slug">
                      /{currentUser.username}/{item.slug}
                    </span>
                    <div className="pill-row">
                      <span className="pill page-version-pill">v{item.version}</span>
                      <span className={`pill page-visibility-pill ${item.visibility}`}>
                        {item.visibility}
                      </span>
                    </div>
                    {item.deploy_url && (
                      <span
                        className="page-card-deploy-url"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.deploy_url!, "_blank", "noopener");
                        }}
                      >
                        {item.deploy_url}
                      </span>
                    )}
                    <span className="page-card-date">{toIsoLocal(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Column: Page Detail */}
        <aside className="pages-detail-panel" aria-label="page-detail-panel">
          {selected ? (
            <form className="pages-detail-form" onSubmit={savePage}>
              <div className="pages-detail-header">
                <label>
                  Title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe this page..."
                />
              </label>

              <label>
                Visibility
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as Page["visibility"])}
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pages-detail-meta">
                <div className="pages-meta-row">
                  <span className="pages-meta-label">Slug</span>
                  <span className="pages-meta-value">/{currentUser.username}/{selected.slug}</span>
                </div>

                <div className="pages-meta-row">
                  <span className="pages-meta-label">Deploy URL</span>
                  {selected.deploy_url ? (
                    <a
                      href={selected.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pages-meta-value"
                      style={{ color: "var(--color-accent-primary)" }}
                    >
                      {selected.deploy_url}
                    </a>
                  ) : (
                    <span className="pages-meta-value" style={{ color: "var(--color-text-tertiary)" }}>
                      Not deployed yet
                    </span>
                  )}
                </div>

                <div className="pages-meta-row">
                  <span className="pages-meta-label">Version</span>
                  <span className="pill page-version-pill">v{selected.version}</span>
                </div>

                <div className="pages-meta-row">
                  <span className="pages-meta-label">Created</span>
                  <span className="pages-meta-value">{toIsoLocal(selected.created_at)}</span>
                </div>
              </div>

              <div className="inline-buttons">
                {isDirty && (
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                )}
                <button type="button" onClick={() => void deployPage()} disabled={deploying}>
                  {deploying ? "Deploying..." : "Deploy"}
                </button>
                <button type="button" onClick={() => void forkPage()} disabled={forking}>
                  {forking ? "Forking..." : "Fork"}
                </button>
              </div>

              {/* Version History */}
              {versions.length > 0 && (
                <div className="pages-versions-section">
                  <h4>Version History</h4>
                  <ul className="version-list">
                    {versions.map((version) => (
                      <li key={version.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <span className="pill page-version-pill">v{version.version}</span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                            {toIsoLocal(version.created_at)}
                          </span>
                        </div>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                          {version.r2_path}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          ) : (
            <div className="pages-empty-detail">
              <p style={{ color: "var(--color-text-tertiary)" }}>
                {items.length === 0
                  ? "Create a page to get started."
                  : "Select a page to view details."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export function PagesPlaceholder() {
  return <section aria-label="pages-placeholder">Pages module placeholder</section>;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed";
}
