pub mod adapters;
pub mod models;
pub mod projects;
pub mod symlink;
pub mod trash;
pub mod vault;

use adapters::{get_known_targets, get_target_by_id, get_vault_dir};
use models::{AgentTarget, DoctorIssue, ExtensionType, LinkStatus, ProjectWorkspace, SystemStats, TrashItem, VaultItem};
use std::path::{Path, PathBuf};
use std::process::Command;

fn parse_ext_type(s: &str) -> ExtensionType {
    ExtensionType::from_folder(s)
        .or_else(|| {
            match s {
                "skill" => Some(ExtensionType::Skill),
                "agent" => Some(ExtensionType::Agent),
                "plugin" => Some(ExtensionType::Plugin),
                "command" => Some(ExtensionType::Command),
                "rule" => Some(ExtensionType::Rule),
                _ => None,
            }
        })
        .unwrap_or(ExtensionType::Skill)
}

#[tauri::command]
fn get_vault_items() -> Result<Vec<VaultItem>, String> {
    vault::list_vault_items()
}

// Backward compat
#[tauri::command]
fn get_vault_skills() -> Result<Vec<VaultItem>, String> {
    vault::list_vault_items()
}

#[tauri::command]
fn get_agent_targets() -> Vec<AgentTarget> {
    adapters::get_known_targets()
}

#[tauri::command]
fn get_saved_projects() -> Vec<ProjectWorkspace> {
    projects::get_saved_projects()
}

#[tauri::command]
fn add_project(path: String) -> Result<ProjectWorkspace, String> {
    projects::save_project(&path)
}

#[tauri::command]
fn remove_project(path: String) -> Result<(), String> {
    projects::remove_saved_project(&path)
}

#[tauri::command]
fn toggle_global_item(item_id: String, ext_type: String, agent_id: String, enable: bool) -> Result<LinkStatus, String> {
    let t = parse_ext_type(&ext_type);
    let vault_dir = get_vault_dir(&t);
    let vault_path = vault_dir.join(&item_id);

    if !vault_path.exists() {
        return Err(format!("Item '{}' not found in vault.", item_id));
    }

    let target = get_target_by_id(&agent_id)
        .ok_or_else(|| format!("Target agent '{}' not recognized.", agent_id))?;

    let global_dir_str = target.type_global_dirs.get(t.as_str())
        .ok_or_else(|| format!("Agent '{}' does not support {} extensions.", target.name, t.as_str()))?;

    let target_dest_path = PathBuf::from(global_dir_str).join(&item_id);

    if enable {
        symlink::create_link(&vault_path, &target_dest_path)?;
        Ok(LinkStatus::Linked)
    } else {
        symlink::remove_link(&target_dest_path)?;
        Ok(LinkStatus::Unlinked)
    }
}

// Backward compat
#[tauri::command]
fn toggle_global_skill(skill_id: String, agent_id: String, enable: bool) -> Result<LinkStatus, String> {
    toggle_global_item(skill_id, "skill".to_string(), agent_id, enable)
}

#[tauri::command]
fn toggle_project_item(project_path: String, ext_type: String, item_id: String, agent_id: String, enable: bool) -> Result<LinkStatus, String> {
    let t = parse_ext_type(&ext_type);
    let p_path = PathBuf::from(&project_path);

    let target = get_target_by_id(&agent_id)
        .or_else(|| get_target_by_id("agents"))
        .ok_or_else(|| format!("Target agent '{}' not recognized.", agent_id))?;

    let project_target_dir = adapters::resolve_project_target_dir(&p_path, &target, &t)
        .ok_or_else(|| format!("Cannot resolve project directory for {}", target.name))?;

    let target_dest_path = project_target_dir.join(&item_id);

    if enable {
        let vault_path = get_vault_dir(&t).join(&item_id);
        if !vault_path.exists() {
            return Err(format!("Item '{}' not found in vault.", item_id));
        }
        symlink::create_link(&vault_path, &target_dest_path)?;
        Ok(LinkStatus::Linked)
    } else {
        symlink::remove_link(&target_dest_path)?;
        Ok(LinkStatus::Unlinked)
    }
}

#[tauri::command]
fn remove_item_from_project(project_path: String, ext_type: String, item_id: String, agent_id: Option<String>) -> Result<(), String> {
    let t = parse_ext_type(&ext_type);
    let p_path = PathBuf::from(&project_path);
    let a_id = agent_id.unwrap_or_else(|| "agents".to_string());

    let target = get_target_by_id(&a_id)
        .or_else(|| get_target_by_id("agents"))
        .ok_or_else(|| "Target agent not recognized".to_string())?;

    if let Some(project_target_dir) = adapters::resolve_project_target_dir(&p_path, &target, &t) {
        let target_dest_path = project_target_dir.join(&item_id);
        symlink::remove_link(&target_dest_path)?;
    }

    Ok(())
}

