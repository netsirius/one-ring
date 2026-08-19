# One Ring — Agent Guidelines & System Architecture

## Overview
**One Ring** is a unified desktop control panel (Tauri v2 + React 19 + Vite) for managing AI agent skills, plugins, custom agents, CLI commands, and prompt rules across multiple AI coding environments (Anthropic Claude Code, Google Antigravity / Gemini CLI, Universal `.agents`, Cursor AI, OpenAI Codex, etc.).

All code, styling, and UI contributions to this repository must follow the architectural principles and design directives outlined below.

---

## Design System Directives (Referencing `DESIGN.md`)

All UI development follows the **xAI-inspired engineered cosmic design language**:

### 1. Canvas & Surface Hierarchy
- **Canvas Root**: `#0a0a0a` (`var(--bg-app)`) — near-black dark canvas edge-to-edge.
- **Card / Panel Surfaces**: `#191919` (`var(--bg-card)`) or `#14161a` with 1px solid hairline border `#212327` (`var(--border-subtle)`).
- **Interactive Pill Backgrounds**: `#0a0a0a` or `#1a1c20` with translucent white border `rgba(255, 255, 255, 0.2)`.
- **Zero Drop Shadows**: Elevation is communicated through hairline borders and subtle surface contrast rather than blurred drop-shadows.

### 2. Typography Rules
- **Display & Headings**: Inter / System sans weight 400 with tight negative tracking (`letter-spacing: -0.03em` to `-0.05em`).
- **Eyebrows & Technical Badges**: JetBrains Mono uppercase with positive tracking (`letter-spacing: 1.2px` to `1.4px`).
- **Body & Secondary Copy**: Inter weight 400 (`#dadbdf`) for high readability.
- **No Heavy Bold Weight Overuse**: Keep weights lean (400–500) to maintain the engineered, unmarketed aesthetic.

### 3. Shapes & Interactive Controls
- **Buttons & Chips**: Always rounded pills (`border-radius: 9999px`) with translucent hairline borders.
- **Cards & Dialogs**: Tight 8px rounded corners (`border-radius: 8px`).
- **Switches & Indicators**: Minimalist pill toggles with smooth transition.

---

## Codebase Architecture

### Frontend (`src/`)
- `src/App.jsx`: Main application orchestrator managing global state, active tabs, and toast feedback.
- `src/index.css`: Global design tokens derived from `DESIGN.md`.
- `src/components/Header.jsx`: Minimalist header with status pills, `⌘K` search bar, and actions.
- `src/components/ViewNav.jsx`: Segmented pill navigation between Vault, Global Switchboard, Project Workspaces, and Symlink Doctor.
- `src/components/VaultView.jsx`: Vault library with Grid & Dense Table views, type filter chips, and interactive agent switches.
- `src/components/GlobalSwitchboard.jsx`: Matrix switchboard for cross-agent compatibility and bulk symlink management.
- `src/components/ProjectMatrixView.jsx`: Workspace selector and local `.agents/` matrix management.
- `src/components/DoctorView.jsx`: Diagnostic health dashboard for repairing broken symlinks and adopting unmanaged copies.
- `src/components/SkillDrawer.jsx`: Slide-over documentation and raw source code inspector.
- `src/components/AddSkillModal.jsx`: Modal for URL imports, custom extension authoring, and preset templates.
- `src/services/api.js`: Tauri IPC bridge with browser fallback simulation.

### Backend (`src-tauri/`)
- `src-tauri/src/models.rs`: Core Rust types (`ExtensionType`, `VaultItem`, `AgentTarget`, `ProjectWorkspace`, `DoctorIssue`, `SystemStats`).
- `src-tauri/src/vault.rs`: Vault storage management under `~/.one-ring/vault/`.
- `src-tauri/src/symlink.rs`: Cross-platform OS-level symlink creation, removal, and health validation.
- `src-tauri/src/adapters.rs`: Agent directory discovery and configuration adapters.
- `src-tauri/src/projects.rs`: Workspace project registry persistence (`~/.one-ring/projects.json`).
- `src-tauri/src/doctor.rs`: Deep diagnostics scanner.

---

## Development Workflow
- **Desktop Dev Server**: `npm run desktop` (Runs `tauri dev`)
- **Web Preview**: `npm run dev` (Runs Vite at `http://localhost:5173`)
- **Build Verification**: `npm run build`
