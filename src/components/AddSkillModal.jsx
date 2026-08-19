import React, { useState, useEffect } from "react";
import { X, Download, FilePlus, Sparkles } from "lucide-react";
import { TYPE_CONFIG } from "./VaultView";

const PRESET_TEMPLATES = [
  {
    name: "frontend-design",
    type: "skill",
    description: "Guidance for distinctive visual design, typography, and memorable UI choices.",
    body: "---\nname: frontend-design\ndescription: Guidance for distinctive, intentional visual design when building new UI.\n---\n\n# Frontend Design\n\nMake deliberate choices about palette, typography, and layout.",
  },
  {
    name: "ui-ux-pro-max",
    type: "skill",
    description: "Design intelligence system: 50 styles, 21 palettes, 50 font pairings.",
    body: "---\nname: ui-ux-pro-max\ndescription: UI/UX design intelligence system for modern web & mobile applications.\n---\n\n# UI/UX Pro Max\n\nApply high-end aesthetics, responsive layouts, and design tokens.",
  },
  {
    name: "chrome-devtools-plugin",
    type: "plugin",
    description: "Chrome DevTools plugin with accessibility and performance tools.",
    body: "{\n  \"name\": \"chrome-devtools-plugin\",\n  \"description\": \"MCP Chrome DevTools connector\"\n}",
  },
  {
    name: "ponytail-audit",
    type: "skill",
    description: "Code audit for over-engineering, dead code, and simplification.",
    body: "---\nname: ponytail-audit\ndescription: Audit repository for over-engineering and unneeded complexity.\n---\n\n# Ponytail Code Audit\n\nReview code to eliminate over-engineering.",
  },
];

