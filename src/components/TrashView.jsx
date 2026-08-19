import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  ShieldCheck,
  Search,
  X,
  AlertTriangle,
  Folder,
  Layers,
  Sparkles,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { TYPE_CONFIG } from "./VaultView";

export default function TrashView({
  trashItems = [],
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onRefresh,
  isRefreshing,
  searchQuery = "",
  setSearchQuery,
  onOpenFinder,
  onShowToast,
}) {
  const [filterType, setFilterType] = useState("all");

  const filteredItems = trashItems.filter((item) => {
    if (filterType !== "all" && item.extension_type !== filterType) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchId = (item.id || "").toLowerCase().includes(q);
      const matchPath = (item.original_path || "").toLowerCase().includes(q);
      const matchType = (item.extension_type || "").toLowerCase().includes(q);
      return matchName || matchId || matchPath || matchType;
    }

    return true;
  });

  const categories = ["all", "skill", "plugin", "agent", "command", "rule"];

  const formatTimestamp = (tsStr) => {
    try {
      const sec = parseInt(tsStr, 10);
      if (isNaN(sec)) return "Recently";
      const date = new Date(sec * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  return (
    <div>
      {/* Header bar */}
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
            <div className="section-eyebrow">QUARANTINE</div>
            <span
              className="tag-badge"
              style={{
                borderColor: trashItems.length > 0 ? "var(--color-broken-border)" : "var(--border-pill)",
                color: trashItems.length > 0 ? "var(--color-broken)" : "var(--text-muted)",
                background: trashItems.length > 0 ? "var(--color-broken-bg)" : "transparent",
                padding: "2px 8px",
                fontSize: "0.68rem",
              }}
            >
              {trashItems.length} {trashItems.length === 1 ? "Item" : "Items"} in Trash
            </span>
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Trash & Quarantine Staging
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Quarantined extensions held safely in <code>~/.one-ring/trash/</code> with 1-click restoration before permanent disk purge.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onRefresh && (
            <button className="btn-secondary" onClick={onRefresh} title="Refresh trash items">
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={onEmptyTrash}
            disabled={trashItems.length === 0}
            style={{
              borderColor: trashItems.length > 0 ? "var(--color-broken-border)" : "var(--border-subtle)",
              color: trashItems.length > 0 ? "var(--color-broken)" : "var(--text-muted)",
              opacity: trashItems.length === 0 ? 0.4 : 1,
              padding: "6px 14px",
            }}
            title="Permanently delete all quarantined items from disk"
          >
            <Trash2 size={13} />
            <span>Empty Trash</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Category Chips + Elongated Search */}
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
                ? trashItems.length
                : trashItems.filter((i) => i.extension_type === cat).length;
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
      </div>

      {/* Trash Items List or Clean Empty State */}
      {trashItems.length === 0 ? (
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
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-pill)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Trash2 size={22} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "6px", color: "var(--text-primary)" }}>
            Trash is Clean
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
            No items in quarantine. Deleting extensions from your Vault or unmanaged copies moves them here first so you can restore them anytime.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <Search size={38} color="var(--text-muted)" />
          <h3 style={{ marginTop: "12px", marginBottom: "4px", fontWeight: 500, fontSize: "0.95rem" }}>
            No matching items in Trash
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            No quarantined extensions match your search filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredItems.map((item) => {
            const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
            const isFromVault = item.source_type === "vault";

            return (
              <div
                key={item.id}
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
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "var(--radius-pill)",
                      backgroundColor: "var(--bg-app)",
                      border: "1px solid var(--border-pill)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <Trash2 size={16} color="var(--color-broken)" />
                  </div>

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
                        {item.name}
                      </strong>

                      <span
                        className="tag-badge"
                        style={{
                          fontSize: "0.65rem",
                          color: isFromVault ? "var(--text-primary)" : "var(--color-unmanaged)",
                          borderColor: isFromVault ? "var(--border-pill)" : "var(--color-unmanaged-border)",
                          background: isFromVault ? "transparent" : "var(--color-unmanaged-bg)",
                        }}
                      >
                        {isFromVault ? "FROM VAULT" : "FROM UNMANAGED PATH"}
                      </span>

                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                        Deleted {formatTimestamp(item.deleted_at)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: "0.74rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Original Path: {item.original_path}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: "0.76rem",
                      padding: "5px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onClick={() => onRestore(item.id)}
                    title="Restore to original location"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>

                  <button
                    className="btn-icon"
                    style={{
                      width: "30px",
                      height: "30px",
                      color: "var(--color-broken)",
                      borderColor: "var(--border-subtle)",
                    }}
                    onClick={() => onPermanentDelete(item.id, item.name)}
                    title="Permanently delete from disk"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
