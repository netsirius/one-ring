# 💍 One Ring

> **One Vault to rule them all**  
> Minimalist & high-performance desktop control panel (Tauri v2 + Rust + React 19) for managing AI agent skills, plugins, custom agents, CLI commands, and prompt rules across multiple AI coding environments.

---

## ✨ Features

- **Central Isolated Vault**: Store your AI skills and extensions safely in `~/.one-ring/vault/skills/` without polluting global directories.
- **Agent-Agnostic Library**: Keep 100+ skills in your library in an inactive state and only activate the ones you need.
- **Global & Project Switchboards**:
  - **Global Agents**: Instant toggles for **Claude Code**, **Antigravity / Gemini**, **Codex**, **Cursor**, and **Standard Agents (.agents)**.
  - **Project Workspaces**: Pick any project repository and toggle skills on/off specifically for that project with zero duplication.
- **Pure Symbolic Links**: No file copying, no syncing out-of-date versions. Modifications in the Vault instantly reflect everywhere.
- **1-Click Auto-Adopt**: Detects existing skills in `~/.agents`, `~/.claude`, or `~/.gemini` and converts them into managed Vault symlinks with one click.
- **SKILL.md Markdown Inspector**: Slide-over preview with rendered markdown, tags, and quick Finder reveal.
- **Symlink Health Doctor**: Live scanner for broken links, missing targets, or unmanaged copies with 1-click repair.

---

## 🚀 Quick Start

### 1. Launch the Desktop Application
```bash
npm run desktop
# or
npm run tauri dev
```

### 2. Run Web Preview in Browser
```bash
npm run dev
```

### 3. Build Native macOS App (`One Ring.app`)
```bash
npm run tauri build
```
The compiled binary will be located in `src-tauri/target/release/bundle/macos/One Ring.app`.

---

## 🏛️ Architecture

```
                       ┌───────────────────────────────┐
                       │      THE CENTRAL VAULT        │
                       │    (~/.one-ring/vault/)       │
                       │   Skills • Agents • Plugins   │
                       └───────────────┬───────────────┘
                                       │ (OS Symlinks)
           ┌───────────────────────────┴───────────────────────────┐
           ▼                                                       ▼
   GLOBAL AGENTS                                           PROJECT WORKSPACES
   • Claude Code (~/.claude/skills)                        • /path/to/project/.agents/skills
   • Antigravity / Gemini (~/.gemini/config/skills)        • /path/to/project/.claude/skills
   • Codex (~/.codex/skills)                               • /path/to/project/.cursor/rules
   • Standard Agents (~/.agents/skills)
   • Cursor (~/.cursor/rules)
```

- **Backend (`src-tauri/`)**: Pure Rust with `dirs`, `walkdir`, and `std::os::unix::fs::symlink`.
- **Communication**: 100% in-memory native IPC (`tauri::command` / `invoke`), zero HTTP ports occupied.
- **Frontend (`src/`)**: React + Vite + Obsidian Dark Theme design system.
