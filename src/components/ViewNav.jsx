import React from "react";
import { Layers, Sliders, FolderGit2, Activity, Trash2, LayoutGrid, List } from "lucide-react";

export default function ViewNav({
  activeTab,
  setActiveTab,
  doctorCount = 0,
  brokenCount = 0,
  trashCount = 0,
  viewMode = "grid",
  setViewMode,
}) {
  const tabs = [
    { id: "vault", label: "Vault Library", icon: Layers },
    { id: "switchboard", label: "Global Switchboard", icon: Sliders },
    { id: "projects", label: "Project Workspaces", icon: FolderGit2 },
    { id: "doctor", label: "Symlink Doctor", icon: Activity, badge: doctorCount, isAlert: brokenCount > 0 },
    { id: "trash", label: "Trash", icon: Trash2, badge: trashCount, isAlert: false },
  ];

  return (
    <div className="nav-tabs-wrapper">
      <div className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  style={{
                    backgroundColor: tab.isAlert ? "var(--color-broken)" : "var(--bg-badge)",
                    color: tab.isAlert ? "#ffffff" : "var(--text-secondary)",
                    border: tab.isAlert ? "1px solid var(--color-broken-border)" : "1px solid var(--border-pill)",
                    borderRadius: "var(--radius-pill)",
                    padding: "1px 7px",
                    fontSize: "0.66rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 500,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Vault view controls (Grid vs Table layout toggle) */}
      {activeTab === "vault" && setViewMode && (
        <div className="view-controls-group">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid Card View"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Dense Table View"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
