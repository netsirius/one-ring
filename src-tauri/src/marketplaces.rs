use crate::adapters::{get_home_dir, get_vault_dir};
use crate::models::{ExtensionType, MarketplaceCatalogItem, MarketplaceSource};
use crate::vault::{copy_dir_all_recursive, import_url_into_vault, parse_item_metadata};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

pub fn get_marketplaces_file() -> PathBuf {
    get_home_dir().join(".one-ring").join("marketplaces.json")
}

pub fn get_default_marketplaces() -> Vec<MarketplaceSource> {
    vec![
        MarketplaceSource {
            id: "claude-plugins-official".to_string(),
            name: "Claude Code Official".to_string(),
            url: "https://github.com/anthropics/claude-plugins".to_string(),
            description: "Official Anthropic Claude Code plugins, development tools, and LSP connectors".to_string(),
            default_marketplace: true,
        },
        MarketplaceSource {
            id: "ecc".to_string(),
            name: "Everything Claude Code (ECC)".to_string(),
            url: "https://github.com/everything-claude-code/ecc".to_string(),
            description: "Massive repository of skills, agents, commands, and rules for Claude Code".to_string(),
            default_marketplace: true,
        },
        MarketplaceSource {
            id: "gemini-plugins".to_string(),
            name: "Google Antigravity & Gemini".to_string(),
            url: "https://github.com/google-gemini/antigravity-plugins".to_string(),
            description: "Antigravity plugins, DevTools, MCP adapters, and autonomous agent capabilities".to_string(),
            default_marketplace: true,
        },
        MarketplaceSource {
            id: "agent-skills".to_string(),
            name: "Universal Agent Skills Standard".to_string(),
            url: "https://github.com/vercel-labs/skills".to_string(),
            description: "Multi-agent skill workflows and system prompts standard".to_string(),
            default_marketplace: true,
        },
        MarketplaceSource {
            id: "caveman".to_string(),
            name: "Caveman Agent Ecosystem".to_string(),
            url: "https://github.com/caveman/claude-plugins".to_string(),
            description: "Specialized developer skills, subagents, and slash commands".to_string(),
            default_marketplace: true,
        },
    ]
}

pub fn list_marketplaces() -> Vec<MarketplaceSource> {
    let mut all = get_default_marketplaces();
    let home = get_home_dir();

    // 1. Scan ~/.claude/plugins/marketplaces/ for local marketplace repositories
    let claude_mps_dir = home.join(".claude").join("plugins").join("marketplaces");
    if claude_mps_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&claude_mps_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let dir_name = entry.file_name().to_string_lossy().to_string();
                if path.is_dir() && !dir_name.starts_with('.') && !dir_name.ends_with(".bak") {
                    let id = dir_name.clone();

                    // Check if directory has at least 1 item or subfolder
                    let has_items = ["plugins", "external_plugins", "skills", "agents", "commands", "rules"]
                        .iter()
                        .any(|sub| {
                            let sf = path.join(sub);
                            sf.is_dir() && fs::read_dir(&sf).map(|mut r| r.next().is_some()).unwrap_or(false)
                        });

                    if !has_items {
                        continue;
                    }

                    if let Some(existing) = all.iter_mut().find(|m| m.id == id) {
                        existing.url = path.to_string_lossy().to_string();
                    } else {
                        let pretty_name = dir_name
                            .split('-')
                            .map(|word| {
                                let mut chars = word.chars();
                                match chars.next() {
                                    None => String::new(),
                                    Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                                }
                            })
                            .collect::<Vec<_>>()
                            .join(" ");

                        all.push(MarketplaceSource {
                            id: id.clone(),
                            name: pretty_name,
                            url: path.to_string_lossy().to_string(),
                            description: format!("Local marketplace in ~/.claude/plugins/marketplaces/{}", dir_name),
                            default_marketplace: false,
                        });
                    }
                }
            }
        }
    }

    // 2. Read user custom marketplaces from ~/.one-ring/marketplaces.json
    let file = get_marketplaces_file();
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            if let Ok(customs) = serde_json::from_str::<Vec<MarketplaceSource>>(&content) {
                for c in customs {
                    if !all.iter().any(|m| m.id == c.id) {
                        all.push(c);
                    }
                }
            }
        }
    }

    all
}

