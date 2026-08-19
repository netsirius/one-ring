import React, { useState } from "react";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  RefreshCw,
  FolderDown,
  Search,
  X,
  AlertOctagon,
  FileQuestion,
  Trash2,
} from "lucide-react";
import { TYPE_CONFIG } from "./VaultView";

export default function DoctorView({
  issues = [],
  onFixIssue,
  onAdoptAll,
  onMoveUnmanagedToTrash,
  onRefresh,
  isRefreshing,
  searchQuery = "",
  setSearchQuery,
  onShowToast,
}) {
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const counts = {
    all: issues.length,
    broken: issues.filter((i) => i.issue_type === "broken_symlink").length,
    unmanaged: issues.filter((i) => i.issue_type === "unmanaged_copy").length,
    skill: issues.filter((i) => i.extension_type === "skill").length,
    plugin: issues.filter((i) => i.extension_type === "plugin").length,
    agent: issues.filter((i) => i.extension_type === "agent").length,
    command: issues.filter((i) => i.extension_type === "command").length,
    rule: issues.filter((i) => i.extension_type === "rule").length,
  };

  const filteredIssues = issues.filter((issue) => {
    if (filterType === "broken" && issue.issue_type !== "broken_symlink") return false;
    if (filterType === "unmanaged" && issue.issue_type !== "unmanaged_copy") return false;
    if (filterCategory !== "all" && issue.extension_type !== filterCategory) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (issue.title || "").toLowerCase().includes(q);
      const matchDesc = (issue.description || "").toLowerCase().includes(q);
      const matchPath = (issue.target_path || "").toLowerCase().includes(q);
      const matchName = (issue.item_name || "").toLowerCase().includes(q);
      const matchAgent = (issue.target_agent || "").toLowerCase().includes(q);
      const matchType = (issue.extension_type || "").toLowerCase().includes(q);
      return matchTitle || matchDesc || matchPath || matchName || matchAgent || matchType;
    }

    return true;
  });

  const categories = ["all", "skill", "plugin", "agent", "command", "rule"];

  return (
    <div>
      {/* Sleek Engineered Header Bar */}
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
        <div style={{ flex: 1, minWidth: "260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div className="section-eyebrow">DIAGNOSTICS</div>
            <span
              className="tag-badge"
              style={{
                borderColor:
                  counts.broken > 0
                    ? "var(--color-broken-border)"
                    : counts.unmanaged > 0
                    ? "var(--color-unmanaged-border)"
                    : "var(--color-linked-border)",
                color:
                  counts.broken > 0
                    ? "var(--color-broken)"
                    : counts.unmanaged > 0
                    ? "var(--color-unmanaged)"
                    : "var(--color-linked)",
                background:
                  counts.broken > 0
                    ? "var(--color-broken-bg)"
                    : counts.unmanaged > 0
                    ? "var(--color-unmanaged-bg)"
                    : "var(--color-linked-bg)",
                padding: "2px 8px",
                fontSize: "0.68rem",
              }}
            >
              {counts.broken > 0
                ? `${counts.broken} BROKEN LINKS`
                : counts.unmanaged > 0
                ? `${counts.unmanaged} UNMANAGED COPIES`
                : "100% HEALTHY"}
            </span>
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Symlink Integrity Scanner
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Real-time audit across all agent directories for dead symlinks and unmanaged file divergence.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={onRefresh}>
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Rescan</span>
          </button>
          {counts.unmanaged > 0 && (
            <button className="btn-primary" onClick={onAdoptAll}>
              <FolderDown size={13} />
              <span>Adopt All Unmanaged ({counts.unmanaged})</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Filter Pills + Elongated Search Bar */}
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
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", alignItems: "center" }}>
          {/* Status filter pills */}
          <button
            className={`tag-badge ${filterType === "all" ? "active" : ""}`}
            style={{
              background: filterType === "all" ? "var(--bg-badge)" : "transparent",
              color: filterType === "all" ? "var(--text-primary)" : "var(--text-muted)",
              borderColor: filterType === "all" ? "var(--text-primary)" : "var(--border-pill)",
              cursor: "pointer",
              padding: "4px 12px",
              fontSize: "0.74rem",
            }}
            onClick={() => setFilterType("all")}
          >
            <span>ALL</span>
            <strong style={{ marginLeft: "4px", fontFamily: "var(--font-mono)" }}>
              {counts.all}
            </strong>
          </button>

          <button
            className={`tag-badge ${filterType === "broken" ? "active" : ""}`}
            style={{
              background: filterType === "broken" ? "var(--color-broken-bg)" : "transparent",
              color: filterType === "broken" ? "var(--color-broken)" : "var(--text-muted)",
              borderColor: filterType === "broken" ? "var(--color-broken-border)" : "var(--border-pill)",
              cursor: "pointer",
              padding: "4px 12px",
              fontSize: "0.74rem",
            }}
            onClick={() => setFilterType("broken")}
          >
            <span>BROKEN</span>
            <strong style={{ marginLeft: "4px", fontFamily: "var(--font-mono)" }}>
              {counts.broken}
            </strong>
          </button>

          <button
            className={`tag-badge ${filterType === "unmanaged" ? "active" : ""}`}
            style={{
              background: filterType === "unmanaged" ? "var(--color-unmanaged-bg)" : "transparent",
              color: filterType === "unmanaged" ? "var(--color-unmanaged)" : "var(--text-muted)",
              borderColor: filterType === "unmanaged" ? "var(--color-unmanaged-border)" : "var(--border-pill)",
              cursor: "pointer",
              padding: "4px 12px",
              fontSize: "0.74rem",
            }}
            onClick={() => setFilterType("unmanaged")}
          >
            <span>UNMANAGED</span>
            <strong style={{ marginLeft: "4px", fontFamily: "var(--font-mono)" }}>
              {counts.unmanaged}
            </strong>
          </button>

          {/* Separator */}
          <div style={{ width: "1px", height: "18px", backgroundColor: "var(--border-subtle)", margin: "0 4px" }} />

          {/* Category filter pills */}
          {categories.map((cat) => {
            if (cat !== "all" && counts[cat] === 0) return null;
            const isSelected = filterCategory === cat;
            const label = cat === "all" ? "ALL TYPES" : `${cat.toUpperCase()}S`;

            return (
              <button
                key={cat}
                className={`tag-badge ${isSelected ? "active" : ""}`}
                style={{
                  background: isSelected ? "var(--bg-badge)" : "transparent",
                  color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                  borderColor: isSelected ? "var(--text-primary)" : "var(--border-pill)",
                  cursor: "pointer",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                }}
                onClick={() => setFilterCategory(cat)}
              >
                <span>{label}</span>
                {cat !== "all" && (
                  <strong style={{ marginLeft: "4px", fontFamily: "var(--font-mono)" }}>
                    {counts[cat]}
                  </strong>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Issues List or Clean Healthy State */}
      {issues.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-card)",
            padding: "56px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--color-linked-bg)",
              border: "1px solid var(--color-linked-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <ShieldCheck size={24} color="var(--color-linked)" />
          </div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "6px", color: "var(--text-primary)" }}>
            System Healthy — Zero Issues Detected
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.84rem",
              maxWidth: "460px",
              margin: "0 auto",
              lineHeight: "1.5",
            }}
          >
            All managed skills, plugins, agents, commands, and rules across your AI targets are valid and synchronized with your central Vault.
          </p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck size={38} color="var(--color-linked)" />
          <h3 style={{ marginTop: "12px", marginBottom: "4px", fontWeight: 500, fontSize: "0.95rem" }}>
            No issues match the selected filter
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Try resetting your search query or switching filter tabs.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredIssues.map((issue) => {
            const typeConfig = TYPE_CONFIG[issue.extension_type] || TYPE_CONFIG.skill;
            const isError = issue.severity === "error";

            return (
              <div
                key={issue.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-card)",
                  padding: "16px 20px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-card)",
                  gap: "16px",
                  transition: "var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
                  {isError ? (
                    <AlertTriangle
                      size={18}
                      color="var(--color-broken)"
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                  ) : (
                    <Activity
                      size={18}
                      color="var(--color-unmanaged)"
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginBottom: "4px",
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
                        {typeConfig.label}
                      </span>

                      <strong style={{ fontWeight: 500, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                        {issue.title}
                      </strong>

                      <span
                        className="tag-badge"
                        style={{
                          color: isError ? "var(--color-broken)" : "var(--color-unmanaged)",
                          borderColor: isError
                            ? "var(--color-broken-border)"
                            : "var(--color-unmanaged-border)",
                          background: isError
                            ? "var(--color-broken-bg)"
                            : "var(--color-unmanaged-bg)",
                          fontSize: "0.65rem",
                        }}
                      >
                        {issue.issue_type === "broken_symlink"
                          ? "BROKEN LINK"
                          : "UNMANAGED COPY"}
                      </span>

                      {issue.target_agent && (
                        <span
                          className="tag-badge"
                          style={{
                            fontSize: "0.65rem",
                          }}
                        >
                          AGENT: {issue.target_agent.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        lineHeight: "1.4",
                        margin: "0 0 4px 0",
                      }}
                    >
                      {issue.description}
                    </p>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {issue.target_path}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: "0.76rem",
                      padding: "5px 12px",
                      borderColor: isError ? "var(--color-broken-border)" : "var(--border-pill)",
                      color: isError ? "var(--color-broken)" : "var(--text-primary)",
                    }}
                    onClick={() =>
                      onFixIssue(
                        issue.target_path,
                        issue.issue_type,
                        issue.extension_type,
                        issue.vault_path,
                        issue.item_name
                      )
                    }
                  >
                    <Wrench size={12} />
                    <span>
                      {issue.issue_type === "unmanaged_copy"
                        ? "Adopt to Vault"
                        : "Repair Link"}
                    </span>
                  </button>

                  {issue.issue_type === "unmanaged_copy" && onMoveUnmanagedToTrash && (
                    <button
                      className="btn-icon"
                      style={{
                        width: "30px",
                        height: "30px",
                        color: "var(--color-broken)",
                        borderColor: "var(--border-subtle)",
                      }}
                      onClick={() =>
                        onMoveUnmanagedToTrash(
                          issue.target_path,
                          issue.extension_type,
                          issue.item_name || issue.title
                        )
                      }
                      title="Move unmanaged copy to Trash"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
