import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  FilePlus,
  Sparkles,
  Store,
  FolderPlus,
  Search,
  Check,
  Globe,
  ExternalLink,
  Plus,
  Cpu,
  Layers,
  Bot,
  Terminal,
  FileCode,
  ShieldAlert,
  Code2,
  GitBranch,
  FileText,
  Boxes,
  HelpCircle,
} from "lucide-react";
import { TYPE_CONFIG } from "./VaultView";
import { api } from "../services/api";

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
    body: "{\n  \"name\": \"chrome-devtools-plugin\",\n  \"description\": \"MCP Chrome DevTools connector\",\n  \"version\": \"1.0.0\"\n}",
  },
  {
    name: "github-pr-reviewer",
    type: "agent",
    description: "Autonomous PR review agent with diff analysis and security auditing.",
    body: "---\nname: github-pr-reviewer\ndescription: Automated code review and pull request analysis subagent.\nmodel: standard\n---\n\n# GitHub PR Reviewer\n\nPerform thorough code reviews, check edge cases, and inspect test coverage.",
  },
  {
    name: "slash-generate-tests",
    type: "command",
    description: "Interactive slash command to generate unit and integration test suites.",
    body: "---\nname: generate-tests\ndescription: Generates comprehensive test suites for active workspace files.\n---\n\n# /generate-tests\n\nAnalyze the specified module and construct comprehensive unit tests.",
  },
  {
    name: "react-19-standards",
    type: "rule",
    description: "Coding standards for React 19 Server Components, Suspense, and Actions.",
    body: "# React 19 & Next.js Rules\n\n- Prefer Server Components by default.\n- Use Server Actions for mutations.\n- Keep client boundaries lean.\n",
  },
];

function parseQuickInput(input) {
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

  const isRawUrl =
    clean.startsWith("http") &&
    (clean.endsWith(".md") ||
      clean.endsWith(".json") ||
      clean.endsWith(".mdc") ||
      clean.includes("raw.githubusercontent.com") ||
      clean.includes("gist.githubusercontent.com"));

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

  return { isCommand, isRawUrl, repo, skill, name };
}

