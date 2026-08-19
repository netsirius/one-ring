use crate::adapters::{get_known_targets, get_vault_dir, get_vault_root_dir};
use crate::models::{ExtensionType, LinkStatus, VaultItem};
use crate::symlink::check_link_status;
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn ensure_vault_structure() -> Result<PathBuf, String> {
    let root = get_vault_root_dir();
    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    for t in &types {
        let dir = root.join(t.folder_name());
        let _ = fs::create_dir_all(&dir);
    }

    Ok(root)
}

pub fn list_vault_items() -> Result<Vec<VaultItem>, String> {
    let _ = ensure_vault_structure()?;
    let mut items = Vec::new();
    let targets = get_known_targets();

    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    for ext_type in &types {
        let vault_dir = get_vault_dir(ext_type);

        if let Ok(entries) = fs::read_dir(&vault_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();

                if file_name.starts_with('.') {
                    continue;
                }

                let is_dir = path.is_dir();
                let (name, description, tags, has_doc) = parse_item_metadata(&path, ext_type);

                let mut global_status = HashMap::new();
                let mut supported_agents = Vec::new();

                for target in &targets {
                    let is_supported = target.supported_types.contains(ext_type);

                    if is_supported {
                        supported_agents.push(target.id.clone());

                        if let Some(target_global_dir_str) = target.type_global_dirs.get(ext_type.as_str()) {
                            let target_dest = PathBuf::from(target_global_dir_str).join(&file_name);
                            let status = check_link_status(&path, &target_dest);
                            global_status.insert(target.id.clone(), status);
                        } else {
                            global_status.insert(target.id.clone(), LinkStatus::Incompatible);
                        }
                    } else {
                        global_status.insert(target.id.clone(), LinkStatus::Incompatible);
                    }
                }

                items.push(VaultItem {
                    id: file_name.clone(),
                    name: if name.is_empty() { file_name.clone() } else { name },
                    extension_type: ext_type.clone(),
                    description,
                    path: path.to_string_lossy().to_string(),
                    source: None,
                    tags,
                    is_directory: is_dir,
                    has_doc,
                    global_status,
                    supported_agents,
                });
            }
        }
    }

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

pub fn parse_item_metadata(item_path: &Path, ext_type: &ExtensionType) -> (String, String, Vec<String>, bool) {
    let mut name = String::new();
    let mut description = String::new();
    let mut tags = vec![ext_type.as_str().to_string()];

    // Case 1: Plugin with plugin.json
    if item_path.is_dir() {
        let plugin_json_path = item_path.join("plugin.json");
        if plugin_json_path.exists() {
            if let Ok(content) = fs::read_to_string(&plugin_json_path) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(n) = v.get("name").and_then(|n| n.as_str()) {
                        name = n.to_string();
                    }
                    if let Some(d) = v.get("description").and_then(|d| d.as_str()) {
                        description = d.to_string();
                    }
                }
            }
        }
    }

    // Case 2: Document with SKILL.md or AGENT.md or RULE.md or markdown file
    let doc_file = if item_path.is_dir() {
        let candidates = ["SKILL.md", "AGENT.md", "RULE.md", "README.md"];
        candidates.iter().map(|c| item_path.join(c)).find(|p| p.exists())
    } else {
        Some(item_path.to_path_buf())
    };

    if let Some(doc_path) = doc_file {
        if let Ok(content) = fs::read_to_string(&doc_path) {
            let frontmatter_re = Regex::new(r"(?s)^---\r?\n(.*?)\r?\n---").unwrap();
            if let Some(caps) = frontmatter_re.captures(&content) {
                let fm = caps.get(1).map_or("", |m| m.as_str());
                for line in fm.lines() {
                    let trimmed = line.trim();
                    if let Some(val) = trimmed.strip_prefix("name:") {
                        if name.is_empty() {
                            name = val.trim().trim_matches('"').trim_matches('\'').to_string();
                        }
                    } else if let Some(val) = trimmed.strip_prefix("description:") {
                        if description.is_empty() {
                            description = val.trim().trim_matches('"').trim_matches('\'').to_string();
                        }
                    } else if let Some(val) = trimmed.strip_prefix("tags:") {
                        let tags_str = val.trim().trim_matches('[').trim_matches(']');
                        let parsed_tags: Vec<String> = tags_str
                            .split(',')
                            .map(|t| t.trim().trim_matches('"').trim_matches('\'').to_string())
                            .filter(|t| !t.is_empty())
                            .collect();
                        tags.extend(parsed_tags);
                    }
                }
            }

            if description.is_empty() {
                let body = frontmatter_re.replace(&content, "");
                for line in body.lines() {
                    let line = line.trim();
                    if !line.is_empty() && !line.starts_with('#') && !line.starts_with("```") {
                        description = line.chars().take(180).collect();
                        break;
                    }
                }
            }
        }
    }

    if name.is_empty() {
        name = item_path.file_name().unwrap_or_default().to_string_lossy().to_string();
    }

    if description.is_empty() {
        description = format!("Custom {} extension", ext_type.as_str());
    }

    tags.dedup();
    (name, description, tags, true)
}

