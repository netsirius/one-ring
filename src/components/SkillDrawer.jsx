import React, { useEffect, useState } from "react";
import { X, Folder, FileText, Code2, Copy, Check, Trash2 } from "lucide-react";
import { marked } from "marked";
import { api } from "../services/api";
import { TYPE_CONFIG } from "./VaultView";

export default function SkillDrawer({ item, onClose, onOpenFinder, onDeleteItem, onShowToast }) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "raw"
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!item) return;
    setIsLoading(true);

    api
      .getItemContent(item.id, item.extension_type)
      .then((raw) => {
        setContent(raw || "");
        setIsLoading(false);
      })
      .catch((err) => {
        setContent(`# Error loading content\n\n${err}`);
        setIsLoading(false);
      });
  }, [item]);

  // Esc key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const htmlContent = marked.parse(content || "");
  const typeConfig = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
  const TypeIcon = typeConfig.icon;

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    if (onShowToast) onShowToast("Copied documentation to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                {TypeIcon && <TypeIcon size={10} />}
                <span>{typeConfig.label}</span>
              </span>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {item.name}
              </h2>
            </div>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                marginTop: "3px",
              }}
            >
              {item.path}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn-secondary"
              onClick={() => onOpenFinder(item.path)}
              title="Reveal in Finder"
            >
              <Folder size={12} />
              <span>Finder</span>
            </button>
            {onDeleteItem && (
              <button
                className="btn-icon"
                style={{ color: "var(--color-broken)" }}
                onClick={() => onDeleteItem(item.id, item.extension_type)}
                title="Delete from Vault"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button className="btn-icon" onClick={onClose} title="Close (Esc)">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* View Mode Tabs & Quick Actions Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 24px",
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className={`nav-tab-item ${activeTab === "preview" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.74rem" }}
              onClick={() => setActiveTab("preview")}
            >
              <FileText size={12} />
              <span>Rendered Preview</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "raw" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.74rem" }}
              onClick={() => setActiveTab("raw")}
            >
              <Code2 size={12} />
              <span>Raw Source</span>
            </button>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: "3px 10px", fontSize: "0.72rem" }}
            onClick={handleCopyContent}
            title="Copy file contents"
          >
            {isCopied ? (
              <>
                <Check size={12} color="var(--color-linked)" />
                <span style={{ color: "var(--color-linked)" }}>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {isLoading ? (
            <div
              style={{
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "60px 0",
                fontSize: "0.82rem",
              }}
            >
              Loading content...
            </div>
          ) : activeTab === "preview" ? (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <pre
              style={{
                background: "var(--bg-app)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
