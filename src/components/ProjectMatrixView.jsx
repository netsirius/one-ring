import React, { useState, useEffect, useMemo } from "react";
import {
  FolderGit2,
  Plus,
  Trash2,
  ArrowUpRight,
  FolderPlus,
  FolderOpen,
  LayoutGrid,
  List,
  Layers,
  Search,
  Check,
  Zap,
  Info,
  ShieldAlert,
} from "lucide-react";
import { api } from "../services/api";
import { TYPE_CONFIG } from "./VaultView";

const CANONICAL_TARGETS = [
  {
    id: "claude",
    name: "Claude Code",
    folder: ".claude",
    icon: "🏛",
    description: "Anthropic Claude Code CLI & Desktop (.claude/)",
  },
  {
    id: "agents",
    name: "Antigravity / Universal",
    folder: ".agents",
    icon: "⚡",
    description: "Google Antigravity & Universal Agents Standard (.agents/)",
  },
  {
    id: "cursor",
    name: "Cursor AI",
    folder: ".cursor",
    icon: "🎯",
    description: "Cursor AI rules and custom prompts (.cursor/)",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    folder: ".codex",
    icon: "🤖",
    description: "OpenAI Codex skills and workflows (.codex/)",
  },
];

export default function ProjectMatrixView({
  projects = [],
  targets = [],
  items = [],
  vaultItems = [],
  onAddProject,
  onRemoveProject,
  onToggleProjectItem,
  onRemoveProjectItem,
  onOpenFinder,
  onInspectItem,
  searchQuery = "",
  setSearchQuery,
  onShowToast,
}) {
  const allVaultItems = items.length > 0 ? items : vaultItems;

  const [selectedProjectPath, setSelectedProjectPath] = useState(
    projects[0]?.path || ""
  );
  const [newPathInput, setNewPathInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [scope, setScope] = useState("all"); // "all" | "active"
  const [filterType, setFilterType] = useState("all");
  // Default to dense Table/Matrix view for maximum efficiency and minimum scrolling
  const [matrixViewMode, setMatrixViewMode] = useState("table"); // "table" | "grid"
  const [isSyncing, setIsSyncing] = useState(false);

  // Keep selected project path in sync when projects change
  useEffect(() => {
    if (projects.length > 0) {
      if (!projects.some((p) => p.path === selectedProjectPath)) {
        setSelectedProjectPath(projects[0].path);
      }
    } else {
      setSelectedProjectPath("");
    }
  }, [projects, selectedProjectPath]);

  const currentProject =
    projects.find((p) => p.path === selectedProjectPath) || projects[0];

  const categories = ["all", "skill", "plugin", "agent", "command", "rule"];

  // Helper to check target status for a specific item in the project
  const getItemTargetStatus = (item, targetId) => {
    if (!currentProject) return { status: "unlinked", isLinked: false, isUnmanaged: false, isActive: false };
    const projectItems = currentProject.items || currentProject.skills || [];
    const found = projectItems.find(
      (s) =>
        (s.item_id === item.id || s.id === item.id) &&
        (s.extension_type === item.extension_type || !s.extension_type) &&
        (s.target_agent === targetId ||
          (!s.target_agent && (targetId === "agents" || targetId === "gemini")))
    );
    const status = found?.status || "unlinked";
    const isLinked = status === "linked";
    const isUnmanaged = status === "unmanaged_copy";
    return {
      status,
      isLinked,
      isUnmanaged,
      isActive: isLinked || isUnmanaged,
      path: found?.path,
    };
  };

  // Helper to check if item is active for ANY agent target in the project
  const isItemActiveInProject = (item) => {
    return CANONICAL_TARGETS.some((t) => getItemTargetStatus(item, t.id).isActive);
  };

  // Active links count per agent target in the active workspace
  const targetCounts = useMemo(() => {
    const counts = {};
    for (const t of CANONICAL_TARGETS) {
      counts[t.id] = allVaultItems.filter((i) => getItemTargetStatus(i, t.id).isActive).length;
    }
    return counts;
  }, [currentProject, allVaultItems]);

  const totalActiveItemsCount = useMemo(() => {
    return allVaultItems.filter((i) => isItemActiveInProject(i)).length;
  }, [currentProject, allVaultItems]);

  // Filtered items based on scope, type, and search query
  const filteredItems = allVaultItems.filter((item) => {
    const isActive = isItemActiveInProject(item);
    if (scope === "active" && !isActive) return false;
    if (filterType !== "all" && item.extension_type !== filterType) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.extension_type || "").toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchType || matchTags;
    }

    return true;
  });

  const handleBrowseFolder = async () => {
    try {
      const selected = await api.selectFolderDialog();
      if (selected) {
        setNewPathInput(selected);
      }
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newPathInput.trim()) return;
    try {
      await onAddProject(newPathInput.trim());
      setSelectedProjectPath(newPathInput.trim());
      setNewPathInput("");
      setIsAdding(false);
      if (onShowToast) onShowToast("Workspace registered successfully");
    } catch (err) {
      alert("Failed to add workspace: " + err);
    }
  };

  // 1-Click Fast Sync Entire Project to a specific Agent Harness
  const handleSyncToTarget = async (targetId, targetName) => {
    if (!currentProject) return;
    setIsSyncing(true);
    try {
      await api.syncProjectToTarget(currentProject.path, targetId, true);
      if (onShowToast) onShowToast(`Synchronized all vault extensions to ${targetName}`);
      window.location.reload ? window.location.reload() : null;
    } catch (err) {
      console.error("Sync failed:", err);
      if (onShowToast) onShowToast(`Sync error: ${err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div>
      {/* Workspace Selector & Top Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
          flexWrap: "wrap",
          background: "var(--bg-app)",
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-pill)",
        }}
      >
        {/* Workspace Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          <FolderGit2 size={16} color="var(--text-primary)" />
          <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            ACTIVE WORKSPACE:
          </span>

          {projects.length > 0 ? (
            <select
              className="form-input"
              style={{
                height: "30px",
                fontSize: "0.8rem",
                padding: "2px 8px",
                minWidth: "220px",
                maxWidth: "340px",
              }}
              value={selectedProjectPath}
              onChange={(e) => setSelectedProjectPath(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.name} ({p.path.split("/").slice(-2).join("/")})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              No workspace registered
            </span>
          )}

          {currentProject && (
            <>
              <button
                className="btn-secondary"
                style={{ height: "28px", padding: "0 8px", fontSize: "0.72rem" }}
                onClick={() => onOpenFinder(currentProject.path)}
                title="Reveal project root in macOS Finder"
              >
                <FolderOpen size={12} />
                <span>Finder</span>
              </button>

              <button
                className="btn-icon"
                style={{ height: "28px", width: "28px" }}
                onClick={() => {
                  if (confirm(`Unregister workspace "${currentProject.name}" from One Ring?`)) {
                    onRemoveProject(currentProject.path);
                  }
                }}
                title="Unregister workspace"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>

        {/* Workspace Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className="btn-primary"
            style={{ height: "28px", fontSize: "0.74rem", padding: "0 12px" }}
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus size={12} />
            <span>Add Workspace</span>
          </button>
        </div>
      </div>

      {/* Add Workspace inline form */}
      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          style={{
            background: "var(--bg-card)",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-active)",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="~/projects/my-app or /path/to/workspace"
            value={newPathInput}
            onChange={(e) => setNewPathInput(e.target.value)}
            style={{ flex: 1, minWidth: "240px", height: "30px", fontSize: "0.8rem" }}
            autoFocus
            required
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBrowseFolder}
            style={{ height: "30px", fontSize: "0.75rem" }}
            title="Choose folder with native Finder picker"
          >
            <FolderOpen size={12} />
            <span>Browse...</span>
          </button>
          <button type="submit" className="btn-primary" style={{ height: "30px", fontSize: "0.75rem" }}>
            Register Workspace
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ height: "30px", fontSize: "0.75rem" }}
            onClick={() => setIsAdding(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {/* COMPACT AGENT HARNESS CONTROL & FAST SYNC BAR */}
      {currentProject && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                letterSpacing: "1.2px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginRight: "4px",
              }}
            >
              WORKSPACE AGENT HARNESSES:
            </span>

            {CANONICAL_TARGETS.map((target) => {
              const count = targetCounts[target.id] || 0;
              return (
                <div
                  key={target.id}
                  style={{
                    background: "var(--bg-app)",
                    border: `1px solid ${count > 0 ? "var(--color-linked-border)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-pill)",
                    padding: "2px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "0.7rem",
                  }}
                  title={target.description}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: count > 0 ? "var(--color-linked)" : "var(--text-muted)",
                    }}
                  />
                  <strong style={{ color: count > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {target.name.split(" ")[0]}
                  </strong>
                  <code style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>{target.folder}/</code>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: count > 0 ? "var(--color-linked)" : "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>

          {/* 1-Click Fast Sync / Migration Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Fast Sync:</span>
            <button
              type="button"
              className="tag-badge"
              style={{
                cursor: "pointer",
                padding: "3px 8px",
                fontSize: "0.68rem",
                background: "var(--bg-app)",
                borderColor: "var(--border-pill)",
              }}
              disabled={isSyncing}
              onClick={() => handleSyncToTarget("claude", "Claude Code (.claude/)")}
              title="Symlink all vault skills and rules into .claude/ for Claude Code"
            >
              <Zap size={11} color="var(--color-linked)" />
              <span>Apply to Claude (.claude/)</span>
            </button>

            <button
              type="button"
              className="tag-badge"
              style={{
                cursor: "pointer",
                padding: "3px 8px",
                fontSize: "0.68rem",
                background: "var(--bg-app)",
                borderColor: "var(--border-pill)",
              }}
              disabled={isSyncing}
              onClick={() => handleSyncToTarget("agents", "Antigravity (.agents/)")}
              title="Symlink all vault skills and rules into .agents/ for Antigravity & Gemini"
            >
              <Zap size={11} color="var(--color-linked)" />
              <span>Apply to Antigravity (.agents/)</span>
            </button>
          </div>
        </div>
      )}

      {/* Scope Filter, Category Filter, and View Mode Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Scope Switcher */}
          <div className="segmented-control">
            <button
              className={`segmented-item ${scope === "all" ? "active" : ""}`}
              onClick={() => setScope("all")}
            >
              All Vault ({allVaultItems.length})
            </button>
            <button
              className={`segmented-item ${scope === "active" ? "active" : ""}`}
              onClick={() => setScope("active")}
            >
              Active in Workspace ({totalActiveItemsCount})
            </button>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
            {categories.map((cat) => {
              const count =
                cat === "all"
                  ? (scope === "active" ? totalActiveItemsCount : allVaultItems.length)
                  : allVaultItems.filter((i) => i.extension_type === cat && (scope === "all" || isItemActiveInProject(i))).length;
              const isActive = filterType === cat;

              return (
                <button
                  key={cat}
                  className={`tag-badge ${isActive ? "active" : ""}`}
                  style={{
                    background: isActive ? "var(--bg-badge)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    borderColor: isActive ? "var(--text-primary)" : "var(--border-pill)",
                    cursor: "pointer",
                    padding: "2px 8px",
                    fontSize: "0.7rem",
                  }}
                  onClick={() => setFilterType(cat)}
                >
                  <span>{cat.toUpperCase()}</span>
                  <strong style={{ marginLeft: "3px", fontFamily: "var(--font-mono)" }}>
                    {count}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Switcher: Dense Matrix Table vs Bento Cards */}
        <div className="view-mode-switch">
          <button
            className={`view-mode-btn ${matrixViewMode === "table" ? "active" : ""}`}
            onClick={() => setMatrixViewMode("table")}
            title="Dense Matrix Table (High-speed switchboard, zero scroll)"
          >
            <List size={13} />
            <span style={{ fontSize: "0.7rem", marginLeft: "4px" }}>Dense Matrix</span>
          </button>
          <button
            className={`view-mode-btn ${matrixViewMode === "grid" ? "active" : ""}`}
            onClick={() => setMatrixViewMode("grid")}
            title="Compact Cards View"
          >
            <LayoutGrid size={13} />
            <span style={{ fontSize: "0.7rem", marginLeft: "4px" }}>Cards</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Content */}
      {!currentProject ? (
        <div className="empty-state">
          <FolderGit2 size={40} color="var(--text-muted)" />
          <h3 style={{ marginTop: "12px", marginBottom: "4px", fontWeight: 500, fontSize: "0.95rem" }}>
            No Workspace Registered
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 14px" }}>
            Register your workspace folder to link extensions across Claude Code, Antigravity, Cursor, and Codex.
          </p>
          <button className="btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={12} />
            <span>Add Workspace Folder</span>
          </button>
        </div>
      ) : allVaultItems.length === 0 ? (
        <div className="empty-state">
          <Layers size={40} color="var(--text-muted)" />
          <h3 style={{ marginTop: "12px", marginBottom: "4px", fontWeight: 500, fontSize: "0.95rem" }}>
            Vault is Empty
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
            Add extensions in the <strong>Browse Marketplaces</strong> or <strong>Vault Library</strong> tabs first.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <Search size={36} color="var(--text-muted)" />
          <h3 style={{ marginTop: "12px", marginBottom: "4px", fontWeight: 500, fontSize: "0.95rem" }}>
            No Matching Extensions
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            No extensions match the selected filter in this workspace.
          </p>
        </div>
      ) : matrixViewMode === "table" ? (
        /* ULTRA-DENSE MATRIX TABLE VIEW (HIGHEST SPEED & ZERO SCROLL FATIGUE) */
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-sm)",
            overflowX: "auto",
          }}
        >
          <table className="vault-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.68rem", width: "38%" }}>
                  EXTENSION / PATH
                </th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "0.68rem", width: "12%" }}>
                  TYPE
                </th>
                {CANONICAL_TARGETS.map((target) => (
                  <th
                    key={target.id}
                    style={{
                      textAlign: "center",
                      padding: "8px 6px",
                      fontSize: "0.68rem",
                      width: "12%",
                    }}
                  >
                    <span>{target.icon} {target.name.split(" ")[0].toUpperCase()}</span>
                  </th>
                ))}
                <th style={{ textAlign: "center", padding: "8px 8px", fontSize: "0.68rem", width: "6%" }}>
                  DOC
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
                const TypeIcon = typeConfig.icon || Layers;
                const isActiveAnywhere = isItemActiveInProject(item);

                // Find active paths for quick tooltip/badge
                const activePathList = CANONICAL_TARGETS
                  .map((t) => {
                    const s = getItemTargetStatus(item, t.id);
                    return s.isActive ? `${t.folder}/${item.extension_type}s/${item.id}` : null;
                  })
                  .filter(Boolean);

                return (
                  <tr
                    key={`${item.extension_type}_${item.id}`}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isActiveAnywhere ? "var(--bg-card)" : "transparent",
                    }}
                  >
                    {/* Extension Name & Active Paths */}
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: isActiveAnywhere ? "var(--color-linked)" : "var(--border-subtle)",
                            flexShrink: 0,
                          }}
                        />
                        <strong
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => onInspectItem(item)}
                          title="Click to view raw source & documentation"
                        >
                          {item.name}
                        </strong>

                        {activePathList.length > 0 && (
                          <span
                            style={{
                              fontSize: "0.64rem",
                              fontFamily: "var(--font-mono)",
                              color: "var(--color-linked)",
                              background: "var(--color-linked-bg)",
                              border: "1px solid var(--color-linked-border)",
                              borderRadius: "4px",
                              padding: "1px 5px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "220px",
                            }}
                          >
                            {activePathList[0]}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontSize: "0.6rem",
                          padding: "1px 6px",
                        }}
                      >
                        <TypeIcon size={9} />
                        <span>{typeConfig.label.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Target Agent Switches */}
                    {CANONICAL_TARGETS.map((target) => {
                      const { isLinked, isUnmanaged } = getItemTargetStatus(item, target.id);
                      return (
                        <td key={target.id} style={{ textAlign: "center", padding: "6px" }}>
                          <button
                            type="button"
                            className="tag-badge"
                            style={{
                              cursor: "pointer",
                              padding: "3px 8px",
                              fontSize: "0.66rem",
                              width: "72px",
                              justifyContent: "center",
                              background: isLinked
                                ? "var(--color-linked-bg)"
                                : isUnmanaged
                                ? "var(--color-unmanaged-bg)"
                                : "transparent",
                              borderColor: isLinked
                                ? "var(--color-linked-border)"
                                : isUnmanaged
                                ? "var(--color-unmanaged-border)"
                                : "var(--border-subtle)",
                              color: isLinked
                                ? "var(--color-linked)"
                                : isUnmanaged
                                ? "var(--color-unmanaged)"
                                : "var(--text-muted)",
                            }}
                            onClick={() =>
                              onToggleProjectItem(
                                currentProject.path,
                                item.extension_type,
                                item.id,
                                target.id,
                                !isLinked
                              )
                            }
                            title={`Toggle ${item.name} for ${target.name} (${target.folder}/)`}
                          >
                            <span style={{ fontWeight: isLinked ? 600 : 400 }}>
                              {isLinked ? "ON" : isUnmanaged ? "UNM" : "OFF"}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    {/* Doc Button */}
                    <td style={{ textAlign: "center", padding: "6px" }}>
                      <button
                        className="btn-icon"
                        style={{ width: "24px", height: "24px", padding: 0 }}
                        onClick={() => onInspectItem(item)}
                        title="View Documentation & Files"
                      >
                        <Info size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* COMPACT BENTO CARDS VIEW */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "10px",
          }}
        >
          {filteredItems.map((item) => {
            const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
            const TypeIcon = typeConfig.icon || Layers;
            const isActiveAnywhere = isItemActiveInProject(item);

            return (
              <div
                key={`${item.extension_type}_${item.id}`}
                className="vault-card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isActiveAnywhere ? "var(--border-pill)" : "var(--border-card)",
                }}
              >
                <div>
                  {/* Top Bar: Type + Name + Doc Icon */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontSize: "0.6rem",
                          padding: "1px 5px",
                          flexShrink: 0,
                        }}
                      >
                        <TypeIcon size={9} />
                        <span>{typeConfig.label.toUpperCase()}</span>
                      </span>

                      <strong
                        style={{
                          fontSize: "0.86rem",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => onInspectItem(item)}
                      >
                        {item.name}
                      </strong>
                    </div>

                    <button
                      className="btn-icon"
                      style={{ width: "22px", height: "22px", flexShrink: 0 }}
                      onClick={() => onInspectItem(item)}
                      title="Inspect"
                    >
                      <ArrowUpRight size={11} />
                    </button>
                  </div>

                  {/* 1-Line Description */}
                  <p
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-secondary)",
                      lineHeight: "1.3",
                      marginBottom: "10px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.description || "No description provided."}
                  </p>
                </div>

                {/* Inline Horizontal Agent Switches */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "4px",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "8px",
                  }}
                >
                  {CANONICAL_TARGETS.map((target) => {
                    const { isLinked, isUnmanaged } = getItemTargetStatus(item, target.id);
                    return (
                      <button
                        key={target.id}
                        type="button"
                        className="tag-badge"
                        style={{
                          cursor: "pointer",
                          padding: "3px 6px",
                          fontSize: "0.64rem",
                          flex: 1,
                          justifyContent: "center",
                          background: isLinked
                            ? "var(--color-linked-bg)"
                            : isUnmanaged
                            ? "var(--color-unmanaged-bg)"
                            : "var(--bg-app)",
                          borderColor: isLinked
                            ? "var(--color-linked-border)"
                            : isUnmanaged
                            ? "var(--color-unmanaged-border)"
                            : "var(--border-subtle)",
                          color: isLinked
                            ? "var(--color-linked)"
                            : isUnmanaged
                            ? "var(--color-unmanaged)"
                            : "var(--text-muted)",
                        }}
                        onClick={() =>
                          onToggleProjectItem(
                            currentProject.path,
                            item.extension_type,
                            item.id,
                            target.id,
                            !isLinked
                          )
                        }
                        title={`${target.name} (${target.folder}/)`}
                      >
                        <span>{target.name.split(" ")[0]}</span>
                        <strong style={{ marginLeft: "3px", fontFamily: "var(--font-mono)" }}>
                          {isLinked ? "ON" : "OFF"}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