pub fn get_item_raw_content(ext_type: &ExtensionType, item_id: &str) -> Result<String, String> {
    let vault_dir = get_vault_dir(ext_type);
    let item_path = vault_dir.join(item_id);

    if !item_path.exists() {
        return Err(format!("Item '{}' not found in vault.", item_id));
    }

    let file_to_read = if item_path.is_dir() {
        let candidates = ["SKILL.md", "AGENT.md", "RULE.md", "README.md", "plugin.json"];
        let found = candidates.iter().map(|c| item_path.join(c)).find(|p| p.exists());
        match found {
            Some(p) => p,
            None => {
                return Ok(format!("# {}\n\nDirectory contains files without a root documentation file.", item_id));
            }
        }
    } else {
        item_path
    };

    fs::read_to_string(&file_to_read)
        .map_err(|e| format!("Failed to read item content: {}", e))
}

pub fn create_new_vault_item(
    ext_type: &ExtensionType,
    name: &str,
    description: &str,
    content: &str,
) -> Result<PathBuf, String> {
    let vault_dir = get_vault_dir(ext_type);
    let _ = fs::create_dir_all(&vault_dir);

    let safe_name = name.trim().to_lowercase().replace(' ', "-");
    let item_dir = vault_dir.join(&safe_name);

    if item_dir.exists() {
        return Err(format!("An item named '{}' already exists in the vault.", safe_name));
    }

    fs::create_dir_all(&item_dir)
        .map_err(|e| format!("Failed to create item directory: {}", e))?;

    let filename = match ext_type {
        ExtensionType::Skill => "SKILL.md",
        ExtensionType::Agent => "AGENT.md",
        ExtensionType::Plugin => "plugin.json",
        ExtensionType::Command => "COMMAND.md",
        ExtensionType::Rule => "RULE.md",
    };

    let final_content = if content.trim().is_empty() {
        if *ext_type == ExtensionType::Plugin {
            format!(
                "{{\n  \"name\": \"{}\",\n  \"description\": \"{}\"\n}}\n",
                safe_name, description
            )
        } else {
            format!(
                "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n{}",
                safe_name, description, name, description
            )
        }
    } else {
        content.to_string()
    };

    let doc_path = item_dir.join(filename);
    fs::write(&doc_path, final_content)
        .map_err(|e| format!("Failed to write {}: {}", filename, e))?;

    Ok(item_dir)
}

pub fn delete_item_from_vault(ext_type: &ExtensionType, item_id: &str) -> Result<(), String> {
    let vault_dir = get_vault_dir(ext_type);
    let item_path = vault_dir.join(item_id);

    if !item_path.exists() {
        return Err(format!("Item '{}' does not exist in vault.", item_id));
    }

    let targets = get_known_targets();
    for target in &targets {
        if let Some(global_dir_str) = target.type_global_dirs.get(ext_type.as_str()) {
            let dest = PathBuf::from(global_dir_str).join(item_id);
            let _ = crate::symlink::remove_link(&dest);
        }
    }

    if item_path.is_dir() {
        fs::remove_dir_all(&item_path)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(&item_path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

pub fn import_url_into_vault(url: &str, ext_type: &ExtensionType, custom_name: Option<String>) -> Result<String, String> {
    let vault_dir = get_vault_dir(ext_type);
    let _ = fs::create_dir_all(&vault_dir);

    let name_slug = if let Some(n) = custom_name {
        n
    } else {
        url.split('/').last().unwrap_or("imported-item").replace(".git", "")
    };

    let target_dir = vault_dir.join(&name_slug);
    if target_dir.exists() {
        return Err(format!("Item '{}' already exists in vault.", name_slug));
    }

    let output = Command::new("git")
        .args(["clone", "--depth", "1", url, &target_dir.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git clone failed: {}", stderr));
    }

    let git_folder = target_dir.join(".git");
    if git_folder.exists() {
        let _ = fs::remove_dir_all(git_folder);
    }

    Ok(name_slug)
}
