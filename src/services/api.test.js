import { describe, it, expect } from "vitest";
import { api } from "./api";

describe("API Service Layer", () => {
  it("returns fallback vault items in browser mode", async () => {
    const items = await api.getVaultItems();
    expect(items).toBeInstanceOf(Array);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("id");
    expect(items[0]).toHaveProperty("extension_type");
    expect(items[0]).toHaveProperty("global_status");
  });

  it("returns known agent targets", async () => {
    const targets = await api.getAgentTargets();
    expect(targets).toBeInstanceOf(Array);
    const ids = targets.map((t) => t.id);
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("agents");
  });

  it("returns system stats", async () => {
    const stats = await api.getSystemStats();
    expect(stats).toHaveProperty("total_vault_items");
    expect(stats).toHaveProperty("active_global_links");
  });

  it("handles toggling global items safely in mock mode", async () => {
    const res = await api.toggleGlobalItem("test-skill", "skill", "claude", true);
    expect(res).toBe("linked");

    const resUnlink = await api.toggleGlobalItem("test-skill", "skill", "claude", false);
    expect(resUnlink).toBe("unlinked");
  });
});
