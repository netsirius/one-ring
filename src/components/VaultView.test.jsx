import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VaultView from "./VaultView";

const mockItems = [
  {
    id: "frontend-design",
    name: "frontend-design",
    extension_type: "skill",
    description: "Guidance for distinctive visual design",
    path: "~/.one-ring/vault/skills/frontend-design",
    tags: ["frontend", "design"],
    is_directory: true,
    has_doc: true,
    global_status: { claude: "linked", gemini: "unlinked" },
    supported_agents: ["claude", "gemini", "agents"],
  },
  {
    id: "chrome-devtools-plugin",
    name: "chrome-devtools-plugin",
    extension_type: "plugin",
    description: "Chrome DevTools profiling suite",
    path: "~/.one-ring/vault/plugins/chrome-devtools-plugin",
    tags: ["plugin", "chrome"],
    is_directory: true,
    has_doc: true,
    global_status: { claude: "unlinked", gemini: "linked" },
    supported_agents: ["claude", "gemini", "agents"],
  },
];

const mockTargets = [
  { id: "claude", name: "Claude Code", is_installed: true },
  { id: "gemini", name: "Antigravity / Gemini", is_installed: true },
  { id: "agents", name: "Standard (.agents)", is_installed: true },
];

describe("VaultView Component", () => {
  it("renders vault items in grid mode", () => {
    render(
      <VaultView
        items={mockItems}
        targets={mockTargets}
        onToggleGlobal={vi.fn()}
        onInspectItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onOpenAddModal={vi.fn()}
        onOpenFinder={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText("frontend-design")).toBeDefined();
    expect(screen.getByText("chrome-devtools-plugin")).toBeDefined();
  });

  it("filters items by search query", () => {
    render(
      <VaultView
        items={mockItems}
        targets={mockTargets}
        onToggleGlobal={vi.fn()}
        onInspectItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onOpenAddModal={vi.fn()}
        onOpenFinder={vi.fn()}
        searchQuery="devtools"
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.queryByText("frontend-design")).toBeNull();
    expect(screen.getByText("chrome-devtools-plugin")).toBeDefined();
  });

  it("renders in table view mode when viewMode prop is table", () => {
    const { container } = render(
      <VaultView
        items={mockItems}
        targets={mockTargets}
        onToggleGlobal={vi.fn()}
        onInspectItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onOpenAddModal={vi.fn()}
        onOpenFinder={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        viewMode="table"
      />
    );

    expect(container.querySelector(".data-table")).toBeDefined();
    expect(screen.getByText("frontend-design")).toBeDefined();
  });
});
