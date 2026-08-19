import React, { useState } from "react";
import {
  BookOpen,
  Folder,
  Trash2,
  Sparkles,
  Search,
  X,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  Puzzle,
  Bot,
  Terminal,
  FileCode2,
} from "lucide-react";
import RingLogo from "./RingLogo";

export const TYPE_CONFIG = {
  skill: {
    label: "Skill",
    icon: Layers,
    bg: "rgba(255, 122, 23, 0.08)",
    color: "#ff7a17",
    border: "rgba(255, 122, 23, 0.25)",
  },
  plugin: {
    label: "Plugin",
    icon: Puzzle,
    bg: "rgba(196, 181, 253, 0.08)",
    color: "#c4b5fd",
    border: "rgba(196, 181, 253, 0.25)",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    bg: "rgba(160, 195, 236, 0.08)",
    color: "#a0c3ec",
    border: "rgba(160, 195, 236, 0.25)",
  },
  command: {
    label: "Command",
    icon: Terminal,
    bg: "rgba(16, 185, 129, 0.08)",
    color: "#10b981",
    border: "rgba(16, 185, 129, 0.25)",
  },
  rule: {
    label: "Rule",
    icon: FileCode2,
    bg: "rgba(244, 63, 94, 0.08)",
    color: "#f43f5e",
    border: "rgba(244, 63, 94, 0.25)",
  },
};

export const TYPE_COLORS = TYPE_CONFIG;