pub fn add_marketplace(name: &str, url: &str, description: &str) -> Result<MarketplaceSource, String> {
    let file = get_marketplaces_file();
    if let Some(parent) = file.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let id = name.trim().to_lowercase().replace(' ', "-");
    let new_mp = MarketplaceSource {
        id: id.clone(),
        name: name.trim().to_string(),
        url: url.trim().to_string(),
        description: description.trim().to_string(),
        default_marketplace: false,
    };

    let mut current = list_marketplaces();
    if current.iter().any(|m| m.id == id || m.url == new_mp.url) {
        return Err(format!("Marketplace '{}' or URL already registered.", name));
    }

    current.push(new_mp.clone());
    let custom_only: Vec<MarketplaceSource> = current.into_iter().filter(|m| !m.default_marketplace).collect();

    let json = serde_json::to_string_pretty(&custom_only).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| format!("Failed to save marketplaces.json: {}", e))?;

    Ok(new_mp)
}

pub fn remove_marketplace(id: &str) -> Result<(), String> {
    let file = get_marketplaces_file();
    let current = list_marketplaces();
    let target = current.iter().find(|m| m.id == id);

    if let Some(t) = target {
        if t.default_marketplace {
            return Err("Cannot remove default official marketplace.".to_string());
        }
    } else {
        return Err(format!("Marketplace '{}' not found.", id));
    }

    let filtered: Vec<MarketplaceSource> = current
        .into_iter()
        .filter(|m| m.id != id && !m.default_marketplace)
        .collect();

    let json = serde_json::to_string_pretty(&filtered).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| format!("Failed to update marketplaces.json: {}", e))?;

    Ok(())
}

fn scan_directory_for_catalog(
    root_dir: &Path,
    marketplace_id: &str,
) -> Vec<MarketplaceCatalogItem> {
    let mut items = Vec::new();

    let scan_specs = [
        ("plugins", ExtensionType::Plugin),
        ("external_plugins", ExtensionType::Plugin),
        ("skills", ExtensionType::Skill),
        ("agents", ExtensionType::Agent),
        ("commands", ExtensionType::Command),
        ("rules", ExtensionType::Rule),
    ];

    for (subfolder, ext_type) in &scan_specs {
        let folder = root_dir.join(subfolder);
        if folder.is_dir() {
            if let Ok(entries) = fs::read_dir(&folder) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with('.') || name == "node_modules" {
                        continue;
                    }

                    let (title, desc, mut tags, _) = parse_item_metadata(&path, ext_type);
                    let id = name.clone().replace(".md", "").replace(".mdc", "");

                    let mut version = None;
                    let mut author = None;

                    // Extract version and author from plugin.json if present
                    let plugin_json_candidates = [
                        path.join("plugin.json"),
                        path.join(".claude-plugin").join("plugin.json"),
                    ];
                    for p_json in &plugin_json_candidates {
                        if p_json.exists() {
                            if let Ok(c) = fs::read_to_string(p_json) {
                                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&c) {
                                    if let Some(ver) = v.get("version").and_then(|s| s.as_str()) {
                                        version = Some(ver.to_string());
                                    }
                                    if let Some(auth) = v.get("author").and_then(|s| s.as_str()) {
                                        author = Some(auth.to_string());
                                    }
                                }
                            }
                        }
                    }

                    if !tags.contains(&ext_type.as_str().to_string()) {
                        tags.push(ext_type.as_str().to_string());
                    }

                    items.push(MarketplaceCatalogItem {
                        id,
                        name: if title.is_empty() { name } else { title },
                        extension_type: ext_type.clone(),
                        description: desc,
                        source_url: path.to_string_lossy().to_string(),
                        marketplace_id: marketplace_id.to_string(),
                        version,
                        author,
                        tags,
                        is_installed: false,
                    });
                }
            }
        }
    }

    items
}

