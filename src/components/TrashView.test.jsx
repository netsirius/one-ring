import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TrashView from "./TrashView";

describe("TrashView Component", () => {
  it("renders clean state when trash is empty", () => {
    render(
      <TrashView
        trashItems={[]}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
        onEmptyTrash={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText(/Trash is Clean/i)).toBeDefined();
  });

  it("renders quarantined items and triggers restore", () => {
    const onRestoreMock = vi.fn();
    const trashItems = [
      {
        id: "trash-1",
        name: "deleted-skill",
        extension_type: "skill",
        source_type: "vault",
        original_path: "~/.one-ring/vault/skills/deleted-skill",
        trash_path: "~/.one-ring/trash/items/trash-1/deleted-skill",
        deleted_at: "1724000000",
      },
    ];

    render(
      <TrashView
        trashItems={trashItems}
        onRestore={onRestoreMock}
        onPermanentDelete={vi.fn()}
        onEmptyTrash={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />
    );

    expect(screen.getByText("deleted-skill")).toBeDefined();
    const restoreBtn = screen.getByText("Restore");
    fireEvent.click(restoreBtn);

    expect(onRestoreMock).toHaveBeenCalledWith("trash-1");
  });
});
