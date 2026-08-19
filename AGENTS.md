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
- `src/components/Header.jsx`: Minimalist header with brand identity, global `⌘K` search bar, theme toggle, and CTA.
- `src/components/ViewNav.jsx`: Segmented pill navigation between Vault, Global Switchboard, Workspaces, Doctor, and Trash.
- `src/components/VaultView.jsx`: Vault library with Grid & Dense Table views, type filter chips, and interactive agent switches.
- `src/components/GlobalSwitchboard.jsx`: Matrix switchboard for cross-agent compatibility and bulk symlink management.
- `src/components/ProjectMatrixView.jsx`: Workspace selector and local `.agents/` matrix management with 1-click linking and trash.
- `src/components/DoctorView.jsx`: Diagnostic health dashboard for repairing broken symlinks and adopting unmanaged copies.
- `src/components/TrashView.jsx`: Safe 2-stage quarantine and staging system with 1-click restore and permanent disk purge.
- `src/components/SkillDrawer.jsx`: Slide-over documentation and raw source code inspector.
- `src/components/AddSkillModal.jsx`: Modal for URL / NPX command imports (`npx skills add`), custom authoring, and preset templates.
- `src/services/api.js`: Tauri IPC bridge with rich browser fallback simulation for development.

### Backend (`src-tauri/`)
- `src-tauri/src/models.rs`: Core Rust types (`ExtensionType`, `VaultItem`, `AgentTarget`, `ProjectWorkspace`, `DoctorIssue`, `TrashItem`, `SystemStats`).
- `src-tauri/src/vault.rs`: Vault storage management under `~/.one-ring/vault/`, metadata frontmatter extraction, and NPX command parsing.
- `src-tauri/src/symlink.rs`: Cross-platform OS-level symlink creation, removal, and health validation.
- `src-tauri/src/adapters.rs`: Agent directory discovery and configuration adapters for all 5 targets (Claude, Gemini, Agents, Cursor, Codex).
- `src-tauri/src/projects.rs`: Workspace project registry persistence (`~/.one-ring/projects.json`).
- `src-tauri/src/trash.rs`: Quarantine and staging subsystem (`~/.one-ring/trash/manifest.json`).

---

## Testing & Quality Assurance Rules

All code contributions must adhere to strict testing standards:

### 1. Mandatory Test Suites
- **Backend Tests (Rust)**:
  ```bash
  cd src-tauri && cargo test
  ```
  Every new IPC handler, target resolution helper, symlink state check, metadata parser, and quarantine operation must have unit tests inside `src-tauri/src/`.
- **Frontend Tests (React & IPC Mock)**:
  ```bash
  npm test
  ```
  All views (`VaultView`, `GlobalSwitchboard`, `ProjectMatrixView`, `DoctorView`, `TrashView`) and the API service bridge must have unit tests (`*.test.jsx`, `*.test.js`) powered by Vitest and `@testing-library/react`.

### 2. Pre-Commit Verification Gate
Before committing or pushing any change, execute the complete verification triad:
```bash
cargo test --manifest-path src-tauri/Cargo.toml && npm test && npm run build
```
No PR or commit may be pushed with failing tests or broken production bundles.

---

## Development Workflow
- **Desktop Dev Server**: `npm run desktop` (Runs `tauri dev`)
- **Web Preview**: `npm run dev` (Runs Vite at `http://localhost:5173`)
- **Run Frontend Tests**: `npm test`
- **Run Backend Tests**: `cargo test --manifest-path src-tauri/Cargo.toml`
- **Build Verification**: `npm run build`
