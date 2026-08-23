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

pub fn get_claude_settings_file(project_path: Option<&Path>) -> PathBuf {
    match project_path {
        Some(p) => p.join(".claude").join("settings.json"),
        None => get_home_dir().join(".claude").join("settings.json"),
    }
}

pub fn get_claude_known_marketplaces_file() -> PathBuf {
    get_home_dir().join(".claude").join("plugins").join("known_marketplaces.json")
}

pub fn get_claude_installed_plugins_file() -> PathBuf {
    get_home_dir().join(".claude").join("plugins").join("installed_plugins.json")
}

pub fn is_claude_plugin_enabled(plugin_id: &str, project_path: Option<&Path>) -> bool {
    let installed_file = get_claude_installed_plugins_file();
    if installed_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&installed_file) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                let scoped_key = format!("{}@one-ring-vault", plugin_id);
                if let Some(plugins_obj) = v.get("plugins").and_then(|p| p.as_object()) {
                    let list = plugins_obj.get(&scoped_key).or_else(|| plugins_obj.get(plugin_id));
                    if let Some(arr) = list.and_then(|l| l.as_array()) {
                        let is_installed = arr.iter().any(|item| {
                            if let Some(scope) = item.get("scope").and_then(|s| s.as_str()) {
                                if let Some(proj) = project_path {
                                    if scope == "project" {
                                        if let Some(pp) = item.get("projectPath").and_then(|p| p.as_str()) {
                                            let pp_buf = PathBuf::from(pp);
                                            let proj_buf = proj.to_path_buf();
                                            return pp_buf == proj_buf
                                                || std::fs::canonicalize(&pp_buf).ok() == std::fs::canonicalize(&proj_buf).ok();
                                        }
                                    }
                                } else {
                                    return scope == "user";
                                }
                            }
                            false
                        });

                        if is_installed {
                            let settings_file = get_claude_settings_file(project_path);
                            if settings_file.exists() {
                                if let Ok(s_content) = std::fs::read_to_string(&settings_file) {
                                    if let Ok(sv) = serde_json::from_str::<serde_json::Value>(&s_content) {
                                        if let Some(en_obj) = sv.get("enabledPlugins").and_then(|e| e.as_object()) {
                                            if en_obj.get(&scoped_key).and_then(|b| b.as_bool()) == Some(false)
                                                || en_obj.get(plugin_id).and_then(|b| b.as_bool()) == Some(false)
                                            {
                                                return false;
                                            }
                                        }
                                    }
                                }
                            }
                            return true;
                        }
                    }
                }
            }
        }
    }

    let settings_file = get_claude_settings_file(project_path);
    if settings_file.exists() && !installed_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&settings_file) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(enabled_obj) = v.get("enabledPlugins").and_then(|e| e.as_object()) {
                    let scoped_key = format!("{}@one-ring-vault", plugin_id);
                    if enabled_obj.get(&scoped_key).and_then(|b| b.as_bool()) == Some(true) {
                        return true;
                    }
                    if enabled_obj.get(plugin_id).and_then(|b| b.as_bool()) == Some(true) {
                        return true;
                    }
                }
            }
        }
    }

    false
}

