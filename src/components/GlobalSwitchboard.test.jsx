import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import GlobalSwitchboard from "./GlobalSwitchboard";

const mockItems = [
  {
    id: "frontend-design",
    name: "frontend-design",
    extension_type: "skill",
    description: "Guidance for visual design",
    path: "~/.one-ring/vault/skills/frontend-design",
    tags: ["frontend"],
    is_directory: true,
    has_doc: true,
    global_status: { claude: "linked", gemini: "unlinked" },
    supported_agents: ["claude", "gemini", "agents"],
  },
];

const mockTargets = [
  {
    id: "claude",
    name: "Claude Code",
    is_installed: true,
    supported_types: ["skill", "plugin"],
    type_global_dirs: { skill: "~/.claude/skills" },
  },
  {
    id: "gemini",
    name: "Antigravity / Gemini",
    is_installed: true,
    supported_types: ["skill", "plugin"],
    type_global_dirs: { skill: "~/.gemini/config/skills" },
  },
];

describe("GlobalSwitchboard Component", () => {
  it("renders the cross-agent switchboard table", () => {
    render(
      <GlobalSwitchboard
        items={mockItems}
        targets={mockTargets}
        onToggleGlobal={vi.fn()}
        onAdoptUnmanaged={vi.fn()}
        onAdoptAll={vi.fn()}
        onInspectItem={vi.fn()}
        onOpenAddModal={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText("Agent Compatibility Switchboard")).toBeDefined();
    expect(screen.getByText("frontend-design")).toBeDefined();
    expect(screen.getByText("Claude Code")).toBeDefined();
    expect(screen.getByText("Antigravity / Gemini")).toBeDefined();
  });
});