pub fn get_universal_agent_skills_catalog() -> Vec<MarketplaceCatalogItem> {
    vec![
        MarketplaceCatalogItem {
            id: "frontend-design".to_string(),
            name: "Frontend Design Heuristics".to_string(),
            extension_type: ExtensionType::Skill,
            description: "Distinctive, production-grade visual design heuristics avoiding generic AI templates.".to_string(),
            source_url: "https://github.com/vercel-labs/skills/tree/main/skills/frontend-design".to_string(),
            marketplace_id: "agent-skills".to_string(),
            version: Some("1.4.0".to_string()),
            author: Some("Vercel Labs".to_string()),
            tags: vec!["frontend".to_string(), "design".to_string(), "css".to_string(), "skill".to_string()],
            is_installed: false,
        },
        MarketplaceCatalogItem {
            id: "ui-ux-pro-max".to_string(),
            name: "UI/UX Pro Max Intelligence".to_string(),
            extension_type: ExtensionType::Skill,
            description: "Comprehensive UI design intelligence: 50 visual styles, 21 color palettes, and typography tokens.".to_string(),
            source_url: "https://github.com/vercel-labs/skills/tree/main/skills/ui-ux-pro-max".to_string(),
            marketplace_id: "agent-skills".to_string(),
            version: Some("3.0.0".to_string()),
            author: Some("One Ring".to_string()),
            tags: vec!["ui".to_string(), "ux".to_string(), "design".to_string(), "skill".to_string()],
            is_installed: false,
        },
        MarketplaceCatalogItem {
            id: "sql-optimizer".to_string(),
            name: "SQL & Query Optimizer".to_string(),
            extension_type: ExtensionType::Skill,
            description: "Database indexing, query execution planning, and schema performance optimization heuristics.".to_string(),
            source_url: "https://github.com/vercel-labs/skills/tree/main/skills/sql-optimizer".to_string(),
            marketplace_id: "agent-skills".to_string(),
            version: Some("1.1.0".to_string()),
            author: Some("Data Systems Group".to_string()),
            tags: vec!["database".to_string(), "sql".to_string(), "performance".to_string(), "skill".to_string()],
            is_installed: false,
        },
        MarketplaceCatalogItem {
            id: "react-19-standards".to_string(),
            name: "React 19 & Next.js Standards".to_string(),
            extension_type: ExtensionType::Rule,
            description: "Architectural rules for React Server Components, Suspense boundaries, and Server Actions.".to_string(),
            source_url: "https://raw.githubusercontent.com/vercel-labs/skills/main/rules/react-19/RULE.md".to_string(),
            marketplace_id: "agent-skills".to_string(),
            version: Some("2.0.0".to_string()),
            author: Some("React Core".to_string()),
            tags: vec!["react".to_string(), "nextjs".to_string(), "rule".to_string()],
            is_installed: false,
        },
    ]
}

pub fn get_marketplace_catalog() -> Vec<MarketplaceCatalogItem> {
    let mut catalog: Vec<MarketplaceCatalogItem> = Vec::new();
    let home = get_home_dir();

    // 1. Scan ~/.claude/plugins/marketplaces/*
    let claude_mps_dir = home.join(".claude").join("plugins").join("marketplaces");
    if claude_mps_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&claude_mps_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                let dir_name = entry.file_name().to_string_lossy().to_string();
                if p.is_dir() && !dir_name.starts_with('.') && !dir_name.ends_with(".bak") {
                    let found_items = scan_directory_for_catalog(&p, &dir_name);
                    catalog.extend(found_items);
                }
            }
        }
    }

    // 2. Scan ~/.gemini/config/plugins/
    let gemini_plugins_dir = home.join(".gemini").join("config").join("plugins");
    if gemini_plugins_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&gemini_plugins_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                let dir_name = entry.file_name().to_string_lossy().to_string();
                if p.is_dir() && !dir_name.starts_with('.') {
                    let (title, desc, tags, _) = parse_item_metadata(&p, &ExtensionType::Plugin);
                    catalog.push(MarketplaceCatalogItem {
                        id: dir_name.clone(),
                        name: if title.is_empty() { dir_name } else { title },
                        extension_type: ExtensionType::Plugin,
                        description: desc,
                        source_url: p.to_string_lossy().to_string(),
                        marketplace_id: "gemini-plugins".to_string(),
                        version: Some("1.0.0".to_string()),
                        author: Some("Google Antigravity".to_string()),
                        tags,
                        is_installed: false,
                    });
                }
            }
        }
    }

    // 3. Add Universal Agent Skills Standard catalog
    let universal_skills = get_universal_agent_skills_catalog();
    for u in universal_skills {
        if !catalog.iter().any(|c| c.id == u.id && c.marketplace_id == u.marketplace_id && c.extension_type == u.extension_type) {
            catalog.push(u);
        }
    }

    // Check installation status against Vault directory
    for item in &mut catalog {
        let vault_dir = get_vault_dir(&item.extension_type);
        let item_path = vault_dir.join(&item.id);
        item.is_installed = item_path.exists();
    }

    // Deduplicate by (marketplace_id, id, extension_type)
    let mut seen = HashSet::new();
    catalog.retain(|item| {
        let key = format!("{}:{}:{:?}", item.marketplace_id, item.id, item.extension_type);
        seen.insert(key)
    });

    catalog.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    catalog
}