pub fn set_claude_plugin_enabled(plugin_id: &str, project_path: Option<&Path>, enabled: bool) -> Result<(), String> {
    let scope_val = if project_path.is_some() { "project" } else { "user" };
    let plugin_spec = format!("{}@one-ring-vault", plugin_id);
    let action = if enabled { "install" } else { "uninstall" };

    // 1. Try running claude CLI if installed in system
    let mut cmd = std::process::Command::new("claude");
    cmd.args(["plugin", action, &plugin_spec, "--scope", scope_val]);
    if let Some(p) = project_path {
        cmd.current_dir(p);
    }
    let _ = cmd.output();

    // 2. Ensure settings.json extraKnownMarketplaces and enabledPlugins are in sync
    let settings_file = get_claude_settings_file(project_path);
    if let Some(parent) = settings_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut root_val: serde_json::Value = if settings_file.exists() {
        let content = std::fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read Claude settings.json: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    if !root_val.is_object() {
        root_val = serde_json::json!({});
    }

    let root_obj = root_val.as_object_mut().unwrap();

    let vault_root = get_vault_root_dir();
    let mp_entry = serde_json::json!({
        "source": {
            "source": "directory",
            "path": vault_root.to_string_lossy().to_string()
        }
    });

    if !root_obj.contains_key("extraKnownMarketplaces") || !root_obj["extraKnownMarketplaces"].is_object() {
        root_obj.insert("extraKnownMarketplaces".to_string(), serde_json::json!({}));
    }
    if let Some(mp_obj) = root_obj.get_mut("extraKnownMarketplaces").and_then(|v| v.as_object_mut()) {
        mp_obj.insert("one-ring-vault".to_string(), mp_entry);
    }

    if !root_obj.contains_key("enabledPlugins") || !root_obj["enabledPlugins"].is_object() {
        root_obj.insert("enabledPlugins".to_string(), serde_json::json!({}));
    }

    if let Some(enabled_obj) = root_obj.get_mut("enabledPlugins").and_then(|v| v.as_object_mut()) {
        if enabled {
            enabled_obj.insert(plugin_spec.clone(), serde_json::Value::Bool(true));
        } else {
            enabled_obj.remove(&plugin_spec);
            enabled_obj.remove(plugin_id);
        }
    }

    let serialized = serde_json::to_string_pretty(&root_val)
        .map_err(|e| format!("Failed to serialize Claude settings: {}", e))?;
    std::fs::write(&settings_file, serialized)
        .map_err(|e| format!("Failed to write Claude settings: {}", e))?;

    // 3. Keep installed_plugins.json and cache in sync
    let installed_file = get_claude_installed_plugins_file();
    if let Some(parent) = installed_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut inst_val: serde_json::Value = if installed_file.exists() {
        let c = std::fs::read_to_string(&installed_file).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str(&c).unwrap_or_else(|_| serde_json::json!({ "version": 2, "plugins": {} }))
    } else {
        serde_json::json!({ "version": 2, "plugins": {} })
    };

    if !inst_val.is_object() {
        inst_val = serde_json::json!({ "version": 2, "plugins": {} });
    }

    let inst_obj = inst_val.as_object_mut().unwrap();
    if !inst_obj.contains_key("plugins") || !inst_obj["plugins"].is_object() {
        inst_obj.insert("plugins".to_string(), serde_json::json!({}));
    }

    let plugins_map = inst_obj.get_mut("plugins").and_then(|p| p.as_object_mut()).unwrap();
    let cache_dir = get_home_dir().join(".claude").join("plugins").join("cache").join("one-ring-vault").join(plugin_id).join("1.0.0");

    if enabled {
        let _ = std::fs::create_dir_all(&cache_dir);
        let vault_plugin_src = vault_root.join("plugins").join(plugin_id);
        if vault_plugin_src.exists() {
            let _ = crate::vault::copy_dir_all_recursive(&vault_plugin_src, &cache_dir);
        }

        let now_iso = "2026-08-23T12:00:00.000Z";
        let mut entry = serde_json::json!({
            "scope": scope_val,
            "installPath": cache_dir.to_string_lossy().to_string(),
            "version": "1.0.0",
            "installedAt": now_iso,
            "lastUpdated": now_iso
        });
        if let Some(p) = project_path {
            let canon = std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf());
            entry.as_object_mut().unwrap().insert("projectPath".to_string(), serde_json::Value::String(canon.to_string_lossy().to_string()));
        }

        let arr = plugins_map.entry(plugin_spec.clone()).or_insert_with(|| serde_json::json!([]));
        if let Some(arr_list) = arr.as_array_mut() {
            arr_list.retain(|item| {
                if let Some(s) = item.get("scope").and_then(|s| s.as_str()) {
                    if s == scope_val {
                        if let Some(p) = project_path {
                            let canon_str = std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf()).to_string_lossy().to_string();
                            if let Some(pp) = item.get("projectPath").and_then(|v| v.as_str()) {
                                return pp != canon_str && pp != p.to_string_lossy();
                            }
                        } else {
                            return false;
                        }
                    }
                }
                true
            });
            arr_list.push(entry);
        }
    } else {
        if let Some(arr) = plugins_map.get_mut(&plugin_spec).and_then(|v| v.as_array_mut()) {
            arr.retain(|item| {
                if let Some(s) = item.get("scope").and_then(|s| s.as_str()) {
                    if s == scope_val {
                        if let Some(p) = project_path {
                            let canon_str = std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf()).to_string_lossy().to_string();
                            if let Some(pp) = item.get("projectPath").and_then(|v| v.as_str()) {
                                return pp != canon_str && pp != p.to_string_lossy();
                            }
                        } else {
                            return false;
                        }
                    }
                }
                true
            });
        }
        if let Some(arr) = plugins_map.get_mut(plugin_id).and_then(|v| v.as_array_mut()) {
            arr.retain(|item| {
                if let Some(s) = item.get("scope").and_then(|s| s.as_str()) {
                    if s == scope_val {
                        if let Some(p) = project_path {
                            let canon_str = std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf()).to_string_lossy().to_string();
                            if let Some(pp) = item.get("projectPath").and_then(|v| v.as_str()) {
                                return pp != canon_str && pp != p.to_string_lossy();
                            }
                        } else {
                            return false;
                        }
                    }
                }
                true
            });
        }
    }

    if let Ok(s) = serde_json::to_string_pretty(&inst_val) {
        let _ = std::fs::write(&installed_file, s);
    }

    // 4. For global scope, also ensure known_marketplaces.json has one-ring-vault
    if project_path.is_none() {
        let known_mp_file = get_claude_known_marketplaces_file();
        if let Some(parent) = known_mp_file.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let mut known_val: serde_json::Value = if known_mp_file.exists() {
            let c = std::fs::read_to_string(&known_mp_file).unwrap_or_else(|_| "{}".to_string());
            serde_json::from_str(&c).unwrap_or_else(|_| serde_json::json!({}))
        } else {
            serde_json::json!({})
        };
        if let Some(obj) = known_val.as_object_mut() {
            let now_ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs().to_string())
                .unwrap_or_default();

            obj.insert(
                "one-ring-vault".to_string(),
                serde_json::json!({
                    "source": {
                        "source": "directory",
                        "path": vault_root.to_string_lossy().to_string()
                    },
                    "installLocation": vault_root.to_string_lossy().to_string(),
                    "lastUpdated": now_ts
                }),
            );
            if let Ok(s) = serde_json::to_string_pretty(&known_val) {
                let _ = std::fs::write(&known_mp_file, s);
            }
        }
    }

    Ok(())
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

    #[test]
    fn test_claude_settings_plugin_toggle() {
        let temp_proj = std::env::temp_dir().join(format!("one_ring_test_claude_set_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&temp_proj);
        std::fs::create_dir_all(&temp_proj).unwrap();

        assert!(!is_claude_plugin_enabled("code-review", Some(&temp_proj)));

        set_claude_plugin_enabled("code-review", Some(&temp_proj), true).unwrap();
        assert!(is_claude_plugin_enabled("code-review", Some(&temp_proj)));

        set_claude_plugin_enabled("code-review", Some(&temp_proj), false).unwrap();
        assert!(!is_claude_plugin_enabled("code-review", Some(&temp_proj)));

        let _ = std::fs::remove_dir_all(&temp_proj);
    }
}