// Backward compat
#[tauri::command]
fn toggle_project_skill(project_path: String, skill_id: String, agent_id: String, enable: bool) -> Result<LinkStatus, String> {
    toggle_project_item(project_path, "skill".to_string(), skill_id, agent_id, enable)
}

#[tauri::command]
fn get_item_content(item_id: String, ext_type: String) -> Result<String, String> {
    let t = parse_ext_type(&ext_type);
    vault::get_item_raw_content(&t, &item_id)
}

// Backward compat
#[tauri::command]
fn get_skill_content(skill_id: String) -> Result<String, String> {
    get_item_content(skill_id, "skill".to_string())
}

#[tauri::command]
fn create_vault_item(name: String, ext_type: String, description: String, content: String) -> Result<VaultItem, String> {
    let t = parse_ext_type(&ext_type);
    let item_dir = vault::create_new_vault_item(&t, &name, &description, &content)?;
    let item_id = item_dir.file_name().unwrap_or_default().to_string_lossy().to_string();

    vault::list_vault_items()?
        .into_iter()
        .find(|i| i.id == item_id && i.extension_type == t)
        .ok_or_else(|| "Failed to load newly created item".to_string())
}

// Backward compat
#[tauri::command]
fn create_skill(name: String, description: String, content: String) -> Result<VaultItem, String> {
    create_vault_item(name, "skill".to_string(), description, content)
}

#[tauri::command]
fn delete_vault_item(item_id: String, ext_type: String) -> Result<(), String> {
    let t = parse_ext_type(&ext_type);
    trash::move_vault_item_to_trash(&t, &item_id)?;
    Ok(())
}

// Backward compat
#[tauri::command]
fn delete_skill(skill_id: String) -> Result<(), String> {
    delete_vault_item(skill_id, "skill".to_string())
}

#[tauri::command]
fn list_trash_items() -> Vec<TrashItem> {
    trash::list_trash_items()
}

#[tauri::command]
fn move_vault_item_to_trash(item_id: String, ext_type: String) -> Result<TrashItem, String> {
    let t = parse_ext_type(&ext_type);
    trash::move_vault_item_to_trash(&t, &item_id)
}

#[tauri::command]
fn move_unmanaged_to_trash(source_path: String, ext_type: String, item_name: String) -> Result<TrashItem, String> {
    let t = parse_ext_type(&ext_type);
    let p = PathBuf::from(&source_path);
    trash::move_unmanaged_to_trash(&p, &t, &item_name)
}

#[tauri::command]
fn restore_trash_item(trash_id: String) -> Result<(), String> {
    trash::restore_trash_item(&trash_id)
}

#[tauri::command]
fn delete_trash_item_permanently(trash_id: String) -> Result<(), String> {
    trash::delete_trash_item_permanently(&trash_id)
}

#[tauri::command]
fn empty_all_trash() -> Result<usize, String> {
    trash::empty_all_trash()
}

#[tauri::command]
fn adopt_unmanaged_item(source_path: String, ext_type: String, item_name: String) -> Result<(), String> {
    let t = parse_ext_type(&ext_type);
    let path = PathBuf::from(&source_path);
    symlink::adopt_unmanaged_typed(&path, &t, &item_name)?;
    Ok(())
}

// Backward compat
#[tauri::command]
fn adopt_unmanaged_skill(source_path: String, skill_name: String) -> Result<(), String> {
    adopt_unmanaged_item(source_path, "skill".to_string(), skill_name)
}

#[tauri::command]
fn adopt_all_unmanaged_skills() -> Result<usize, String> {
    symlink::adopt_all_unmanaged()
}

#[tauri::command]
fn import_item(url: String, ext_type: String, custom_name: Option<String>) -> Result<String, String> {
    let t = parse_ext_type(&ext_type);
    vault::import_url_into_vault(&url, &t, custom_name)
}

// Backward compat
#[tauri::command]
fn import_skill(url: String, custom_name: Option<String>) -> Result<String, String> {
    import_item(url, "skill".to_string(), custom_name)
}

#[tauri::command]
fn run_doctor_diagnostics() -> Vec<DoctorIssue> {
    let saved_projects = projects::get_saved_projects();
    let project_paths: Vec<PathBuf> = saved_projects.into_iter().map(|p| PathBuf::from(p.path)).collect();
    symlink::scan_diagnostics(&project_paths)
}