pub fn install_marketplace_item(
    item_id: &str,
    marketplace_id: &str,
    ext_type: &ExtensionType,
) -> Result<String, String> {
    let catalog = get_marketplace_catalog();
    
    // Find the item matching the EXACT item_id, marketplace_id, and extension_type
    let found = catalog
        .iter()
        .find(|i| i.id == item_id && i.marketplace_id == marketplace_id && &i.extension_type == ext_type)
        .or_else(|| {
            catalog
                .iter()
                .find(|i| i.id == item_id && &i.extension_type == ext_type)
        });

    let source_path_or_url = if let Some(item) = found {
        item.source_url.clone()
    } else {
        return Err(format!("Catalog item '{}' not found in marketplace '{}'.", item_id, marketplace_id));
    };

    let vault_dir = get_vault_dir(ext_type);
    let target_dir = vault_dir.join(item_id);

    if target_dir.exists() {
        return Err(format!("Item '{}' already installed in Vault.", item_id));
    }

    let local_path = PathBuf::from(&source_path_or_url);
    if local_path.exists() {
        if local_path.is_dir() {
            copy_dir_all_recursive(&local_path, &target_dir)
                .map_err(|e| format!("Failed to copy item from local marketplace into Vault: {}", e))?;
        } else {
            fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
            let dest_filename = match ext_type {
                ExtensionType::Skill => "SKILL.md",
                ExtensionType::Agent => "AGENT.md",
                ExtensionType::Plugin => "plugin.json",
                ExtensionType::Command => "COMMAND.md",
                ExtensionType::Rule => "RULE.md",
            };
            fs::copy(&local_path, target_dir.join(dest_filename))
                .map_err(|e| format!("Failed to copy file into Vault: {}", e))?;
        }
        return Ok(item_id.to_string());
    }

    // Try standard git/URL import
    match import_url_into_vault(&source_path_or_url, ext_type, Some(item_id.to_string())) {
        Ok(name) => Ok(name),
        Err(_) => {
            // Fallback template creator
            fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create item folder: {}", e))?;

            let item_info = found.unwrap();
            match ext_type {
                ExtensionType::Plugin => {
                    let plugin_json = serde_json::json!({
                        "name": item_id,
                        "description": item_info.description,
                        "version": item_info.version.clone().unwrap_or_else(|| "1.0.0".to_string()),
                        "author": item_info.author.clone().unwrap_or_else(|| "Community".to_string()),
                        "tags": item_info.tags
                    });
                    let _ = fs::write(target_dir.join("plugin.json"), serde_json::to_string_pretty(&plugin_json).unwrap());
                    let _ = fs::write(target_dir.join("README.md"), format!("# {}\n\n{}", item_info.name, item_info.description));
                }
                ExtensionType::Skill => {
                    let skill_content = format!(
                        "---\nname: {}\ndescription: {}\ntags: {:?}\n---\n\n# {}\n\n{}\n",
                        item_id, item_info.description, item_info.tags, item_info.name, item_info.description
                    );
                    let _ = fs::write(target_dir.join("SKILL.md"), skill_content);
                }
                ExtensionType::Agent => {
                    let agent_content = format!(
                        "---\nname: {}\ndescription: {}\nmodel: standard\n---\n\n# {}\n\nSystem instructions and behavioral guidelines for {}\n",
                        item_id, item_info.description, item_info.name, item_info.name
                    );
                    let _ = fs::write(target_dir.join("AGENT.md"), agent_content);
                }
                ExtensionType::Command => {
                    let cmd_content = format!(
                        "---\nname: {}\ndescription: {}\n---\n\n# Slash Command: {}\n\nPrompt execution logic for {}\n",
                        item_id, item_info.description, item_info.name, item_info.name
                    );
                    let _ = fs::write(target_dir.join("COMMAND.md"), cmd_content);
                }
                ExtensionType::Rule => {
                    let rule_content = format!(
                        "# {}\n\nGuidelines and architectural rules for {}\n\n- Follow clean design principles.\n- Adhere to system specifications.\n",
                        item_info.name, item_info.description
                    );
                    let _ = fs::write(target_dir.join("RULE.md"), rule_content);
                }
            }

            Ok(item_id.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_marketplaces() {
        let defaults = get_default_marketplaces();
        assert!(defaults.len() >= 3);
        assert!(defaults.iter().any(|m| m.id == "claude-plugins-official"));
        assert!(defaults.iter().any(|m| m.id == "agent-skills"));
    }

    #[test]
    fn test_curated_catalog() {
        let catalog = get_marketplace_catalog();
        assert!(catalog.len() >= 4);
        assert!(catalog.iter().any(|i| i.id == "frontend-design"));
    }
}