export default function VaultView({
  items,
  targets,
  onToggleGlobal,
  onInspectItem,
  onOpenFinder,
  onDeleteItem,
  onOpenAddModal,
  searchQuery = "",
  setSearchQuery,
  viewMode = "grid",
  onShowToast,
}) {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  const types = ["all", "skill", "plugin", "agent", "command", "rule"];

  // Item counts per type
  const counts = {
    all: items.length,
    skill: items.filter((i) => i.extension_type === "skill").length,
    plugin: items.filter((i) => i.extension_type === "plugin").length,
    agent: items.filter((i) => i.extension_type === "agent").length,
    command: items.filter((i) => i.extension_type === "command").length,
    rule: items.filter((i) => i.extension_type === "rule").length,
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedType !== "all" && item.extension_type !== selectedType) {
      return false;
    }
    if (selectedTag !== "all" && !(item.tags || []).includes(selectedTag)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.extension_type || "").toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchType || matchTags;
    }
    return true;
  });

  // Extract unique tags for active type
  const activeTags = Array.from(
    new Set(
      items
        .filter((i) => selectedType === "all" || i.extension_type === selectedType)
        .flatMap((i) => i.tags || [])
    )
  );

  const handleCopyPath = (path, itemId) => {
    navigator.clipboard.writeText(path);
    setCopiedId(itemId);
    if (onShowToast) onShowToast(`Copied path: ${path}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Category Filter Pills & Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Type Selector Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "transparent",
            padding: "0",
          }}
        >
          {types.map((type) => {
            const count = counts[type];
            const isActive = selectedType === type;
            const config = TYPE_CONFIG[type];
            const Icon = config?.icon || Layers;
            const label = type === "all" ? "All" : `${config.label}s`;

            return (
              <button
                key={type}
                className={`nav-tab-item ${isActive ? "active" : ""}`}
                style={{ padding: "5px 12px", fontSize: "0.76rem" }}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedTag("all");
                }}
              >
                <Icon size={13} />
                <span>{label}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-mono)",
                    opacity: isActive ? 1 : 0.6,
                    marginLeft: "2px",
                  }}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filter Tags Bar */}
      {activeTags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "18px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="section-eyebrow" style={{ marginBottom: 0, marginRight: "4px" }}>
            TAGS:
          </span>
          <button
            className="tag-badge"
            style={{
              cursor: "pointer",
              borderColor: selectedTag === "all" ? "var(--text-primary)" : "var(--border-subtle)",
              color: selectedTag === "all" ? "var(--text-primary)" : "var(--text-muted)",
              background: selectedTag === "all" ? "var(--bg-badge)" : "transparent",
            }}
            onClick={() => setSelectedTag("all")}
          >
            ALL
          </button>
          {activeTags.slice(0, 12).map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                className="tag-badge"
                style={{
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--text-primary)" : "var(--border-subtle)",
                  color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                  background: isSelected ? "var(--bg-badge)" : "transparent",
                }}
                onClick={() => setSelectedTag(isSelected ? "all" : tag)}
              >
                #{tag.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <RingLogo size={48} />
          <h3 style={{ marginTop: "14px", marginBottom: "6px", fontWeight: 500, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            No Extensions Found
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: "18px",
              maxWidth: "440px",
              fontSize: "0.82rem",
            }}
          >
            {searchQuery
              ? `No items match "${searchQuery}". Clear your search query or reset filters.`
              : "Your Vault is currently empty in this category."}
          </p>
          <button className="btn-primary" onClick={onOpenAddModal}>
            <Sparkles size={14} />
            <span>Add / Import Extension</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="skills-grid">
          {filteredItems.map((item) => {
            const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
            const TypeIcon = typeConfig.icon || Layers;
            const isCopied = copiedId === item.id;

            return (
              <div key={`${item.extension_type}_${item.id}`} className="skill-card">
                <div>
                  {/* Top Header Row */}
                  <div className="skill-card-top">
                    <div className="skill-title-row">
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          fontSize: "0.65rem",
                        }}
                      >
                        <TypeIcon size={10} />
                        <span>{typeConfig.label}</span>
                      </span>
                      <span className="skill-title" title={item.name}>
                        {item.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        className="btn-icon"
                        style={{ width: "28px", height: "28px" }}
                        onClick={() => handleCopyPath(item.path, item.id)}
                        title="Copy absolute path"
                      >
                        {isCopied ? <Check size={12} color="var(--color-linked)" /> : <Copy size={12} />}
                      </button>

                      <button
                        className="btn-icon"
                        style={{ width: "28px", height: "28px" }}
                        onClick={() => onInspectItem(item)}
                        title="Inspect documentation & source code"
                      >
                        <BookOpen size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="skill-description">{item.description || "No description provided."}</p>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="tags-list">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="tag-badge"
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedTag(t)}
                          title={`Filter by #${t}`}
                        >
                          #{t.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  {/* Global Symlinks Switchboard inside Card */}
                  <div className="switches-section">
                    <div className="switches-header">
                      <span className="switches-title">Agent Compatibility</span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        SYMLINKS
                      </span>
                    </div>

                    <div className="agent-toggles-grid">
                      {targets
                        .filter((t) => t.is_installed)
                        .map((target) => {
                          const isCompatible = (item.supported_agents || []).includes(target.id);
                          const status = item.global_status?.[target.id] || "unlinked";
                          const isLinked = status === "linked";

                          if (!isCompatible) {
                            return (
                              <div
                                key={target.id}
                                className="agent-toggle-item incompatible"
                                title={`${target.name} does not support ${typeConfig.label}s`}
                              >
                                <span>{target.name.split(" ")[0]}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                                  —
                                </span>
                              </div>
                            );
                          }

                          return (
                            <label
                              key={target.id}
                              className="agent-toggle-item"
                              title={`${target.name}: ${isLinked ? "ACTIVE" : "INACTIVE"}`}
                            >
                              <span style={{ color: isLinked ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {target.name.split(" ")[0]}
                              </span>
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
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="skill-card-footer">
                    <button
                      className="btn-secondary"
                      style={{ padding: "3px 10px", fontSize: "0.72rem" }}
                      onClick={() => onOpenFinder(item.path)}
                      title="Reveal in Finder"
                    >
                      <Folder size={11} />
                      <span>Finder</span>
                    </button>

                    <button
                      className="btn-icon"
                      style={{
                        width: "28px",
                        height: "28px",
                        color: "var(--color-broken)",
                      }}
                      onClick={() => onDeleteItem(item.id, item.extension_type)}
                      title="Remove from Vault"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View for Dense Browsing */
        <div className="vault-table-container">
          <table className="vault-table">
            <thead>
              <tr>
                <th style={{ width: "220px" }}>Extension</th>
                <th style={{ width: "100px" }}>Type</th>
                <th>Description</th>
                <th>Global Agents Status</th>
                <th style={{ textAlign: "right", width: "110px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
                const TypeIcon = typeConfig.icon || Layers;

                return (
                  <tr key={`${item.extension_type}_${item.id}`}>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      <span
                        style={{ cursor: "pointer", display: "inline-block" }}
                        onClick={() => onInspectItem(item)}
                      >
                        {item.name}
                      </span>
                    </td>
                    <td>
                      <span
                        className="tag-badge"
                        style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          borderColor: typeConfig.border,
                          fontWeight: 500,
                          fontSize: "0.65rem",
                          textTransform: "uppercase",
                        }}
                      >
                        <TypeIcon size={9} />
                        <span>{typeConfig.label}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {item.description || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {targets
                          .filter((t) => t.is_installed)
                          .map((target) => {
                            const isCompatible = (item.supported_agents || []).includes(target.id);
                            const status = item.global_status?.[target.id] || "unlinked";
                            const isLinked = status === "linked";

                            if (!isCompatible) return null;

                            return (
                              <span
                                key={target.id}
                                className="tag-badge"
                                style={{
                                  background: isLinked
                                    ? "var(--color-linked-bg)"
                                    : "var(--color-unlinked-bg)",
                                  color: isLinked ? "var(--color-linked)" : "var(--color-unlinked)",
                                  borderColor: isLinked
                                    ? "var(--color-linked-border)"
                                    : "var(--color-unlinked-border)",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {isLinked && <CheckCircle2 size={9} />}
                                <span>{target.name.split(" ")[0]}</span>
                              </span>
                            );
                          })}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                        <button
                          className="btn-icon"
                          style={{ width: "26px", height: "26px" }}
                          onClick={() => onInspectItem(item)}
                          title="Inspect"
                        >
                          <BookOpen size={11} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: "26px", height: "26px" }}
                          onClick={() => onOpenFinder(item.path)}
                          title="Finder"
                        >
                          <Folder size={11} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: "26px", height: "26px", color: "var(--color-broken)" }}
                          onClick={() => onDeleteItem(item.id, item.extension_type)}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
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