#[tauri::command]
fn fix_doctor_issue(target_path: String, issue_type: String, ext_type: Option<String>, vault_path: Option<String>, item_name: Option<String>) -> Result<(), String> {
    let t_path = PathBuf::from(&target_path);
    let t = ext_type.map(|s| parse_ext_type(&s)).unwrap_or(ExtensionType::Skill);

    match issue_type.as_str() {
        "broken_symlink" => {
            if let Some(v_path_str) = vault_path {
                let v_path = PathBuf::from(v_path_str);
                if v_path.exists() {
                    symlink::create_link(&v_path, &t_path)?;
                    return Ok(());
                }
            }
            symlink::remove_link(&t_path)
        }
        "unmanaged_copy" => {
            let name = item_name.unwrap_or_else(|| {
                t_path.file_name().unwrap_or_default().to_string_lossy().to_string()
            });
            symlink::adopt_unmanaged_typed(&t_path, &t, &name)?;
            Ok(())
        }
        _ => Err("Unknown issue type".to_string()),
    }
}

#[tauri::command]
fn get_system_stats() -> SystemStats {
    let items = vault::list_vault_items().unwrap_or_default();
    let saved_projects = projects::get_saved_projects();
    let targets = get_known_targets();

    let mut total_vault_skills = 0;
    let mut total_vault_agents = 0;
    let mut total_vault_plugins = 0;
    let mut total_vault_commands = 0;
    let mut total_vault_rules = 0;

    let mut active_global_links = 0;

    for item in &items {
        match item.extension_type {
            ExtensionType::Skill => total_vault_skills += 1,
            ExtensionType::Agent => total_vault_agents += 1,
            ExtensionType::Plugin => total_vault_plugins += 1,
            ExtensionType::Command => total_vault_commands += 1,
            ExtensionType::Rule => total_vault_rules += 1,
        }

        for status in item.global_status.values() {
            if *status == LinkStatus::Linked {
                active_global_links += 1;
            }
        }
    }

    let mut active_project_links = 0;
    for project in &saved_projects {
        for item_status in &project.items {
            if item_status.status == LinkStatus::Linked {
                active_project_links += 1;
            }
        }
    }

    let detected_agents = targets.iter().filter(|t| t.is_installed).count();
    let project_paths: Vec<PathBuf> = saved_projects.into_iter().map(|p| PathBuf::from(p.path)).collect();
    let doctor_issues = symlink::scan_diagnostics(&project_paths);

    let doctor_broken_count = doctor_issues.iter().filter(|i| i.issue_type == "broken_symlink").count();
    let doctor_unmanaged_count = doctor_issues.iter().filter(|i| i.issue_type == "unmanaged_copy").count();
    let trash_count = trash::list_trash_items().len();

    SystemStats {
        total_vault_items: items.len(),
        total_vault_skills,
        total_vault_agents,
        total_vault_plugins,
        total_vault_commands,
        total_vault_rules,
        active_global_links,
        active_project_links,
        detected_agents,
        doctor_issues_count: doctor_issues.len(),
        doctor_broken_count,
        doctor_unmanaged_count,
        trash_count,
    }
}

#[tauri::command]
fn open_path_in_finder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };

    Command::new("open")
        .arg(target)
        .spawn()
        .map_err(|e| format!("Failed to open in Finder: {}", e))?;

    Ok(())
}

#[tauri::command]
fn select_folder_dialog() -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"POSIX path of (choose folder with prompt "Select Project Workspace Directory")"#;
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to open folder dialog: {}", e))?;

        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout)
                .trim()
                .trim_end_matches('/')
                .to_string();
            if !path_str.is_empty() {
                return Ok(Some(path_str));
            }
        }
        Ok(None)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_vault_items,
            get_vault_skills,
            get_agent_targets,
            get_saved_projects,
            add_project,
            remove_project,
            toggle_global_item,
            toggle_global_skill,
            toggle_project_item,
            toggle_project_skill,
            get_item_content,
            get_skill_content,
            create_vault_item,
            create_skill,
            delete_vault_item,
            delete_skill,
            list_trash_items,
            move_vault_item_to_trash,
            move_unmanaged_to_trash,
            restore_trash_item,
            delete_trash_item_permanently,
            empty_all_trash,
            adopt_unmanaged_item,
            adopt_unmanaged_skill,
            adopt_all_unmanaged_skills,
            import_item,
            import_skill,
            run_doctor_diagnostics,
            fix_doctor_issue,
            get_system_stats,
            open_path_in_finder,
            select_folder_dialog,
            remove_item_from_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
