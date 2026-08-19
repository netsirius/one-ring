import React, { useState, useEffect } from "react";
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
  X,
  Check,
} from "lucide-react";
import { api } from "../services/api";
import { TYPE_CONFIG } from "./VaultView";

export default function ProjectMatrixView({
  projects = [],
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
  const [isLinkVaultModalOpen, setIsLinkVaultModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [matrixViewMode, setMatrixViewMode] = useState("grid"); // "grid" | "table"

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

  const filteredItems = allVaultItems.filter((item) => {
    if (filterType !== "all" && item.extension_type !== filterType) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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
      console.error("Failed to select folder:", err);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newPathInput.trim()) return;
    const pathToAdd = newPathInput.trim();
    onAddProject(pathToAdd);
    setSelectedProjectPath(pathToAdd);
    setNewPathInput("");
    setIsAdding(false);
  };

  const activeProjectLinksCount = currentProject
    ? (currentProject.items || currentProject.skills || []).filter(
        (s) => s.status === "linked" || s.status === "unmanaged_copy"
      ).length
    : 0;

  // Batch toggle all visible extensions in this project
  const handleBatchToggleProject = async (enable) => {
    if (!currentProject) return;
    for (const item of filteredItems) {
      onToggleProjectItem(
        currentProject.path,
        item.extension_type,
        item.id,
        "agents",
        enable
      );
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
          marginBottom: "16px",
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-card)",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: "280px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-pill)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderGit2 size={18} color="var(--text-primary)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="section-eyebrow">ACTIVE WORKSPACE</div>
            {projects.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <select
                  value={currentProject?.path || ""}
                  onChange={(e) => setSelectedProjectPath(e.target.value)}
                  style={{
                    background: "var(--bg-app)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-pill)",
                    padding: "4px 12px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    outline: "none",
                    cursor: "pointer",
                    maxWidth: "280px",
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.name} ({p.path.split("/").slice(-2).join("/")})
                    </option>
                  ))}
                </select>

                <button
                  className="btn-secondary"
                  style={{ padding: "3px 10px", fontSize: "0.72rem" }}
                  onClick={() => onOpenFinder(currentProject.path)}
                  title="Open project in Finder"
                >
                  <FolderOpen size={11} />
                  <span>Finder</span>
                </button>

                <button
                  className="btn-icon"
                  style={{ width: "28px", height: "28px", color: "var(--color-broken)" }}
                  onClick={() => onRemoveProject(currentProject.path)}
                  title="Unregister workspace from One Ring"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                No workspaces registered yet
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Right: Stats, Link from Vault & Add Workspace buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {currentProject && (
            <div
              className="tag-badge"
              style={{
                borderColor: activeProjectLinksCount > 0 ? "var(--color-linked-border)" : "var(--border-pill)",
                color: activeProjectLinksCount > 0 ? "var(--color-linked)" : "var(--text-muted)",
                background: activeProjectLinksCount > 0 ? "var(--color-linked-bg)" : "transparent",
                padding: "4px 12px",
                fontSize: "0.74rem",
              }}
            >
              <span>{activeProjectLinksCount} Active in .agents/</span>
            </div>
          )}

          {currentProject && allVaultItems.length > 0 && (
            <button
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
              onClick={() => setIsLinkVaultModalOpen(true)}
              title="Quickly choose extensions from Vault to link into this project"
            >
              <FolderPlus size={13} />
              <span>Link from Vault</span>
            </button>
          )}

          <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={13} />
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
            padding: "16px 20px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-active)",
            marginBottom: "16px",
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
            style={{ flex: 1, minWidth: "260px" }}
            autoFocus
            required
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBrowseFolder}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            title="Choose folder with native Finder picker"
          >
            <FolderOpen size={13} />
            <span>Browse...</span>
          </button>
          <button type="submit" className="btn-primary">
            Register Workspace
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsAdding(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Quick Link from Vault Modal */}
      {isLinkVaultModalOpen && currentProject && (
        <div className="modal-backdrop" onClick={() => setIsLinkVaultModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Link Vault Skills & Extensions</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Select extensions from your Vault to activate in <strong>{currentProject.name}</strong> (<code>.agents/</code>)
                </p>
              </div>
              <button
                className="btn-icon"
                onClick={() => setIsLinkVaultModalOpen(false)}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ maxHeight: "380px", overflowY: "auto", padding: "16px 20px" }}>
              {allVaultItems.map((item) => {
                const projectItemStatus = (
                  currentProject.items || currentProject.skills || []
                ).find(
                  (s) =>
                    (s.item_id === item.id || s.id === item.id) &&
                    (s.extension_type === item.extension_type || !s.extension_type)
                );
                const isLinked = projectItemStatus?.status === "linked";
                const isUnmanaged = projectItemStatus?.status === "unmanaged_copy";
                const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;

                return (
                  <div
                    key={`modal_${item.extension_type}_${item.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--bg-app)",
                      borderRadius: "6px",
                      border: isLinked
                        ? "1px solid var(--color-linked-border)"
                        : "1px solid var(--border-subtle)",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
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
                          {typeConfig.label}
                        </span>
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          {item.name}
                        </strong>
                      </div>
                      <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.description || "No description."}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {isLinked ? (
                        <button
                          className="tag-badge"
                          style={{
                            background: "var(--color-linked-bg)",
                            color: "var(--color-linked)",
                            borderColor: "var(--color-linked-border)",
                            padding: "4px 10px",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            onToggleProjectItem(
                              currentProject.path,
                              item.extension_type,
                              item.id,
                              "agents",
                              false
                            )
                          }
                          title="Click to unlink from project"
                        >
                          <Check size={11} style={{ marginRight: "4px" }} />
                          <span>LINKED</span>
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          style={{ padding: "4px 12px", fontSize: "0.72rem" }}
                          onClick={() =>
                            onToggleProjectItem(
                              currentProject.path,
                              item.extension_type,
                              item.id,
                              "agents",
                              true
                            )
                          }
                        >
                          <Plus size={11} />
                          <span>Link to Project</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="tag-badge"
                  style={{ cursor: "pointer", padding: "4px 10px" }}
                  onClick={() => handleBatchToggleProject(true)}
                >
                  LINK ALL
                </button>
                <button
                  className="tag-badge"
                  style={{ cursor: "pointer", padding: "4px 10px" }}
                  onClick={() => handleBatchToggleProject(false)}
                >
                  UNLINK ALL
                </button>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setIsLinkVaultModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Category Chips + View Switcher + Batch Toggles */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Category Filter Chips */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
          {categories.map((cat) => {
            const count =
              cat === "all"
                ? allVaultItems.length
                : allVaultItems.filter((i) => i.extension_type === cat).length;
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
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                }}
                onClick={() => setFilterType(cat)}
              >
                <span>{cat.toUpperCase()}</span>
                <strong style={{ marginLeft: "4px", fontFamily: "var(--font-mono)" }}>
                  {count}
                </strong>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Batch Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {currentProject && filteredItems.length > 0 && (
            <>
              <button
                className="tag-badge"
                style={{ cursor: "pointer", padding: "3px 8px", fontSize: "0.7rem" }}
                onClick={() => handleBatchToggleProject(true)}
                title="Enable all visible extensions in this project"
              >
                ENABLE ALL
              </button>
              <button
                className="tag-badge"
                style={{ cursor: "pointer", padding: "3px 8px", fontSize: "0.7rem" }}
                onClick={() => handleBatchToggleProject(false)}
                title="Disable all visible extensions in this project"
              >
                DISABLE ALL
              </button>
            </>
          )}

          {/* Grid vs Table View Mode */}
          <div className="view-mode-switch" style={{ marginLeft: "4px" }}>
            <button
              className={`view-mode-btn ${matrixViewMode === "grid" ? "active" : ""}`}
              onClick={() => setMatrixViewMode("grid")}
              title="Grid View (Spacious Cards)"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              className={`view-mode-btn ${matrixViewMode === "table" ? "active" : ""}`}
              onClick={() => setMatrixViewMode("table")}
              title="Table View (Dense List)"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Project Matrix Content */}
      {!currentProject ? (
        <div className="empty-state">
          <FolderGit2 size={44} color="var(--text-muted)" />
          <h3 style={{ marginTop: "14px", marginBottom: "6px", fontWeight: 500, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            No Workspace Registered
          </h3>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 16px" }}>
            Register your project workspace folder to enable localized AI skills, plugins, and instructions inside its <code>.agents/</code> directory.
          </p>
          <button className="btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={13} />
            <span>Add Workspace Folder</span>
          </button>
        </div>
      ) : allVaultItems.length === 0 ? (
        <div className="empty-state">
          <Layers size={44} color="var(--text-muted)" />
          <h3 style={{ marginTop: "14px", marginBottom: "6px", fontWeight: 500, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            Vault is Empty
          </h3>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
            You haven't added any skills, plugins, or rules to your central Vault yet. Add extensions in the <strong>Vault Library</strong> tab first to link them to this project.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <Search size={40} color="var(--text-muted)" />
          <h3 style={{ marginTop: "14px", marginBottom: "6px", fontWeight: 500, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            No Matching Extensions
          </h3>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
            No extensions match the selected category or search filter.
          </p>
        </div>
      ) : matrixViewMode === "grid" ? (
        /* Spacious Grid Layout */
        <div className="vault-grid">
          {filteredItems.map((item) => {
            const projectItemStatus = (
              currentProject.items || currentProject.skills || []
            ).find(
              (s) =>
                (s.item_id === item.id || s.id === item.id) &&
                (s.extension_type === item.extension_type || !s.extension_type)
            );
            const status = projectItemStatus?.status || "unlinked";
            const isLinked = status === "linked";
            const isUnmanaged = status === "unmanaged_copy";
            const isActive = isLinked || isUnmanaged;
            const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
            const TypeIcon = typeConfig.icon || Layers;

            return (
              <div
                key={`${item.extension_type}_${item.id}`}
                className="vault-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isLinked
                    ? "var(--color-linked-border)"
                    : isUnmanaged
                    ? "var(--color-unmanaged-border)"
                    : "var(--border-card)",
                }}
              >
                <div>
                  {/* Top card bar: Type badge + Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      className="tag-badge"
                      style={{
                        background: typeConfig.bg,
                        color: typeConfig.color,
                        borderColor: typeConfig.border,
                        fontWeight: 500,
                        fontSize: "0.64rem",
                        textTransform: "uppercase",
                      }}
                    >
                      <TypeIcon size={9} />
                      <span>{typeConfig.label}</span>
                    </span>

                    {/* Right side controls: Remove button + Switch */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Direct Remove/Unlink button from project */}
                      {isActive && onRemoveProjectItem && (
                        <button
                          className="btn-icon"
                          style={{
                            width: "26px",
                            height: "26px",
                            color: "var(--color-broken)",
                            borderColor: "var(--border-subtle)",
                          }}
                          onClick={() =>
                            onRemoveProjectItem(
                              currentProject.path,
                              item.extension_type,
                              item.id
                            )
                          }
                          title="Remove / Unlink from project (.agents/)"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: isLinked
                            ? "var(--color-linked)"
                            : isUnmanaged
                            ? "var(--color-unmanaged)"
                            : "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 500,
                        }}
                      >
                        {isLinked ? "ACTIVE" : isUnmanaged ? "UNMANAGED" : "OFF"}
                      </span>

                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={(e) =>
                            onToggleProjectItem(
                              currentProject.path,
                              item.extension_type,
                              item.id,
                              "agents",
                              e.target.checked
                            )
                          }
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.02em",
                      marginBottom: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => onInspectItem(item)}
                  >
                    <span>{item.name}</span>
                    <ArrowUpRight size={12} color="var(--text-muted)" />
                  </h4>

                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      lineHeight: "1.45",
                      marginBottom: "12px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.description || "No description provided."}
                  </p>
                </div>

                {/* Card Footer: Target Subdirectory Path */}
                <div
                  style={{
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.72rem",
                    color: isLinked
                      ? "var(--color-linked)"
                      : isUnmanaged
                      ? "var(--color-unmanaged)"
                      : "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>
                    {isLinked
                      ? `● .agents/${item.extension_type}s/${item.id}`
                      : isUnmanaged
                      ? `▲ Unmanaged folder in .agents/`
                      : `○ Inactive in project`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Dense Table Layout */
        <div className="vault-table-container">
          <table className="vault-table">
            <thead>
              <tr>
                <th style={{ padding: "10px 18px", width: "240px" }}>Extension</th>
                <th style={{ padding: "10px 14px", width: "110px" }}>Type</th>
                <th style={{ padding: "10px 18px" }}>Description</th>
                <th style={{ padding: "10px 18px", width: "220px" }}>Workspace Path</th>
                <th style={{ padding: "10px 18px", textAlign: "right", width: "160px" }}>
                  Active in Project
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const projectItemStatus = (
                  currentProject.items || currentProject.skills || []
                ).find(
                  (s) =>
                    (s.item_id === item.id || s.id === item.id) &&
                    (s.extension_type === item.extension_type || !s.extension_type)
                );
                const status = projectItemStatus?.status || "unlinked";
                const isLinked = status === "linked";
                const isUnmanaged = status === "unmanaged_copy";
                const isActive = isLinked || isUnmanaged;
                const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
                const TypeIcon = typeConfig.icon || Layers;

                return (
                  <tr key={`${item.extension_type}_${item.id}`}>
                    <td style={{ padding: "12px 18px", fontWeight: 500 }}>
                      <div
                        style={{
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onClick={() => onInspectItem(item)}
                      >
                        <span>{item.name}</span>
                        <ArrowUpRight size={11} color="var(--text-muted)" />
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontWeight: 500,
                          fontSize: "0.64rem",
                          textTransform: "uppercase",
                        }}
                      >
                        <TypeIcon size={9} />
                        <span>{typeConfig.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {item.description || "—"}
                    </td>
                    <td style={{ padding: "12px 18px", fontSize: "0.74rem", color: isLinked ? "var(--color-linked)" : isUnmanaged ? "var(--color-unmanaged)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {isLinked
                        ? `.agents/${item.extension_type}s/${item.id}`
                        : isUnmanaged
                        ? `Unmanaged in .agents/`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 18px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                        {isActive && onRemoveProjectItem && (
                          <button
                            className="btn-icon"
                            style={{
                              width: "26px",
                              height: "26px",
                              color: "var(--color-broken)",
                              borderColor: "var(--border-subtle)",
                            }}
                            onClick={() =>
                              onRemoveProjectItem(
                                currentProject.path,
                                item.extension_type,
                                item.id
                              )
                            }
                            title="Remove / Unlink from project (.agents/)"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={(e) =>
                              onToggleProjectItem(
                                currentProject.path,
                                item.extension_type,
                                item.id,
                                "agents",
                                e.target.checked
                              )
                            }
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