function parseNpxInput(input) {
  if (!input || !input.trim()) return null;
  let clean = input.trim();
  const prefixes = [
    "npx skills add ",
    "npx @agent/skills add ",
    "npx @agents/skills add ",
    "skills add ",
    "add ",
  ];
  let isCommand = false;
  for (const p of prefixes) {
    if (clean.startsWith(p)) {
      clean = clean.slice(p.length).trim();
      isCommand = true;
      break;
    }
  }

  const tokens = clean.split(/\s+/);
  let repo = "";
  let skill = null;
  let name = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ((t === "--skill" || t === "-s") && i + 1 < tokens.length) {
      skill = tokens[i + 1].replace(/['"]/g, "");
      i++;
    } else if ((t === "--name" || t === "-n") && i + 1 < tokens.length) {
      name = tokens[i + 1].replace(/['"]/g, "");
      i++;
    } else if (!repo && !t.startsWith("-")) {
      repo = t.replace(/['"]/g, "");
    }
  }

  if (repo.includes("github.com") && repo.includes("/tree/")) {
    const parts = repo.split("/tree/")[1]?.split("/");
    if (parts && parts.length > 1 && !skill) {
      skill = parts[parts.length - 1];
    }
  }

  return { isCommand, repo, skill, name };
}

export default function AddSkillModal({
  isOpen,
  onClose,
  onImport,
  onCreate,
  onShowToast,
}) {
  const [activeTab, setActiveTab] = useState("import"); // "import" | "create" | "presets"
  const [selectedType, setSelectedType] = useState("skill");

  const [importUrl, setImportUrl] = useState("");
  const [customName, setCustomName] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBody, setNewBody] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onImport(importUrl.trim(), selectedType, customName.trim() || null);
      if (onShowToast) onShowToast("Successfully imported extension into Vault");
      onClose();
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to import item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate(newName.trim(), selectedType, newDesc.trim(), newBody.trim());
      if (onShowToast) onShowToast(`Created extension: ${newName}`);
      onClose();
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setSelectedType(preset.type);
    setNewName(preset.name);
    setNewDesc(preset.description);
    setNewBody(preset.body);
    setActiveTab("create");
    if (onShowToast) onShowToast(`Loaded template: ${preset.name}`);
  };

  const types = ["skill", "plugin", "agent", "command", "rule"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className={`nav-tab-item ${activeTab === "import" ? "active" : ""}`}
              style={{ padding: "4px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("import");
                setErrorMessage("");
              }}
            >
              <Download size={13} />
              <span>Import URL</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "create" ? "active" : ""}`}
              style={{ padding: "4px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("create");
                setErrorMessage("");
              }}
            >
              <FilePlus size={13} />
              <span>Custom</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "presets" ? "active" : ""}`}
              style={{ padding: "4px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("presets");
                setErrorMessage("");
              }}
            >
              <Sparkles size={13} />
              <span>Presets</span>
            </button>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {errorMessage && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--color-broken-bg)",
                border: "1px solid var(--color-broken-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-broken)",
                fontSize: "0.8rem",
                marginBottom: "14px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {activeTab !== "presets" && (
            <div className="form-group">
              <label className="form-label">Extension Type</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {types.map((t) => {
                  const config = TYPE_CONFIG[t];
                  const isSelected = selectedType === t;
                  const Icon = config.icon;

                  return (
                    <button
                      key={t}
                      type="button"
                      className="tag-badge"
                      style={{
                        cursor: "pointer",
                        padding: "4px 10px",
                        fontSize: "0.72rem",
                        background: isSelected ? "var(--bg-badge)" : "transparent",
                        borderColor: isSelected ? "var(--text-primary)" : "var(--border-subtle)",
                        color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                      onClick={() => setSelectedType(t)}
                    >
                      <Icon size={11} />
                      <span>{config.label.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "import" ? (
            <form onSubmit={handleImportSubmit}>
              <div className="form-group">
                <label className="form-label">Repository / Source URL or NPX Command</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. npx skills add vercel-labs/skills --skill find-skills"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  required
                  autoFocus
                />
                
                {(() => {
                  const parsed = parseNpxInput(importUrl);
                  if (parsed && (parsed.isCommand || parsed.skill)) {
                    return (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-app)",
                          border: "1px solid var(--border-pill)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.74rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Sparkles size={12} color="var(--color-gold)" />
                        <span>
                          Target: <strong style={{ color: "var(--text-primary)" }}>{parsed.repo}</strong>
                          {parsed.skill && (
                            <>
                              {" · "}Sub-skill: <strong style={{ color: "var(--color-linked)" }}>{parsed.skill}</strong>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Supports full GitHub URLs, shorthand (<code>owner/repo</code>), or direct <code>npx skills add</code> commands with <code>--skill</code>.
                    </span>
                  );
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Custom Vault Folder Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. find-skills"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "20px",
                }}
              >
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Importing..." : "Import into Vault"}
                </button>
              </div>
            </form>
          ) : activeTab === "create" ? (
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Identifier / Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. sql-optimizer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Guidelines for query optimization"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Documentation / Content</label>
                <textarea
                  className="form-textarea"
                  placeholder="# My Extension&#10;&#10;Instructions, system prompts, or rules..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "20px",
                }}
              >
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Save into Vault"}
                </button>
              </div>
            </form>
          ) : (
            /* Presets Tab */
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="section-eyebrow">STARTER TEMPLATES</div>
              {PRESET_TEMPLATES.map((preset) => {
                const config = TYPE_CONFIG[preset.type];
                const Icon = config.icon;

                return (
                  <div
                    key={preset.name}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      transition: "var(--transition-fast)",
                    }}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          className="tag-badge"
                          style={{
                            background: config.bg,
                            color: config.color,
                            fontSize: "0.62rem",
                          }}
                        >
                          <Icon size={9} />
                          <span>{config.label.toUpperCase()}</span>
                        </span>
                        <strong style={{ fontSize: "0.85rem", fontWeight: 500 }}>{preset.name}</strong>
                      </div>
                      <p
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                        }}
                      >
                        {preset.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "3px 8px", fontSize: "0.7rem" }}
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
