import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InstallExtensionModal from "./InstallExtensionModal";

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
});
