use crate::models::{AgentTarget, ExtensionType};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

pub fn get_home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
}

pub fn get_vault_root_dir() -> PathBuf {
    get_home_dir().join(".one-ring").join("vault")
}

pub fn get_vault_dir(ext_type: &ExtensionType) -> PathBuf {
    get_vault_root_dir().join(ext_type.folder_name())
}

pub fn get_projects_file() -> PathBuf {
    get_home_dir().join(".one-ring").join("projects.json")
}

pub fn get_known_targets() -> Vec<AgentTarget> {
    let home = get_home_dir();

    let mut claude_globals = HashMap::new();
    let mut claude_locals = HashMap::new();
    claude_globals.insert("skill".to_string(), home.join(".claude").join("skills").to_string_lossy().to_string());
    claude_globals.insert("agent".to_string(), home.join(".claude").join("agents").to_string_lossy().to_string());
    claude_globals.insert("plugin".to_string(), home.join(".claude").join("plugins").to_string_lossy().to_string());
    claude_globals.insert("command".to_string(), home.join(".claude").join("commands").to_string_lossy().to_string());
    claude_globals.insert("rule".to_string(), home.join(".claude").join("rules").to_string_lossy().to_string());
    claude_locals.insert("skill".to_string(), ".claude/skills".to_string());
    claude_locals.insert("agent".to_string(), ".claude/agents".to_string());
    claude_locals.insert("plugin".to_string(), ".claude/plugins".to_string());
    claude_locals.insert("command".to_string(), ".claude/commands".to_string());
    claude_locals.insert("rule".to_string(), ".claude/rules".to_string());

    let mut gemini_globals = HashMap::new();
    let mut gemini_locals = HashMap::new();
    gemini_globals.insert("plugin".to_string(), home.join(".gemini").join("config").join("plugins").to_string_lossy().to_string());
    gemini_globals.insert("skill".to_string(), home.join(".gemini").join("config").join("skills").to_string_lossy().to_string());
    gemini_globals.insert("rule".to_string(), home.join(".gemini").join("config").join("rules").to_string_lossy().to_string());
    gemini_globals.insert("command".to_string(), home.join(".gemini").join("config").join("commands").to_string_lossy().to_string());
    gemini_globals.insert("agent".to_string(), home.join(".gemini").join("config").join("agents").to_string_lossy().to_string());
    gemini_locals.insert("plugin".to_string(), ".agents/plugins".to_string());
    gemini_locals.insert("skill".to_string(), ".agents/skills".to_string());
    gemini_locals.insert("rule".to_string(), ".agents/rules".to_string());
    gemini_locals.insert("command".to_string(), ".agents/commands".to_string());
    gemini_locals.insert("agent".to_string(), ".agents/agents".to_string());

    let mut agents_globals = HashMap::new();
    let mut agents_locals = HashMap::new();
    agents_globals.insert("skill".to_string(), home.join(".agents").join("skills").to_string_lossy().to_string());
    agents_globals.insert("command".to_string(), home.join(".agents").join("commands").to_string_lossy().to_string());
    agents_globals.insert("agent".to_string(), home.join(".agents").join("agents").to_string_lossy().to_string());
    agents_globals.insert("plugin".to_string(), home.join(".agents").join("plugins").to_string_lossy().to_string());
    agents_globals.insert("rule".to_string(), home.join(".agents").join("rules").to_string_lossy().to_string());
    agents_locals.insert("skill".to_string(), ".agents/skills".to_string());
    agents_locals.insert("command".to_string(), ".agents/commands".to_string());
    agents_locals.insert("agent".to_string(), ".agents/agents".to_string());
    agents_locals.insert("plugin".to_string(), ".agents/plugins".to_string());
    agents_locals.insert("rule".to_string(), ".agents/rules".to_string());

    let mut codex_globals = HashMap::new();
    let mut codex_locals = HashMap::new();
    codex_globals.insert("skill".to_string(), home.join(".codex").join("skills").to_string_lossy().to_string());
    codex_locals.insert("skill".to_string(), ".codex/skills".to_string());

    let mut cursor_globals = HashMap::new();
    let mut cursor_locals = HashMap::new();
    cursor_globals.insert("rule".to_string(), home.join(".cursor").join("rules").to_string_lossy().to_string());
    cursor_globals.insert("skill".to_string(), home.join(".cursor").join("skills").to_string_lossy().to_string());
    cursor_locals.insert("rule".to_string(), ".cursor/rules".to_string());
    cursor_locals.insert("skill".to_string(), ".cursor/skills".to_string());

    vec![
        AgentTarget {
            id: "claude".to_string(),
            name: "Claude Code".to_string(),
            icon: "claude".to_string(),
            description: "Anthropic Claude Code CLI & Desktop".to_string(),
            is_installed: home.join(".claude").exists(),
            supported_types: vec![
                ExtensionType::Skill,
                ExtensionType::Agent,
                ExtensionType::Plugin,
                ExtensionType::Command,
                ExtensionType::Rule,
            ],
            type_global_dirs: claude_globals,
            type_local_dirs: claude_locals,
        },
        AgentTarget {
            id: "gemini".to_string(),
            name: "Antigravity / Gemini".to_string(),
            icon: "gemini".to_string(),
            description: "Google Antigravity & Gemini CLI Assistant".to_string(),
            is_installed: home.join(".gemini").exists(),
            supported_types: vec![
                ExtensionType::Plugin,
                ExtensionType::Skill,
                ExtensionType::Rule,
                ExtensionType::Command,
                ExtensionType::Agent,
            ],
            type_global_dirs: gemini_globals,
            type_local_dirs: gemini_locals,
        },
        AgentTarget {
            id: "agents".to_string(),
            name: "Standard (.agents)".to_string(),
            icon: "bot".to_string(),
            description: "Universal Agent Specification Standard".to_string(),
            is_installed: home.join(".agents").exists(),
            supported_types: vec![
                ExtensionType::Skill,
                ExtensionType::Agent,
                ExtensionType::Plugin,
                ExtensionType::Command,
                ExtensionType::Rule,
            ],
            type_global_dirs: agents_globals,
            type_local_dirs: agents_locals,
        },
        AgentTarget {
            id: "cursor".to_string(),
            name: "Cursor".to_string(),
            icon: "code".to_string(),
            description: "Cursor AI Rules & Extensions".to_string(),
            is_installed: home.join(".cursor").exists(),
            supported_types: vec![
                ExtensionType::Rule,
                ExtensionType::Skill,
            ],
            type_global_dirs: cursor_globals,
            type_local_dirs: cursor_locals,
        },
        AgentTarget {
            id: "codex".to_string(),
            name: "Codex".to_string(),
            icon: "terminal".to_string(),
            description: "OpenAI Codex CLI Agent".to_string(),
            is_installed: home.join(".codex").exists(),
            supported_types: vec![
                ExtensionType::Skill,
            ],
            type_global_dirs: codex_globals,
            type_local_dirs: codex_locals,
        },
    ]
}

