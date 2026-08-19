use crate::adapters::{get_known_targets, get_projects_file, get_vault_dir, resolve_project_target_dir};
use crate::models::{ExtensionType, LinkStatus, ProjectItemStatus, ProjectWorkspace};
use crate::symlink::{check_link_status, create_link, remove_link};
use serde::{Deserialize, Serialize};
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

            for ext_type in &types {
                let vault_dir = get_vault_dir(ext_type);

                if let Ok(vault_entries) = fs::read_dir(&vault_dir) {
                    for v_entry in vault_entries.flatten() {
                        let v_path = v_entry.path();
                        let item_name = v_entry.file_name().to_string_lossy().to_string();

                        if item_name.starts_with('.') {
                            continue;
                        }

                        // Use Standard (.agents) target for project workspace links
                        let default_target = targets
                            .iter()
                            .find(|t| t.id == "agents")
                            .unwrap_or(&targets[0]);

                        if let Some(project_target_dir) = resolve_project_target_dir(&path, default_target, ext_type) {
                            let target_dest = project_target_dir.join(&item_name);
                            let status = check_link_status(&v_path, &target_dest);

                            item_statuses.push(ProjectItemStatus {
                                item_id: item_name,
                                extension_type: ext_type.clone(),
                                status,
                                target_agent: default_target.id.clone(),
                                path: target_dest.to_string_lossy().to_string(),
                            });
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
    let canonical = fs::canonicalize(&p_path).ok();

    store.projects.retain(|p| {
        if p == project_path_str {
            return false;
        }
        if let Some(ref c) = canonical {
            if c.to_string_lossy() == *p {
                return false;
            }
        }
        true
    });

    let json = serde_json::to_string_pretty(&store).unwrap();
    fs::write(&file, json).map_err(|e| format!("Failed to update projects: {}", e))?;

    Ok(())
}

pub fn toggle_project_item(
    project_path_str: &str,
    ext_type_str: &str,
    item_id: &str,
    target_agent_id: Option<String>,
    enable: bool,
) -> Result<LinkStatus, String> {
    let project_path = PathBuf::from(project_path_str);
    if !project_path.exists() {
        return Err(format!("Project path '{}' does not exist.", project_path_str));
    }

    let ext_type = ExtensionType::from_folder(ext_type_str)
        .or_else(|| {
            match ext_type_str {
                "skill" => Some(ExtensionType::Skill),
                "agent" => Some(ExtensionType::Agent),
                "plugin" => Some(ExtensionType::Plugin),
                "command" => Some(ExtensionType::Command),
                "rule" => Some(ExtensionType::Rule),
                _ => None,
            }
        })
        .unwrap_or(ExtensionType::Skill);

    let vault_dir = get_vault_dir(&ext_type);
    let item_vault_path = vault_dir.join(item_id);
    if !item_vault_path.exists() {
        return Err(format!("Item '{}' not found in vault.", item_id));
    }

    let targets = get_known_targets();
    let target = if let Some(agent_id) = target_agent_id {
        targets.into_iter().find(|t| t.id == agent_id)
            .ok_or_else(|| format!("Unknown agent target: {}", agent_id))?
    } else {
        targets
            .into_iter()
            .find(|t| t.supported_types.contains(&ext_type))
            .ok_or_else(|| "No compatible agent target found".to_string())?
    };

    if !target.supported_types.contains(&ext_type) {
        return Ok(LinkStatus::Incompatible);
    }

    let project_target_dir = resolve_project_target_dir(&project_path, &target, &ext_type)
        .ok_or_else(|| "Target does not have a local directory for this type".to_string())?;

    let dest_path = project_target_dir.join(item_id);

    if enable {
        create_link(&item_vault_path, &dest_path)?;
        Ok(LinkStatus::Linked)
    } else {
        remove_link(&dest_path)?;
        Ok(LinkStatus::Unlinked)
    }
}
