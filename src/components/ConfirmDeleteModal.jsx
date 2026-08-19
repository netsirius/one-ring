import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  mode = "trash", // "trash" | "permanent" | "empty_trash"
  isDeleting,
}) {
  if (!isOpen) return null;

  const isPermanent = mode === "permanent" || mode === "empty_trash";
  const isEmptyTrash = mode === "empty_trash";

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "450px",
          maxWidth: "92vw",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-sm)",
          padding: "24px",
          position: "relative",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Close button */}
        <button
          className="btn-icon"
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px" }}
          title="Cancel (Esc)"
        >
          <X size={14} />
        </button>

        {/* Warning Icon Box */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: isPermanent ? "var(--color-broken-bg)" : "var(--bg-badge)",
              border: `1px solid ${isPermanent ? "var(--color-broken-border)" : "var(--border-pill)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle
              size={20}
              color={isPermanent ? "var(--color-broken)" : "var(--text-primary)"}
            />
          </div>

          <div>
            <div
              className="section-eyebrow"
              style={{ color: isPermanent ? "var(--color-broken)" : "var(--text-muted)" }}
            >
              {isPermanent ? "PERMANENT DELETION" : "SAFE QUARANTINE"}
            </div>
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 500,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                marginBottom: "8px",
              }}
            >
              {isEmptyTrash
                ? "Empty Trash & Purge Files?"
                : isPermanent
                ? `Permanently Delete ${item?.name || item?.id}?`
                : `Move ${item?.name || item?.id} to Trash?`}
            </h3>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                marginBottom: "16px",
              }}
            >
              {isEmptyTrash ? (
                "This will permanently delete all quarantined extensions from your disk. This action cannot be undone."
              ) : isPermanent ? (
                <>
                  This will permanently delete{" "}
                  <code style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>
                    {item?.name || item?.id}
                  </code>{" "}
                  from your disk. This action cannot be undone.
                </>
              ) : (
                <>
                  This will safely move{" "}
                  <code style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>
                    {item?.name || item?.id}
                  </code>{" "}
                  to the <strong>Trash</strong> (<code>~/.one-ring/trash/</code>) and safely unlink all active symlinks across all AI agents. You can restore it anytime from the Trash tab.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={() => onConfirm(item?.id, item?.extension_type)}
            disabled={isDeleting}
            style={{
              backgroundColor: isPermanent ? "var(--color-broken)" : "#ffffff",
              borderColor: isPermanent ? "var(--color-broken)" : "#ffffff",
              color: isPermanent ? "#ffffff" : "#0a0a0a",
            }}
          >
            <Trash2 size={13} />
            <span>
              {isDeleting
                ? "Processing..."
                : isEmptyTrash
                ? "Empty All Trash"
                : isPermanent
                ? "Delete Permanently"
                : "Move to Trash"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