pub fn get_target_by_id(id: &str) -> Option<AgentTarget> {
    get_known_targets().into_iter().find(|t| t.id == id)
}

pub fn resolve_project_target_dir(project_path: &Path, target: &AgentTarget, ext_type: &ExtensionType) -> Option<PathBuf> {
    target
        .type_local_dirs
        .get(ext_type.as_str())
        .map(|rel| project_path.join(rel))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_targets_count_and_ids() {
        let targets = get_known_targets();
        assert_eq!(targets.len(), 5);

        let ids: Vec<String> = targets.iter().map(|t| t.id.clone()).collect();
        assert!(ids.contains(&"claude".to_string()));
        assert!(ids.contains(&"gemini".to_string()));
        assert!(ids.contains(&"agents".to_string()));
        assert!(ids.contains(&"cursor".to_string()));
        assert!(ids.contains(&"codex".to_string()));
    }

    #[test]
    fn test_get_target_by_id() {
        let claude = get_target_by_id("claude");
        assert!(claude.is_some());
        assert_eq!(claude.unwrap().name, "Claude Code");

        let unknown = get_target_by_id("nonexistent");
        assert!(unknown.is_none());
    }

    #[test]
    fn test_resolve_project_target_dir() {
        let agents_target = get_target_by_id("agents").unwrap();
        let project = PathBuf::from("/tmp/my-project");

        let skill_dir = resolve_project_target_dir(&project, &agents_target, &ExtensionType::Skill);
        assert_eq!(skill_dir, Some(PathBuf::from("/tmp/my-project/.agents/skills")));

        let plugin_dir = resolve_project_target_dir(&project, &agents_target, &ExtensionType::Plugin);
        assert_eq!(plugin_dir, Some(PathBuf::from("/tmp/my-project/.agents/plugins")));
    }
}

