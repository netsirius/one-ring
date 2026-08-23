// Tauri IPC bridge with fallback for browser development
let invoke = null;
let isTauri = false;

if (typeof window !== "undefined") {
  if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
    invoke = window.__TAURI__.core.invoke;
    isTauri = true;
  } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
    invoke = window.__TAURI_INTERNALS__.invoke;
    isTauri = true;
  }
}

export const api = {
  isTauri,

  async getVaultItems() {
    if (isTauri && invoke) {
      return await invoke("get_vault_items");
    }
    return [
      {
        id: "frontend-design",
        name: "frontend-design",
        extension_type: "skill",
        description: "Distinctive, production-grade visual design and UI heuristics for building modern web apps.",
        path: "~/.one-ring/vault/skills/frontend-design",
        tags: ["skill", "frontend", "design", "ui"],
        is_directory: true,
        has_doc: true,
        global_status: {
          claude: "linked",
          gemini: "linked",
          agents: "linked",
          cursor: "unlinked",
          codex: "unlinked"
        },
        supported_agents: ["claude", "gemini", "agents", "cursor", "codex"]
      },
      {
        id: "ui-ux-pro-max",
        name: "ui-ux-pro-max",
        extension_type: "skill",
        description: "Design intelligence engine with 50 styles, 21 palettes, font pairings, and responsive patterns.",
        path: "~/.one-ring/vault/skills/ui-ux-pro-max",
        tags: ["skill", "ui-ux", "design-system"],
        is_directory: true,
        has_doc: true,
        global_status: {
          claude: "linked",
          gemini: "linked",
          agents: "linked",
          cursor: "unlinked",
          codex: "unlinked"
        },
        supported_agents: ["claude", "gemini", "agents", "cursor", "codex"]
      },
      {
        id: "chrome-devtools-plugin",
        name: "chrome-devtools-plugin",
        extension_type: "plugin",
        description: "Comprehensive Chrome DevTools debugging, network inspection, and memory leak profiling suite.",
        path: "~/.one-ring/vault/plugins/chrome-devtools-plugin",
        tags: ["plugin", "devtools", "chrome"],
        is_directory: true,
        has_doc: true,
        global_status: {
          claude: "unlinked",
          gemini: "linked",
          agents: "linked",
          cursor: "incompatible",
          codex: "incompatible"
        },
        supported_agents: ["claude", "gemini", "agents"]
      },
      {
        id: "ponytail-audit",
        name: "ponytail-audit",
        extension_type: "skill",
        description: "Deep codebase auditor for over-engineering, dead code, and speculative abstractions.",
        path: "~/.one-ring/vault/skills/ponytail-audit",
        tags: ["skill", "audit", "refactoring"],
        is_directory: true,
        has_doc: true,
        global_status: {
          claude: "linked",
          gemini: "linked",
          agents: "linked",
          cursor: "unlinked",
          codex: "unlinked"
        },
        supported_agents: ["claude", "gemini", "agents", "cursor", "codex"]
      }
    ];
  },

  async getAgentTargets() {
    if (isTauri && invoke) {
      return await invoke("get_agent_targets");
    }
    return [
      { id: "claude", name: "Anthropic Claude", icon: "brain", description: "Anthropic Claude Code CLI", is_installed: true, supported_types: ["skill", "command"] },
      { id: "gemini", name: "Google Gemini / Antigravity", icon: "bot", description: "Google Antigravity & Gemini CLI", is_installed: true, supported_types: ["skill", "plugin", "rule", "command"] },
      { id: "agents", name: "Universal .agents", icon: "sparkles", description: "Universal standard for AI agent extensions", is_installed: true, supported_types: ["skill", "agent", "rule", "plugin", "command"] },
      { id: "cursor", name: "Cursor", icon: "code", description: "Cursor AI Rules & Extensions", is_installed: true, supported_types: ["rule", "skill"] },
      { id: "codex", name: "Codex", icon: "terminal", description: "OpenAI Codex Agent", is_installed: true, supported_types: ["skill"] },
    ];
  },

  async getSavedProjects() {
    if (isTauri && invoke) {
      return await invoke("get_saved_projects");
    }
    return [
      {
        id: "~/projects/my-workspace",
        name: "my-workspace",
        path: "~/projects/my-workspace",
        items: [
          { item_id: "frontend-design", extension_type: "skill", status: "linked", target_agent: "agents", path: "~/projects/my-workspace/.agents/skills/frontend-design" }
        ],
        skills: []
      }
    ];
  },

  async addProject(path) {
    if (isTauri && invoke) {
      return await invoke("add_project", { path });
    }
    return { id: path, name: path.split("/").pop(), path, items: [] };
  },

  async removeProject(path) {
    if (isTauri && invoke) {
      return await invoke("remove_project", { path });
    }
  },

  async toggleGlobalItem(itemId, extType, agentId, enable) {
    if (isTauri && invoke) {
      return await invoke("toggle_global_item", { itemId, extType, agentId, enable });
    }
    return enable ? "linked" : "unlinked";
  },

  async toggleProjectItem(projectPath, extType, itemId, agentId, enable) {
    if (isTauri && invoke) {
      return await invoke("toggle_project_item", { projectPath, extType, itemId, agentId, enable });
    }
    return enable ? "linked" : "unlinked";
  },

  async removeItemFromProject(projectPath, extType, itemId, agentId = "agents") {
    if (isTauri && invoke) {
      return await invoke("remove_item_from_project", { projectPath, extType, itemId, agentId });
    }
  },

  async syncProjectToTarget(projectPath, targetAgent, enable) {
    if (isTauri && invoke) {
      return await invoke("sync_project_to_target", { projectPath, targetAgent, enable });
    }
    return 1;
  },

  async getItemContent(itemId, extType = "skill") {
    if (isTauri && invoke) {
      return await invoke("get_item_content", { itemId, extType });
    }
    return `# ${itemId}\n\nDocumentation preview...`;
  },

  async createVaultItem(name, extType, description, content) {
    if (isTauri && invoke) {
      return await invoke("create_vault_item", { name, extType, description, content });
    }
  },

  async deleteVaultItem(itemId, extType) {
    if (isTauri && invoke) {
      return await invoke("delete_vault_item", { itemId, extType });
    }
  },

  async listTrashItems() {
    if (isTauri && invoke) {
      return await invoke("list_trash_items");
    }
    return [];
  },

  async moveVaultItemToTrash(itemId, extType) {
    if (isTauri && invoke) {
      return await invoke("move_vault_item_to_trash", { itemId, extType });
    }
  },

  async moveUnmanagedToTrash(sourcePath, extType, itemName) {
    if (isTauri && invoke) {
      return await invoke("move_unmanaged_to_trash", { sourcePath, extType, itemName });
    }
  },

  async restoreTrashItem(trashId) {
    if (isTauri && invoke) {
      return await invoke("restore_trash_item", { trashId });
    }
  },

  async deleteTrashItemPermanently(trashId) {
    if (isTauri && invoke) {
      return await invoke("delete_trash_item_permanently", { trashId });
    }
  },

  async emptyTrash() {
    if (isTauri && invoke) {
      return await invoke("empty_all_trash");
    }
    return 0;
  },

  async importItem(url, extType = "skill", customName = null) {
    if (isTauri && invoke) {
      return await invoke("import_item", { url, extType, customName });
    }
  },

  async importLocalFolder(path, extType = "skill", customName = null) {
    if (isTauri && invoke) {
      return await invoke("import_local_folder", { path, extType, customName });
    }
  },

  async importRawUrl(url, extType = "skill", customName = null) {
    if (isTauri && invoke) {
      return await invoke("import_raw_url", { url, extType, customName });
    }
  },

  async getMarketplaces() {
    if (isTauri && invoke) {
      return await invoke("get_marketplaces");
    }
    return [
      {
        id: "claude-plugins-official",
        name: "Claude Code Official",
        url: "https://github.com/anthropics/claude-plugins",
        description: "Official Anthropic Claude Code plugins, skills, and MCP connectors",
        default_marketplace: true,
      },
      {
        id: "ecc",
        name: "Everything Claude Code (ECC)",
        url: "https://github.com/everything-claude-code/ecc",
        description: "Comprehensive catalog of skills, agents, commands, and rules",
        default_marketplace: true,
      },
      {
        id: "gemini-plugins",
        name: "Google Antigravity & Gemini",
        url: "https://github.com/google-gemini/antigravity-plugins",
        description: "Antigravity plugins, DevTools, MCP adapters, and autonomous agent capabilities",
        default_marketplace: true,
      },
      {
        id: "agent-skills",
        name: "Universal Agent Skills Standard",
        url: "https://github.com/vercel-labs/skills",
        description: "Universal multi-agent skill registry and workflows standard",
        default_marketplace: true,
      },
      {
        id: "caveman",
        name: "Caveman Agent Ecosystem",
        url: "https://github.com/caveman/claude-plugins",
        description: "Specialized developer skills, subagents, and slash commands",
        default_marketplace: true,
      },
    ];
  },

  async addMarketplace(name, url, description) {
    if (isTauri && invoke) {
      return await invoke("add_marketplace", { name, url, description });
    }
    return { id: name.toLowerCase().replace(/\s+/g, "-"), name, url, description, default_marketplace: false };
  },

  async removeMarketplace(id) {
    if (isTauri && invoke) {
      return await invoke("remove_marketplace", { id });
    }
  },

  async getMarketplaceCatalog() {
    if (isTauri && invoke) {
      return await invoke("get_marketplace_catalog");
    }
    return [
      {
        id: "chrome-devtools-plugin",
        name: "Chrome DevTools Plugin",
        extension_type: "plugin",
        description: "Full Chrome DevTools integration with DOM inspection, console logs, network tracing, and a11y auditing.",
        source_url: "https://github.com/anthropics/claude-plugins",
        marketplace_id: "claude-plugins-official",
        version: "2.1.0",
        author: "Anthropic & Community",
        tags: ["devtools", "chrome", "plugin", "mcp"],
        is_installed: true,
      },
      {
        id: "frontend-design",
        name: "Frontend Design Heuristics",
        extension_type: "skill",
        description: "Distinctive, production-grade visual design and UI heuristics avoiding generic AI aesthetics.",
        source_url: "https://github.com/vercel-labs/skills/tree/main/skills/frontend-design",
        marketplace_id: "agent-skills",
        version: "1.4.0",
        author: "Vercel Labs",
        tags: ["frontend", "design", "css", "skill"],
        is_installed: true,
      },
      {
        id: "ui-ux-pro-max",
        name: "UI/UX Pro Max Intelligence",
        extension_type: "skill",
        description: "Comprehensive UI intelligence with 50 styles, 21 color palettes, typography tokens, and responsive layouts.",
        source_url: "https://github.com/vercel-labs/skills/tree/main/skills/ui-ux-pro-max",
        marketplace_id: "agent-skills",
        version: "3.0.0",
        author: "One Ring",
        tags: ["ui", "ux", "tokens", "design"],
        is_installed: true,
      },
      {
        id: "ponytail-audit",
        name: "Ponytail Code Audit",
        extension_type: "skill",
        description: "Deep codebase complexity auditor that detects speculative abstractions, dead code, and over-engineering.",
        source_url: "https://github.com/google-gemini/antigravity-plugins/tree/main/skills/ponytail-audit",
        marketplace_id: "gemini-plugins",
        version: "1.1.2",
        author: "Antigravity Core",
        tags: ["audit", "refactor", "clean-code"],
        is_installed: true,
      },
      {
        id: "github-pr-reviewer",
        name: "GitHub PR Reviewer Agent",
        extension_type: "agent",
        description: "Autonomous code review agent providing structured architectural feedback, diff analysis, and security reviews.",
        source_url: "https://github.com/anthropics/claude-plugins/tree/main/agents/github-pr-reviewer",
        marketplace_id: "claude-plugins-official",
        version: "1.0.4",
        author: "Anthropic",
        tags: ["github", "code-review", "agent"],
        is_installed: false,
      },
      {
        id: "sql-optimizer",
        name: "SQL & Query Optimizer",
        extension_type: "skill",
        description: "PostgreSQL, MySQL, and SQLite query planner analyzer with index optimization and performance benchmarks.",
        source_url: "https://github.com/vercel-labs/skills/tree/main/skills/sql-optimizer",
        marketplace_id: "agent-skills",
        version: "2.0.1",
        author: "Data Systems Group",
        tags: ["sql", "database", "performance"],
        is_installed: false,
      },
      {
        id: "react-19-standards",
        name: "React 19 & Next.js Standards",
        extension_type: "rule",
        description: "Strict Cursor/Claude rule set for modern React 19 Server Components, actions, and Suspense patterns.",
        source_url: "https://github.com/vercel-labs/skills/tree/main/rules/react-19",
        marketplace_id: "agent-skills",
        version: "2.0.0",
        author: "React Core",
        tags: ["react", "nextjs", "rule"],
        is_installed: false,
      },
      {
        id: "slash-generate-tests",
        name: "Slash Command: /generate-tests",
        extension_type: "command",
        description: "Universal slash command for generating unit and integration test suites with edge case coverage.",
        source_url: "https://github.com/anthropics/claude-plugins/tree/main/commands/generate-tests",
        marketplace_id: "claude-plugins-official",
        version: "1.2.0",
        author: "Testing WG",
        tags: ["command", "testing", "vitest", "jest"],
        is_installed: false,
      },
      {
        id: "firebase",
        name: "Firebase Suite Connector",
        extension_type: "plugin",
        description: "Google Cloud & Firebase MCP integration for auth, firestore, and cloud functions.",
        source_url: "https://github.com/google-gemini/antigravity-plugins/tree/main/plugins/firebase",
        marketplace_id: "gemini-plugins",
        version: "1.0.0",
        author: "Google Cloud",
        tags: ["firebase", "gcp", "plugin"],
        is_installed: false,
      },
    ];
  },

  async installMarketplaceItem(itemId, marketplaceId, extType = "plugin") {
    if (isTauri && invoke) {
      return await invoke("install_marketplace_item", { itemId, marketplaceId, extType });
    }
  },

  async runDoctorDiagnostics() {
    if (isTauri && invoke) {
      return await invoke("run_doctor_diagnostics");
    }
    return [];
  },

  async fixDoctorIssue(targetPath, issueType, extType, vaultPath = null, itemName = null) {
    if (isTauri && invoke) {
      return await invoke("fix_doctor_issue", { targetPath, issueType, extType, vaultPath, itemName });
    }
  },

  async adoptAllUnmanagedSkills() {
    if (isTauri && invoke) {
      return await invoke("adopt_all_unmanaged_skills");
    }
    return 0;
  },

  async getSystemStats() {
    if (isTauri && invoke) {
      return await invoke("get_system_stats");
    }
    return {
      total_vault_items: 2,
      total_vault_skills: 1,
      total_vault_agents: 0,
      total_vault_plugins: 1,
      total_vault_commands: 0,
      total_vault_rules: 0,
      active_global_links: 4,
      active_project_links: 1,
      detected_agents: 5,
      doctor_issues_count: 0,
      doctor_broken_count: 0,
      doctor_unmanaged_count: 0,
      trash_count: 0
    };
  },

  async openInFinder(path) {
    if (isTauri && invoke) {
      return await invoke("open_path_in_finder", { path });
    }
    console.log("Open in Finder:", path);
  },

  async selectFolderDialog() {
    if (isTauri && invoke) {
      return await invoke("select_folder_dialog");
    }
    return null;
  },

  async removeItemFromProject(projectPath, extType, itemId, agentId = "agents") {
    if (isTauri && invoke) {
      return await invoke("remove_item_from_project", { projectPath, extType, itemId, agentId });
    }
  },

  async syncAllVaultManifests() {
    if (isTauri && invoke) {
      return await invoke("sync_all_vault_manifests");
    }
    return 14;
  }
};
