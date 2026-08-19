import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProjectMatrixView from "./ProjectMatrixView";

const mockProjects = [
  {
    id: "/tmp/sample-project",
    name: "sample-project",
    path: "/tmp/sample-project",
    items: [
      {
        item_id: "frontend-design",
        extension_type: "skill",
        status: "linked",
        target_agent: "agents",
        path: "/tmp/sample-project/.agents/skills/frontend-design",
      },
    ],
  },
];

const mockItems = [
  {
    id: "frontend-design",
    name: "frontend-design",
    extension_type: "skill",
    description: "Visual design guidance",
    path: "~/.one-ring/vault/skills/frontend-design",
    tags: ["frontend"],
    is_directory: true,
    has_doc: true,
  },
];

const mockTargets = [
  {
    id: "agents",
    name: "Standard (.agents)",
    is_installed: true,
    supported_types: ["skill", "plugin"],
  },
];

describe("ProjectMatrixView Component", () => {
  it("renders workspace selector and active project matrix", () => {
    render(
      <ProjectMatrixView
        projects={mockProjects}
        items={mockItems}
        targets={mockTargets}
        onAddProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onToggleProjectItem={vi.fn()}
        onRemoveProjectItem={vi.fn()}
        onOpenFinder={vi.fn()}
        onInspectItem={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText("ACTIVE WORKSPACE")).toBeDefined();
    expect(screen.getByText(/sample-project/i)).toBeDefined();
    expect(screen.getByText("frontend-design")).toBeDefined();
  });

  it("filters out unlinked items in Active in Project scope", () => {
    const unlinkedMockProjects = [
      {
        id: "/tmp/sample-project",
        name: "sample-project",
        path: "/tmp/sample-project",
        items: [],
      },
    ];

    render(
      <ProjectMatrixView
        projects={unlinkedMockProjects}
        items={mockItems}
        targets={mockTargets}
        onAddProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onToggleProjectItem={vi.fn()}
        onRemoveProjectItem={vi.fn()}
        onOpenFinder={vi.fn()}
        onInspectItem={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText(/No Extensions Active in this Workspace/i)).toBeDefined();
    expect(screen.queryByText("frontend-design")).toBeNull();
  });
});
