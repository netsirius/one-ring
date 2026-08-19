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
    // Fallback simulation
    return [
      {
        id: "frontend-design",
        name: "frontend-design",
        extension_type: "skill",
        description: "Guidance for distinctive, intentional visual design when building new UI.",
        path: "~/.one-ring/vault/skills/frontend-design",
        tags: ["skill", "frontend", "design"],
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
        description: "Comprehensive Chrome DevTools debugging, inspection, and memory profiling suite.",
        path: "~/.one-ring/vault/plugins/chrome-devtools-plugin",
        tags: ["plugin", "devtools", "chrome"],
        is_directory: true,
        has_doc: true,
        global_status: {
          claude: "unlinked",
          gemini: "linked",
          agents: "unlinked",
          cursor: "incompatible",
          codex: "incompatible"
        },
        supported_agents: ["claude", "gemini", "agents"]
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
  }
};
