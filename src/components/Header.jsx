import React, { useRef, useEffect } from "react";
import { Plus, Search, AlertTriangle, ShieldCheck, RefreshCw, Sun, Moon, X } from "lucide-react";
import RingLogo from "./RingLogo";

export default function Header({
  stats,
  searchQuery,
  setSearchQuery,
  onOpenAddModal,
  onRefresh,
  isRefreshing,
  theme,
  setTheme,
  setActiveTab,
}) {
  const searchInputRef = useRef(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasIssues = (stats.doctor_issues_count || 0) > 0;

  return (
    <header className="app-header">
      {/* Brand Section */}
      <div className="brand-section">
        <div
          className="brand-icon-wrapper"
          title="One Ring — AI Extension Control"
          onClick={() => setActiveTab && setActiveTab("vault")}
        >
          <RingLogo size={32} />
        </div>
        <div>
          <h1 className="brand-title">
            ONE RING <span>SYSTEM</span>
          </h1>
          <p className="brand-tagline">One Vault to rule them all</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Global Search with Cmd+K hint */}
        <div className="search-wrapper">
          <Search size={13} color="var(--text-muted)" />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search items, paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="search-shortcut">⌘K</span>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch Theme" : "Switch to Dark Theme"}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Re-sync Button */}
        <button className="btn-icon" onClick={onRefresh} title="Rescan system">
          <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
        </button>

        {/* Add Extension Primary CTA */}
        <button className="btn-primary" onClick={onOpenAddModal}>
          <Plus size={14} />
          <span>Add Extension</span>
        </button>
      </div>
    </header>
  );
}