export default function InstallExtensionModal({
  isOpen,
  onClose,
  onImport,
  onCreate,
  onShowToast,
  vaultItems = [],
}) {
  // Tabs: "catalog" | "import" | "local" | "create" | "presets"
  const [activeTab, setActiveTab] = useState("catalog");
  const [selectedType, setSelectedType] = useState("skill");

  // Marketplaces & Catalog state
  const [marketplaces, setMarketplaces] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogFilterType, setCatalogFilterType] = useState("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState("all");
  const [installingCatalogId, setInstallingCatalogId] = useState(null);

  // Add custom marketplace form
  const [showAddMarketplace, setShowAddMarketplace] = useState(false);
  const [newMpName, setNewMpName] = useState("");
  const [newMpUrl, setNewMpUrl] = useState("");
  const [newMpDesc, setNewMpDesc] = useState("");

  // Quick Import sub-mode ("npx" | "git" | "raw")
  const [importMode, setImportMode] = useState("npx");
  const [importUrl, setImportUrl] = useState("");
  const [customName, setCustomName] = useState("");

  // Local Folder state
  const [localFolderPath, setLocalFolderPath] = useState("");
  const [localCustomName, setLocalCustomName] = useState("");

  // Custom Authoring state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBody, setNewBody] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load marketplaces & catalog
  useEffect(() => {
    if (isOpen) {
      loadMarketplacesAndCatalog();
    }
  }, [isOpen]);

  const loadMarketplacesAndCatalog = async () => {
    try {
      const [mps, catalog] = await Promise.all([
        api.getMarketplaces(),
        api.getMarketplaceCatalog(),
      ]);
      setMarketplaces(mps || []);
      setCatalogItems(catalog || []);
    } catch (err) {
      console.error("Failed to load catalog:", err);
    }
  };

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Create a map of marketplace ID -> Display Name
  const marketplaceMap = useMemo(() => {
    const map = {
      all: "All Sources",
      "claude-plugins-official": "Claude Code Official",
      "ecc": "Everything Claude Code (ECC)",
      "gemini-plugins": "Google Antigravity & Gemini",
      "agent-skills": "Universal Agent Skills Standard",
      "caveman": "Caveman Agent Ecosystem",
    };
    for (const m of marketplaces) {
      map[m.id] = m.name;
    }
    return map;
  }, [marketplaces]);

  // Compute item counts per marketplace
  const marketplaceCounts = useMemo(() => {
    const counts = { all: catalogItems.length };
    for (const item of catalogItems) {
      counts[item.marketplace_id] = (counts[item.marketplace_id] || 0) + 1;
    }
    return counts;
  }, [catalogItems]);

  // Handle marketplace dropdown change
  const handleMarketplaceChange = (newMarketplaceId) => {
    setSelectedMarketplaceId(newMarketplaceId);
    // If the current type filter has 0 items in the newly selected marketplace, reset to "all"
    if (catalogFilterType !== "all") {
      const itemsInNewMp =
        newMarketplaceId === "all"
          ? catalogItems
          : catalogItems.filter((i) => i.marketplace_id === newMarketplaceId);
      const countForCurrentType = itemsInNewMp.filter(
        (i) => i.extension_type === catalogFilterType
      ).length;
      if (countForCurrentType === 0) {
        setCatalogFilterType("all");
      }
    }
  };

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesMarketplace =
        selectedMarketplaceId === "all" || item.marketplace_id === selectedMarketplaceId;
      if (!matchesMarketplace) return false;

      const matchesType =
        catalogFilterType === "all" || item.extension_type === catalogFilterType;
      if (!matchesType) return false;

      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        item.id.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q))
      );
    });
  }, [catalogItems, selectedMarketplaceId, catalogFilterType, catalogSearch]);

  // Handle Catalog 1-Click Install
  const handleInstallCatalogItem = async (item) => {
    setInstallingCatalogId(item.id);
    setErrorMessage("");
    try {
      await api.installMarketplaceItem(item.id, item.marketplace_id, item.extension_type);
      if (onShowToast) onShowToast(`Installed ${item.name} into Vault`);
      // Update local state
      setCatalogItems((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_installed: true } : c))
      );
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to install catalog item");
    } finally {
      setInstallingCatalogId(null);
    }
  };

  // Handle Add Marketplace
  const handleAddMarketplaceSubmit = async (e) => {
    e.preventDefault();
    if (!newMpName.trim() || !newMpUrl.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await api.addMarketplace(newMpName.trim(), newMpUrl.trim(), newMpDesc.trim());
      if (onShowToast) onShowToast(`Registered marketplace: ${newMpName}`);
      setShowAddMarketplace(false);
      setNewMpName("");
      setNewMpUrl("");
      setNewMpDesc("");
      loadMarketplacesAndCatalog();
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to add marketplace");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Import Submit
  const handleQuickImportSubmit = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const parsed = parseQuickInput(importUrl);
      if (parsed?.isRawUrl) {
        await api.importRawUrl(importUrl.trim(), selectedType, customName.trim() || null);
      } else {
        await onImport(importUrl.trim(), selectedType, customName.trim() || null);
      }
      if (onShowToast) onShowToast("Successfully imported extension into Vault");
      onClose();
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to import item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Local Folder Dialog
  const handlePickLocalFolder = async () => {
    try {
      const path = await api.selectFolderDialog();
      if (path) {
        setLocalFolderPath(path);
        if (!localCustomName) {
          setLocalCustomName(path.split("/").pop());
        }
      }
    } catch (err) {
      console.error("Folder dialog failed:", err);
    }
  };

  // Handle Local Folder Import Submit
  const handleLocalFolderSubmit = async (e) => {
    e.preventDefault();
    if (!localFolderPath.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await api.importLocalFolder(
        localFolderPath.trim(),
        selectedType,
        localCustomName.trim() || null
      );
      if (onShowToast) onShowToast(`Imported local folder: ${localCustomName || localFolderPath.split("/").pop()}`);
      onClose();
    } catch (err) {
      setErrorMessage(err?.toString() || "Failed to import local folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Custom Authoring Submit
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: activeTab === "catalog" ? "880px" : "660px",
          width: "95%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-card)" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className={`nav-tab-item ${activeTab === "catalog" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("catalog");
                setErrorMessage("");
              }}
            >
              <Store size={13} />
              <span>Browse Marketplaces</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "import" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("import");
                setErrorMessage("");
              }}
            >
              <Download size={13} />
              <span>Quick Import</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "local" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
              onClick={() => {
                setActiveTab("local");
                setErrorMessage("");
              }}
            >
              <FolderPlus size={13} />
              <span>Local Disk</span>
            </button>
            <button
              className={`nav-tab-item ${activeTab === "create" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
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
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
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
        <div className="modal-body" style={{ padding: "18px", overflowY: "auto", flex: 1 }}>
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

          {/* TAB 1: BROWSE MARKETPLACES */}
          {activeTab === "catalog" && (
            <div>
              {/* Marketplace Selector & Add Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  background: "var(--bg-app)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-pill)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "280px" }}>
                  <Store size={14} color="var(--color-gold)" />
                  <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    Marketplace:
                  </span>
                  <select
                    className="form-input"
                    style={{ height: "30px", fontSize: "0.76rem", padding: "2px 8px", flex: 1 }}
                    value={selectedMarketplaceId}
                    onChange={(e) => handleMarketplaceChange(e.target.value)}
                  >
                    <option value="all">All Sources ({catalogItems.length} items total)</option>
                    {marketplaces.map((m) => {
                      const count = marketplaceCounts[m.id] || 0;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({count} {count === 1 ? "item" : "items"})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ height: "30px", padding: "0 10px", fontSize: "0.72rem" }}
                  onClick={() => setShowAddMarketplace(!showAddMarketplace)}
                >
                  <Plus size={12} />
                  <span>{showAddMarketplace ? "Close Form" : "Add Marketplace"}</span>
                </button>
              </div>

              {/* Add Custom Marketplace Sub-Form */}
              {showAddMarketplace && (
                <form
                  onSubmit={handleAddMarketplaceSubmit}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div className="section-eyebrow" style={{ marginBottom: "8px" }}>
                    REGISTER NEW MARKETPLACE REPOSITORY
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Marketplace Name (e.g. Acme AI Registry)"
                      value={newMpName}
                      onChange={(e) => setNewMpName(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="GitHub URL or Local Path (e.g. acme/ai-plugins)"
                      value={newMpUrl}
                      onChange={(e) => setNewMpUrl(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Short description of this marketplace collection..."
                    value={newMpDesc}
                    onChange={(e) => setNewMpDesc(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "3px 10px", fontSize: "0.72rem" }}
                      onClick={() => setShowAddMarketplace(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: "3px 12px", fontSize: "0.72rem" }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Registering..." : "Register Marketplace"}
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Filter Bar */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      paddingLeft: "30px",
                      paddingRight: catalogSearch ? "28px" : "10px",
                      height: "32px",
                      fontSize: "0.78rem",
                    }}
                    placeholder="Filter by name, tags, description, or author..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                  {catalogSearch && (
                    <button
                      type="button"
                      className="btn-icon"
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        padding: "2px",
                      }}
                      onClick={() => setCatalogSearch("")}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
                  {["all", ...types].map((t) => {
                    const isSelected = catalogFilterType === t;
                    const count =
                      t === "all"
                        ? catalogItems.filter(
                            (i) => selectedMarketplaceId === "all" || i.marketplace_id === selectedMarketplaceId
                          ).length
                        : catalogItems.filter(
                            (i) =>
                              i.extension_type === t &&
                              (selectedMarketplaceId === "all" || i.marketplace_id === selectedMarketplaceId)
                          ).length;

                    const label = t === "all" ? "ALL" : TYPE_CONFIG[t]?.label.toUpperCase();

                    return (
                      <button
                        key={t}
                        type="button"
                        className="tag-badge"
                        style={{
                          cursor: "pointer",
                          padding: "3px 8px",
                          fontSize: "0.68rem",
                          background: isSelected ? "var(--bg-badge)" : "transparent",
                          borderColor: isSelected ? "var(--text-primary)" : "var(--border-subtle)",
                          color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                        onClick={() => setCatalogFilterType(t)}
                      >
                        <span>{label}</span>
                        <span style={{ opacity: 0.6, fontSize: "0.62rem" }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Header */}
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  Showing <strong>{filteredCatalog.length}</strong> items in{" "}
                  <strong>{marketplaceMap[selectedMarketplaceId] || selectedMarketplaceId}</strong>
                </span>
                <span>Click "Install to Vault" to copy into local One Ring library</span>
              </div>

              {/* Catalog Items Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "10px",
                  maxHeight: "380px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {filteredCatalog.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                    }}
                  >
                    No extensions found matching your search or filters.
                  </div>
                ) : (
                  filteredCatalog.map((item) => {
                    const config = TYPE_CONFIG[item.extension_type] || TYPE_CONFIG.skill;
                    const Icon = config.icon;
                    const isInstalling = installingCatalogId === item.id;
                    const sourceName = marketplaceMap[item.marketplace_id] || item.marketplace_id;

                    return (
                      <div
                        key={`${item.marketplace_id}-${item.extension_type}-${item.id}`}
                        className="marketplace-item-card"
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "6px",
                              marginBottom: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className="tag-badge"
                              style={{
                                background: config.bg,
                                color: config.color,
                                fontSize: "0.62rem",
                                padding: "2px 6px",
                              }}
                            >
                              <Icon size={9} />
                              <span>{config.label.toUpperCase()}</span>
                            </span>

                            <span
                              className="tag-badge"
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                background: "var(--bg-app)",
                                padding: "2px 6px",
                                maxWidth: "140px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={`Marketplace: ${sourceName}`}
                            >
                              <Store size={8} color="var(--color-gold)" />
                              <span>{sourceName}</span>
                            </span>
                          </div>

                          <strong
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-primary)",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            {item.name}
                          </strong>

                          <p
                            style={{
                              fontSize: "0.74rem",
                              color: "var(--text-secondary)",
                              lineHeight: "1.35",
                              marginBottom: "8px",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                            title={item.description}
                          >
                            {item.description}
                          </p>

                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {item.tags?.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: "0.64rem",
                                  color: "var(--text-muted)",
                                  background: "var(--bg-app)",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                  border: "1px solid var(--border-pill)",
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderTop: "1px solid var(--border-card)",
                            paddingTop: "8px",
                            marginTop: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.66rem",
                              color: "var(--text-muted)",
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`Author: ${item.author || "Community"} ${item.version ? `(v${item.version})` : ""}`}
                          >
                            {item.author || "Community"} {item.version ? `· v${item.version}` : ""}
                          </span>

                          {item.is_installed ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.7rem",
                                color: "var(--color-linked)",
                                fontWeight: 500,
                              }}
                            >
                              <Check size={11} /> Installed
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: "3px 10px", fontSize: "0.7rem" }}
                              disabled={isInstalling}
                              onClick={() => handleInstallCatalogItem(item)}
                            >
                              {isInstalling ? "Installing..." : "Install to Vault"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QUICK IMPORT (NPX / GIT / RAW URL) */}
          {activeTab === "import" && (
            <form onSubmit={handleQuickImportSubmit}>
              {/* Import Mode Selector Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <div
                  className={`source-mode-card ${importMode === "npx" ? "active" : ""}`}
                  onClick={() => setImportMode("npx")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <Terminal size={13} color="var(--color-gold)" />
                    <strong style={{ fontSize: "0.78rem" }}>NPX Command</strong>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                    <code>npx skills add</code> package standard
                  </p>
                </div>

                <div
                  className={`source-mode-card ${importMode === "git" ? "active" : ""}`}
                  onClick={() => setImportMode("git")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <GitBranch size={13} color="var(--color-linked)" />
                    <strong style={{ fontSize: "0.78rem" }}>GitHub Repo</strong>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                    Repository URL or deep sub-path
                  </p>
                </div>

                <div
                  className={`source-mode-card ${importMode === "raw" ? "active" : ""}`}
                  onClick={() => setImportMode("raw")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <FileText size={13} color="#a855f7" />
                    <strong style={{ fontSize: "0.78rem" }}>Raw File / Gist</strong>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                    Direct <code>.md</code>, <code>.mdc</code>, or JSON URL
                  </p>
                </div>
              </div>

              {/* Extension Type Selection */}
              <div className="form-group">
                <label className="form-label">Extension Type to Register</label>
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

              {/* Dynamic Input Based on Selected Mode */}
              <div className="form-group">
                <label className="form-label">
                  {importMode === "npx"
                    ? "NPX Skills Command"
                    : importMode === "git"
                    ? "GitHub Repository or Sub-tree URL"
                    : "Direct File URL / Gist"}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    importMode === "npx"
                      ? "e.g. npx skills add vercel-labs/skills --skill frontend-design"
                      : importMode === "git"
                      ? "e.g. https://github.com/anthropics/claude-plugins/tree/main/plugins/feature-dev"
                      : "e.g. https://raw.githubusercontent.com/org/repo/main/RULE.md"
                  }
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  required
                  autoFocus
                />

                {/* Quick Examples */}
                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Examples:</span>
                  {importMode === "npx" ? (
                    <>
                      <button
                        type="button"
                        className="tag-badge"
                        style={{ fontSize: "0.66rem", cursor: "pointer" }}
                        onClick={() => {
                          setImportUrl("npx skills add vercel-labs/skills --skill frontend-design");
                          setSelectedType("skill");
                        }}
                      >
                        npx skills add vercel-labs/skills --skill frontend-design
                      </button>
                      <button
                        type="button"
                        className="tag-badge"
                        style={{ fontSize: "0.66rem", cursor: "pointer" }}
                        onClick={() => {
                          setImportUrl("npx skills add vercel-labs/skills --skill sql-optimizer");
                          setSelectedType("skill");
                        }}
                      >
                        sql-optimizer
                      </button>
                    </>
                  ) : importMode === "git" ? (
                    <button
                      type="button"
                      className="tag-badge"
                      style={{ fontSize: "0.66rem", cursor: "pointer" }}
                      onClick={() => {
                        setImportUrl("https://github.com/anthropics/claude-plugins/tree/main/plugins/code-review");
                        setSelectedType("plugin");
                      }}
                    >
                      claude-plugins/code-review
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tag-badge"
                      style={{ fontSize: "0.66rem", cursor: "pointer" }}
                      onClick={() => {
                        setImportUrl("https://raw.githubusercontent.com/vercel-labs/skills/main/rules/react-19/RULE.md");
                        setSelectedType("rule");
                      }}
                    >
                      React 19 RULE.md
                    </button>
                  )}
                </div>

                {/* Real-time Parser Feedback */}
                {(() => {
                  const parsed = parseQuickInput(importUrl);
                  if (parsed && (parsed.isCommand || parsed.skill || parsed.isRawUrl || parsed.repo)) {
                    return (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "8px 12px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-app)",
                          border: "1px solid var(--border-pill)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          fontSize: "0.74rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Sparkles size={12} color="var(--color-gold)" />
                          <strong>Auto-Detected Import Source:</strong>
                        </div>
                        <div style={{ color: "var(--text-secondary)", marginLeft: "18px" }}>
                          Source: <strong style={{ color: "var(--text-primary)" }}>{parsed.repo}</strong>
                          {parsed.skill && (
                            <>
                              {" · "}Sub-item: <strong style={{ color: "var(--color-linked)" }}>{parsed.skill}</strong>
                            </>
                          )}
                          {" · "}Target Type:{" "}
                          <strong style={{ color: TYPE_CONFIG[selectedType]?.color }}>
                            {TYPE_CONFIG[selectedType]?.label.toUpperCase()}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Custom Vault Folder Identifier (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Leave blank to auto-detect identifier"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Importing..." : "Import into Vault"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOCAL FOLDER IMPORT */}
          {activeTab === "local" && (
            <form onSubmit={handleLocalFolderSubmit}>
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

              <div className="form-group">
                <label className="form-label">Local Folder or File Path on Disk</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="/Users/username/projects/my-extension-folder"
                    value={localFolderPath}
                    onChange={(e) => setLocalFolderPath(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePickLocalFolder}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Browse...
                  </button>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Copies the local folder into <code>~/.one-ring/vault/{TYPE_CONFIG[selectedType]?.folder}/</code> and standardizes its documentation.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Vault Item Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. my-local-skill"
                  value={localCustomName}
                  onChange={(e) => setLocalCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Importing..." : "Import Folder to Vault"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CUSTOM AUTHORING */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit}>
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
                <label className="form-label">
                  {selectedType === "plugin" ? "plugin.json Content" : "Documentation & Instructions"}
                </label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: "120px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}
                  placeholder={
                    selectedType === "plugin"
                      ? "{\n  \"name\": \"my-plugin\",\n  \"description\": \"My plugin description\"\n}"
                      : "# My Extension\n\nInstructions, system prompts, or rules..."
                  }
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Save into Vault"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: PRESETS */}
          {activeTab === "presets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="section-eyebrow">STARTER TEMPLATES</div>
              {PRESET_TEMPLATES.map((preset) => {
                const config = TYPE_CONFIG[preset.type] || TYPE_CONFIG.skill;
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
                      <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {preset.description}
                      </p>
                    </div>

                    <button type="button" className="btn-secondary" style={{ padding: "3px 8px", fontSize: "0.7rem" }}>
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
