import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import InstallExtensionModal from "./InstallExtensionModal";
import { api } from "../services/api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InstallExtensionModal Component", () => {
  it("renders modal when isOpen is true with all 5 navigation tabs", async () => {
    await act(async () => {
      render(
        <InstallExtensionModal
          isOpen={true}
          onClose={vi.fn()}
          onImport={vi.fn()}
          onCreate={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    expect(screen.getByText("Browse Marketplaces")).toBeDefined();
    expect(screen.getByText("Quick Import")).toBeDefined();
    expect(screen.getByText("Local Disk")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();
    expect(screen.getByText("Presets")).toBeDefined();
  });

  it("switches to Quick Import tab and previews NPX commands", async () => {
    await act(async () => {
      render(
        <InstallExtensionModal
          isOpen={true}
          onClose={vi.fn()}
          onImport={vi.fn()}
          onCreate={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const importTab = screen.getByText("Quick Import");
    await act(async () => {
      fireEvent.click(importTab);
    });

    expect(screen.getByPlaceholderText(/e\.g\. npx skills add/i)).toBeDefined();

    const input = screen.getByPlaceholderText(/e\.g\. npx skills add/i);
    await act(async () => {
      fireEvent.change(input, {
        target: { value: "npx skills add vercel-labs/skills --skill frontend-design" },
      });
    });

    expect(screen.getByText("vercel-labs/skills")).toBeDefined();
    expect(screen.getByText("frontend-design")).toBeDefined();
  });

  it("switches to Local Folder tab and provides browse action", async () => {
    await act(async () => {
      render(
        <InstallExtensionModal
          isOpen={true}
          onClose={vi.fn()}
          onImport={vi.fn()}
          onCreate={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const localTab = screen.getByText("Local Disk");
    await act(async () => {
      fireEvent.click(localTab);
    });

    expect(screen.getByText("Browse...")).toBeDefined();
    expect(screen.getByPlaceholderText(/my-extension-folder/i)).toBeDefined();
  });

  it("switches to Presets tab and applies a template", async () => {
    const showToastMock = vi.fn();
    await act(async () => {
      render(
        <InstallExtensionModal
          isOpen={true}
          onClose={vi.fn()}
          onImport={vi.fn()}
          onCreate={vi.fn()}
          onShowToast={showToastMock}
        />
      );
    });

    const presetsTab = screen.getByText("Presets");
    await act(async () => {
      fireEvent.click(presetsTab);
    });

    expect(screen.getByText("STARTER TEMPLATES")).toBeDefined();
    expect(screen.getByText("frontend-design")).toBeDefined();

    // Click on a preset
    await act(async () => {
      fireEvent.click(screen.getByText("frontend-design"));
    });

    // Should switch to Custom tab with populated input
    expect(screen.getByDisplayValue("frontend-design")).toBeDefined();
  });

  it("auto-syncs marketplaces that have never been fetched", async () => {
    vi.spyOn(api, "getMarketplaces").mockResolvedValue([
      { id: "synced-mp", name: "Synced", url: "https://github.com/a/b", description: "", default_marketplace: true, synced: true },
      { id: "fresh-mp", name: "Fresh", url: "https://github.com/c/d", description: "", default_marketplace: false, synced: false },
    ]);
    vi.spyOn(api, "getMarketplaceCatalog").mockResolvedValue([]);
    const refreshSpy = vi.spyOn(api, "refreshMarketplace").mockResolvedValue(3);

    await act(async () => {
      render(
        <InstallExtensionModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} onCreate={vi.fn()} onShowToast={vi.fn()} />
      );
    });

    await waitFor(() => expect(refreshSpy).toHaveBeenCalledWith("fresh-mp"));
    expect(refreshSpy).not.toHaveBeenCalledWith("synced-mp");
  });

  it("shows sync failures instead of silently succeeding", async () => {
    vi.spyOn(api, "getMarketplaces").mockResolvedValue([
      { id: "broken-mp", name: "Broken", url: "https://github.com/x/y", description: "", default_marketplace: false, synced: true },
    ]);
    vi.spyOn(api, "getMarketplaceCatalog").mockResolvedValue([]);
    vi.spyOn(api, "refreshMarketplace").mockRejectedValue("Repository not found");

    await act(async () => {
      render(
        <InstallExtensionModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} onCreate={vi.fn()} onShowToast={vi.fn()} />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Sync"));
    });

    await waitFor(() => expect(screen.getByText(/Failed to sync broken-mp: Repository not found/)).toBeDefined());
  });

  it("removes a custom marketplace after inline confirmation", async () => {
    vi.spyOn(api, "getMarketplaces").mockResolvedValue([
      { id: "official", name: "Official", url: "https://github.com/a/b", description: "", default_marketplace: true, synced: true },
      { id: "mine", name: "Mine", url: "https://github.com/c/d", description: "", default_marketplace: false, synced: true },
    ]);
    vi.spyOn(api, "getMarketplaceCatalog").mockResolvedValue([
      {
        id: "tool", name: "Tool Plugin", extension_type: "plugin", description: "d", source_url: "/x",
        marketplace_id: "mine", tags: [], is_installed: false, components: ["2 skills", "MCP"],
      },
    ]);
    const removeSpy = vi.spyOn(api, "removeMarketplace").mockResolvedValue(undefined);

    await act(async () => {
      render(
        <InstallExtensionModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} onCreate={vi.fn()} onShowToast={vi.fn()} />
      );
    });

    expect(screen.getByText("2 skills · MCP")).toBeDefined();
    expect(screen.queryByText("Remove")).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue(/All Sources/), { target: { value: "mine" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Remove"));
    });
    expect(removeSpy).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm Remove"));
    });
    expect(removeSpy).toHaveBeenCalledWith("mine");
  });
});
