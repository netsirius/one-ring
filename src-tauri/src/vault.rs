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

fn copy_dir_all_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        if ty.is_dir() {
            copy_dir_all_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name())).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn walk_find_dir(root: &Path, target_name: &str) -> Result<Option<PathBuf>, String> {
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if entry.file_name().to_string_lossy() == target_name {
                    return Ok(Some(path));
                }
                if let Ok(Some(found)) = walk_find_dir(&path, target_name) {
                    return Ok(Some(found));
                }
            }
        }
    }
    Ok(None)
}

pub fn parse_import_input(input: &str) -> (String, Option<String>, Option<String>) {
    let trimmed = input.trim();
    let mut clean_cmd = trimmed;

    // Strip leading npx / skills / add prefixes if pasted as a shell command
    let prefixes = [
        "npx skills add ",
        "npx @agent/skills add ",
        "npx @agents/skills add ",
        "skills add ",
        "add ",
    ];

    for prefix in &prefixes {
        if let Some(rest) = clean_cmd.strip_prefix(prefix) {
            clean_cmd = rest.trim();
            break;
        }
    }

    let tokens: Vec<&str> = clean_cmd.split_whitespace().collect();
    let mut repo_target = "";
    let mut sub_skill: Option<String> = None;
    let mut custom_name: Option<String> = None;

    let mut i = 0;
    while i < tokens.len() {
        let token = tokens[i];
        if (token == "--skill" || token == "-s") && i + 1 < tokens.len() {
            sub_skill = Some(tokens[i + 1].trim_matches('"').trim_matches('\'').to_string());
            i += 2;
        } else if (token == "--name" || token == "-n") && i + 1 < tokens.len() {
            custom_name = Some(tokens[i + 1].trim_matches('"').trim_matches('\'').to_string());
            i += 2;
        } else if repo_target.is_empty() && !token.starts_with('-') {
            repo_target = token.trim_matches('"').trim_matches('\'');
            i += 1;
        } else {
            i += 1;
        }
    }

    // Check if repo_target is a GitHub /tree/ URL e.g. https://github.com/vercel-labs/skills/tree/main/skills/find-skills
    let mut final_repo = repo_target.to_string();
    if final_repo.contains("github.com") && final_repo.contains("/tree/") {
        if let Some(idx) = final_repo.find("/tree/") {
            let base_repo = &final_repo[..idx];
            let after_tree = &final_repo[idx + 6..];
            let parts: Vec<&str> = after_tree.split('/').collect();
            if parts.len() > 1 && sub_skill.is_none() {
                sub_skill = Some(parts.last().unwrap().to_string());
            }
            final_repo = base_repo.to_string();
        }
    }

    // Normalize shorthand owner/repo to https://github.com/owner/repo
    if !final_repo.is_empty() && !final_repo.starts_with("http://") && !final_repo.starts_with("https://") && !final_repo.starts_with("git@") {
        if final_repo.contains('/') && !final_repo.contains(' ') {
            final_repo = format!("https://github.com/{}", final_repo);
        }
    }

    (final_repo, sub_skill, custom_name)
}

