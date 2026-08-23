use crate::adapters::{get_known_targets, get_projects_file, get_vault_dir, resolve_project_target_dir};
use crate::models::{ExtensionType, LinkStatus, ProjectItemStatus, ProjectWorkspace};
use crate::symlink::{check_link_status, create_link, remove_link};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
struct ProjectsStore {
    projects: Vec<String>,
}

pub fn get_saved_projects() -> Vec<ProjectWorkspace> {
    let file = get_projects_file();
    let mut stored_paths: Vec<String> = Vec::new();

    if let Ok(content) = fs::read_to_string(&file) {
        if let Ok(data) = serde_json::from_str::<ProjectsStore>(&content) {
            stored_paths = data.projects;
        }
    }

    let targets = get_known_targets();
    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    stored_paths
        .into_iter()
        .filter_map(|p_str| {
            let path = PathBuf::from(&p_str);
            if !path.exists() {
                return None;
            }

            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let mut item_statuses = Vec::new();
            let mut seen_keys = HashSet::new();

            for ext_type in &types {
                let vault_dir = get_vault_dir(ext_type);

                if let Ok(vault_entries) = fs::read_dir(&vault_dir) {
                    for v_entry in vault_entries.flatten() {
                        let v_path = v_entry.path();
                        let item_name = v_entry.file_name().to_string_lossy().to_string();

                        if item_name.starts_with('.') {
                            continue;
                        }

                        // Check status across ALL agent targets (claude, gemini, agents, cursor, codex)
                        for target in &targets {
                            let status = if target.id == "claude" && *ext_type == ExtensionType::Plugin {
                                if crate::adapters::is_claude_plugin_enabled(&item_name, Some(&path)) {
                                    LinkStatus::Linked
                                } else {
                                    LinkStatus::Unlinked
                                }
                            } else if let Some(project_target_dir) = resolve_project_target_dir(&path, target, ext_type) {
                                let target_dest = project_target_dir.join(&item_name);
                                check_link_status(&v_path, &target_dest)
                            } else {
                                LinkStatus::Incompatible
                            };

                            let target_dest_str = resolve_project_target_dir(&path, target, ext_type)
                                .map(|d| d.join(&item_name).to_string_lossy().to_string())
                                .unwrap_or_default();

                            let key = format!("{}:{}:{}", item_name, ext_type.as_str(), target.id);
                            if seen_keys.insert(key) {
                                item_statuses.push(ProjectItemStatus {
                                    item_id: item_name.clone(),
                                    extension_type: ext_type.clone(),
                                    status,
                                    target_agent: target.id.clone(),
                                    path: target_dest_str,
                                });
                            }
                        }
                    }
                }
            }

            // Also check project directories for unmanaged files not in vault
            for target in &targets {
                for ext_type in &types {
                    if let Some(project_target_dir) = resolve_project_target_dir(&path, target, ext_type) {
                        if project_target_dir.is_dir() {
                            if let Ok(entries) = fs::read_dir(&project_target_dir) {
                                for entry in entries.flatten() {
                                    let item_name = entry.file_name().to_string_lossy().to_string();
                                    if item_name.starts_with('.') {
                                        continue;
                                    }
                                    let key = format!("{}:{}:{}", item_name, ext_type.as_str(), target.id);
                                    if seen_keys.insert(key) {
                                        let v_path = get_vault_dir(ext_type).join(&item_name);
                                        let target_dest = project_target_dir.join(&item_name);
                                        let status = check_link_status(&v_path, &target_dest);

                                        item_statuses.push(ProjectItemStatus {
                                            item_id: item_name,
                                            extension_type: ext_type.clone(),
                                            status,
                                            target_agent: target.id.clone(),
                                            path: target_dest.to_string_lossy().to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Some(ProjectWorkspace {
                id: p_str.clone(),
                name,
                path: p_str,
                items: item_statuses.clone(),
                skills: item_statuses,
            })
        })
        .collect()
}

pub fn save_project(project_path_str: &str) -> Result<ProjectWorkspace, String> {
    let path = PathBuf::from(project_path_str);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", project_path_str));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", project_path_str));
    }

    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Invalid path: {}", e))?;
    let canonical_str = canonical.to_string_lossy().to_string();

    let file = get_projects_file();
    if let Some(parent) = file.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut store = ProjectsStore::default();
    if let Ok(content) = fs::read_to_string(&file) {
        if let Ok(data) = serde_json::from_str::<ProjectsStore>(&content) {
            store = data;
        }
    }

    if !store.projects.contains(&canonical_str) {
        store.projects.push(canonical_str.clone());
        let json = serde_json::to_string_pretty(&store).unwrap();
        fs::write(&file, json).map_err(|e| format!("Failed to save project list: {}", e))?;
    }

    let all = get_saved_projects();
    all.into_iter()
        .find(|p| p.path == canonical_str)
        .ok_or_else(|| "Failed to retrieve saved project".to_string())
}

pub fn remove_saved_project(project_path_str: &str) -> Result<(), String> {
    let file = get_projects_file();
    let mut store = ProjectsStore::default();

    if let Ok(content) = fs::read_to_string(&file) {
        if let Ok(data) = serde_json::from_str::<ProjectsStore>(&content) {
            store = data;
        }
    }

    let p_path = PathBuf::from(project_path_str);
    let canonical_str = fs::canonicalize(&p_path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| project_path_str.to_string());

    store.projects.retain(|p| p != &canonical_str && p != project_path_str);

    let json = serde_json::to_string_pretty(&store).unwrap();
    fs::write(&file, json).map_err(|e| format!("Failed to update project list: {}", e))?;

    Ok(())
}

pub fn sync_project_to_target(
    project_path_str: &str,
    target_agent_id: &str,
    enable: bool,
) -> Result<usize, String> {
    let targets = get_known_targets();
    let target = targets
        .iter()
        .find(|t| t.id == target_agent_id)
        .ok_or_else(|| format!("Target agent '{}' not found.", target_agent_id))?;

    let p_path = PathBuf::from(project_path_str);
    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    let mut affected_count = 0;

    for ext_type in &types {
        let vault_dir = get_vault_dir(ext_type);
        if let Ok(entries) = fs::read_dir(&vault_dir) {
            for entry in entries.flatten() {
                let v_path = entry.path();
                let item_name = entry.file_name().to_string_lossy().to_string();
                if item_name.starts_with('.') {
                    continue;
                }

                if target_agent_id == "claude" && *ext_type == ExtensionType::Plugin {
                    if crate::adapters::set_claude_plugin_enabled(&item_name, Some(&p_path), enable).is_ok() {
                        affected_count += 1;
                    }
                } else if let Some(dest_dir) = resolve_project_target_dir(&p_path, target, ext_type) {
                    let dest_path = dest_dir.join(&item_name);
                    if enable {
                        if create_link(&v_path, &dest_path).is_ok() {
                            affected_count += 1;
                        }
                    } else {
                        if remove_link(&dest_path).is_ok() {
                            affected_count += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(affected_count)
}
