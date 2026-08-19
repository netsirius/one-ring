import React, { useState } from "react";
import { Sliders, ArrowUpRight, FolderDown, Plus, Sparkles, Layers } from "lucide-react";
import { TYPE_CONFIG } from "./VaultView";

export default function GlobalSwitchboard({
  items = [],
  targets = [],
  onToggleGlobal,
  onAdoptUnmanaged,
  onAdoptAll,
  onInspectItem,
  onOpenAddModal,
  searchQuery = "",
  setSearchQuery,
  onShowToast,
}) {
  const [filterType, setFilterType] = useState("all");
  const installedTargets = targets.filter((t) => t.is_installed);

  const categories = ["all", "skill", "plugin", "agent", "command", "rule"];

  const filteredItems = items.filter((item) => {
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

  // Batch toggle all items for a given agent
  const handleBatchToggleAgent = async (targetId, enable) => {
    for (const item of filteredItems) {
      const isCompatible = (item.supported_agents || []).includes(targetId);
      if (isCompatible) {
        onToggleGlobal(item.id, item.extension_type, targetId, enable);
      }
    }
    if (onShowToast) {
      onShowToast(`${enable ? "Enabled" : "Disabled"} all extensions for ${targetId}`);
    }
  };

  return (
    <div>
      {/* Intro info & Batch Actions Bar */}
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
        <div>
          <div className="section-eyebrow">GLOBAL ORCHESTRATION</div>
          <h3 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Agent Compatibility Switchboard
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Toggle OS-level symbolic links into each AI tool's global directory.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {onOpenAddModal && (
            <button className="btn-primary" onClick={onOpenAddModal}>
              <Plus size={13} />
              <span>Add Extension</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={onAdoptAll}
            title="Scan agent directories and adopt unmanaged extensions into Vault"
          >
            <FolderDown size={13} />
            <span>Adopt Unmanaged</span>
          </button>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {categories.map((cat) => {
          const count =
            cat === "all"
              ? items.length
              : items.filter((i) => i.extension_type === cat).length;
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

      {/* Switchboard Content */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <Sliders size={42} color="var(--text-muted)" />
          <h3 style={{ marginTop: "14px", marginBottom: "6px", fontWeight: 500, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            {items.length === 0 ? "No Vault Extensions Found" : "No Matching Extensions"}
          </h3>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 16px" }}>
            {items.length === 0
              ? "Add or import skills, plugins, or rules to your central Vault to enable global symlinks across Claude, Gemini, Cursor, and .agents."
              : "No extensions match your current filter or search criteria."}
          </p>
          {items.length === 0 && onOpenAddModal && (
            <button className="btn-primary" onClick={onOpenAddModal}>
              <Plus size={13} />
              <span>Add Your First Extension</span>
            </button>
          )}
        </div>
      ) : (
        <div className="vault-table-container">
          <table className="vault-table">
            <thead>
              <tr>
                <th style={{ padding: "12px 18px" }}>Extension</th>
                <th style={{ padding: "12px 14px", width: "100px" }}>Type</th>
                {installedTargets.map((target) => (
                  <th
                    key={target.id}
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      minWidth: "120px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "0.75rem" }}>
                        {target.name}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="tag-badge"
                          style={{ cursor: "pointer", padding: "1px 5px", fontSize: "0.62rem" }}
                          onClick={() => handleBatchToggleAgent(target.id, true)}
                          title={`Enable all for ${target.name}`}
                        >
                          ALL ON
                        </button>
                        <button
                          className="tag-badge"
                          style={{ cursor: "pointer", padding: "1px 5px", fontSize: "0.62rem" }}
                          onClick={() => handleBatchToggleAgent(target.id, false)}
                          title={`Disable all for ${target.name}`}
                        >
                          OFF
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
                const TypeIcon = typeConfig.icon || Layers;

                return (
                  <tr key={`${item.extension_type}_${item.id}`}>
                    {/* Name and Description */}
                    <td style={{ padding: "12px 18px" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: "0.88rem",
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
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--text-muted)",
                          maxWidth: "360px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "1px",
                        }}
                      >
                        {item.description || "—"}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          fontSize: "0.64rem",
                        }}
                      >
                        <TypeIcon size={9} />
                        <span>{typeConfig.label}</span>
                      </span>
                    </td>

                    {/* Target columns */}
                    {installedTargets.map((target) => {
                      const isCompatible = (item.supported_agents || []).includes(target.id);
                      const status = item.global_status?.[target.id] || "unlinked";
                      const isLinked = status === "linked";
                      const isUnmanaged = status === "unmanaged_copy";

                      if (!isCompatible) {
                        return (
                          <td key={target.id} style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.7rem",
                                opacity: 0.35,
                              }}
                              title={`Incompatible: ${target.name} does not support ${typeConfig.label}s`}
                            >
                              —
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={target.id} style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            {isUnmanaged ? (
                              <button
                                className="tag-badge"
                                style={{
                                  padding: "2px 8px",
                                  fontSize: "0.66rem",
                                  borderColor: "var(--color-unmanaged-border)",
                                  color: "var(--color-unmanaged)",
                                  background: "var(--color-unmanaged-bg)",
                                  cursor: "pointer",
                                }}
                                onClick={() => onAdoptUnmanaged(item.id, item.extension_type, target.id)}
                                title="Convert unmanaged copy into managed Vault symlink"
                              >
                                ADOPT
                              </button>
                            ) : (
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={isLinked}
                                  onChange={(e) =>
                                    onToggleGlobal(
                                      item.id,
                                      item.extension_type,
                                      target.id,
                                      e.target.checked
                                    )
                                  }
                                />
                                <span className="slider"></span>
                              </label>
                            )}
                          </div>
                        </td>
                      );
                    })}
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