pub fn import_url_into_vault(input: &str, ext_type: &ExtensionType, custom_name_opt: Option<String>) -> Result<String, String> {
    let (repo_url, sub_skill_opt, parsed_name) = parse_import_input(input);
    if repo_url.is_empty() {
        return Err("No repository URL or command found in input.".to_string());
    }

    let vault_dir = get_vault_dir(ext_type);
    let _ = fs::create_dir_all(&vault_dir);

    let name_slug = if let Some(n) = custom_name_opt.or(parsed_name) {
        n
    } else if let Some(ref s) = sub_skill_opt {
        s.clone()
    } else {
        repo_url.split('/').last().unwrap_or("imported-item").replace(".git", "")
    };

    let target_dir = vault_dir.join(&name_slug);
    if target_dir.exists() {
        return Err(format!("Item '{}' already exists in vault.", name_slug));
    }

    // Clone into isolated temporary directory
    let temp_dir = std::env::temp_dir().join(format!("one_ring_import_{}_{}", std::process::id(), name_slug));
    let _ = fs::remove_dir_all(&temp_dir);

    let output = Command::new("git")
        .args(["clone", "--depth", "1", &repo_url, &temp_dir.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = fs::remove_dir_all(&temp_dir);
        return Err(format!("Git clone failed: {}", stderr));
    }

    // Remove .git folder from temp clone
    let git_folder = temp_dir.join(".git");
    if git_folder.exists() {
        let _ = fs::remove_dir_all(git_folder);
    }

    // If a sub_skill was specified, find and extract only that sub-skill directory
    let source_to_copy = if let Some(ref skill_name) = sub_skill_opt {
        let candidate_paths = [
            temp_dir.join("skills").join(skill_name),
            temp_dir.join(skill_name),
            temp_dir.join("plugins").join(skill_name),
            temp_dir.join("agents").join(skill_name),
            temp_dir.join("commands").join(skill_name),
            temp_dir.join("rules").join(skill_name),
        ];

        let found = candidate_paths.into_iter().find(|p| p.exists());
        if let Some(src_sub) = found {
            src_sub
        } else {
            let mut found_deep = None;
            if let Ok(entries) = walk_find_dir(&temp_dir, skill_name) {
                if let Some(p) = entries {
                    found_deep = Some(p);
                }
            }
            if let Some(p) = found_deep {
                p
            } else {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(format!("Could not find sub-skill '{}' in repository '{}'", skill_name, repo_url));
            }
        }
    } else {
        temp_dir.clone()
    };

    if source_to_copy.is_dir() {
        copy_dir_all_recursive(&source_to_copy, &target_dir)
            .map_err(|e| format!("Failed to copy imported files into Vault: {}", e))?;
    } else {
        fs::copy(&source_to_copy, &target_dir)
            .map_err(|e| format!("Failed to copy imported file into Vault: {}", e))?;
    }

    let _ = fs::remove_dir_all(&temp_dir);
    Ok(name_slug)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_parse_item_metadata() {
        let temp_dir = std::env::temp_dir().join(format!("one_ring_vault_meta_{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let item_dir = temp_dir.join("test-skill");
        fs::create_dir_all(&item_dir).unwrap();
        let mut skill_md = File::create(item_dir.join("SKILL.md")).unwrap();
        writeln!(
            skill_md,
            "---\nname: Test Skill\ndescription: A test description for this skill\ntags: [test, rust]\n---\n# Body Content"
        )
        .unwrap();

        let (name, desc, tags, has_doc) = parse_item_metadata(&item_dir, &ExtensionType::Skill);
        assert_eq!(name, "Test Skill");
        assert_eq!(desc, "A test description for this skill");
        assert!(tags.contains(&"test".to_string()));
        assert!(tags.contains(&"rust".to_string()));
        assert!(has_doc);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_parse_import_input_variations() {
        // Full npx command with --skill
        let (repo1, sub1, name1) = parse_import_input("npx skills add https://github.com/vercel-labs/skills --skill find-skills");
        assert_eq!(repo1, "https://github.com/vercel-labs/skills");
        assert_eq!(sub1, Some("find-skills".to_string()));
        assert_eq!(name1, None);

        // Short command with -s
        let (repo2, sub2, _) = parse_import_input("npx skills add vercel-labs/skills -s find-skills");
        assert_eq!(repo2, "https://github.com/vercel-labs/skills");
        assert_eq!(sub2, Some("find-skills".to_string()));

        // GitHub tree URL
        let (repo3, sub3, _) = parse_import_input("https://github.com/vercel-labs/skills/tree/main/skills/find-skills");
        assert_eq!(repo3, "https://github.com/vercel-labs/skills");
        assert_eq!(sub3, Some("find-skills".to_string()));

        // Simple repo
        let (repo4, sub4, _) = parse_import_input("vercel-labs/skills");
        assert_eq!(repo4, "https://github.com/vercel-labs/skills");
        assert_eq!(sub4, None);
    }
}


