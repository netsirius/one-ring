import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DoctorView from "./DoctorView";

describe("DoctorView Component", () => {
  it("renders healthy state when no issues are present", () => {
    render(
      <DoctorView
        issues={[]}
        onFixIssue={vi.fn()}
        onAdoptAll={vi.fn()}
        onMoveUnmanagedToTrash={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText(/System Healthy — Zero Issues Detected/i)).toBeDefined();
  });

  it("renders detected broken symlink issue and triggers fix", () => {
    const onFixMock = vi.fn();
    const sampleIssues = [
      {
        id: "issue-1",
        title: "Broken link: frontend-design",
        description: "Points to non-existent target",
        severity: "error",
        issue_type: "broken_symlink",
        extension_type: "skill",
        target_path: "~/.claude/skills/frontend-design",
        vault_path: "~/.one-ring/vault/skills/frontend-design",
        item_name: "frontend-design",
        target_agent: "claude",
        can_auto_fix: true,
      },
    ];

    render(
      <DoctorView
        issues={sampleIssues}
        onFixIssue={onFixMock}
        onAdoptAll={vi.fn()}
        onMoveUnmanagedToTrash={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText("Broken link: frontend-design")).toBeDefined();
    const repairBtn = screen.getByText("Repair Link");
    fireEvent.click(repairBtn);

    expect(onFixMock).toHaveBeenCalledWith(
      "~/.claude/skills/frontend-design",
      "broken_symlink",
      "skill",
      "~/.one-ring/vault/skills/frontend-design",
      "frontend-design"
    );
  });
});
