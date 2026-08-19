use crate::adapters::{get_known_targets, get_vault_dir, resolve_project_target_dir};
use crate::models::{DoctorIssue, ExtensionType, LinkStatus};
use std::fs;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};

pub fn check_link_status(vault_path: &Path, target_dest_path: &Path) -> LinkStatus {
    match fs::symlink_metadata(target_dest_path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                match fs::read_link(target_dest_path) {
                    Ok(dest) => {
                        let absolute_dest = if dest.is_relative() {
                            target_dest_path.parent().unwrap_or(Path::new("/")).join(dest)
                        } else {
                            dest
                        };

                        if !absolute_dest.exists() {
                            return LinkStatus::Broken;
                        }

                        let canonical_vault = fs::canonicalize(vault_path).unwrap_or_else(|_| vault_path.to_path_buf());
                        let canonical_dest = fs::canonicalize(&absolute_dest).unwrap_or(absolute_dest.clone());

                        if canonical_dest == canonical_vault {
                            LinkStatus::Linked
                        } else {
                            LinkStatus::ForeignLink {
                                destination: absolute_dest.to_string_lossy().to_string(),
                            }
                        }
                    }
                    Err(_) => LinkStatus::Broken,
                }
            } else {
                LinkStatus::UnmanagedCopy
            }
        }
        Err(_) => LinkStatus::Unlinked,
    }
}

pub fn create_link(vault_path: &Path, target_dest_path: &Path) -> Result<(), String> {
    if !vault_path.exists() {
        return Err(format!("Source vault path does not exist: {}", vault_path.display()));
    }

    if let Some(parent) = target_dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory {}: {}", parent.display(), e))?;
    }

    if let Ok(metadata) = fs::symlink_metadata(target_dest_path) {
        if metadata.file_type().is_symlink() {
            let _ = fs::remove_file(target_dest_path);
        } else if target_dest_path.is_dir() {
            let _ = fs::remove_dir_all(target_dest_path);
        } else {
            let _ = fs::remove_file(target_dest_path);
        }
    }

    symlink(vault_path, target_dest_path)
        .map_err(|e| format!("Failed to create symlink from {} to {}: {}", vault_path.display(), target_dest_path.display(), e))?;

    Ok(())
}

pub fn remove_link(target_dest_path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(target_dest_path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                fs::remove_file(target_dest_path)
                    .map_err(|e| format!("Failed to remove symlink at {}: {}", target_dest_path.display(), e))
            } else if target_dest_path.is_dir() {
                fs::remove_dir_all(target_dest_path)
                    .map_err(|e| format!("Failed to remove directory at {}: {}", target_dest_path.display(), e))
            } else {
                fs::remove_file(target_dest_path)
                    .map_err(|e| format!("Failed to remove file at {}: {}", target_dest_path.display(), e))
            }
        }
        Err(_) => Ok(()),
    }
}

pub fn adopt_unmanaged_typed(source_path: &Path, ext_type: &ExtensionType, item_name: &str) -> Result<PathBuf, String> {
    let vault_dir = get_vault_dir(ext_type);
    fs::create_dir_all(&vault_dir)
        .map_err(|e| format!("Failed to create vault directory: {}", e))?;

    let dest_in_vault = vault_dir.join(item_name);

    if dest_in_vault.exists() {
        return Err(format!("Item '{}' already exists in the vault.", item_name));
    }

    let metadata = fs::symlink_metadata(source_path)
        .map_err(|e| format!("Cannot inspect source path: {}", e))?;

    if metadata.file_type().is_symlink() {
        return Err(format!("Source {} is already a symlink.", source_path.display()));
    }

    fs::rename(source_path, &dest_in_vault)
        .or_else(|_| {
            copy_dir_all(source_path, &dest_in_vault)?;
            fs::remove_dir_all(source_path).map_err(|e| e.to_string())
        })
        .map_err(|e| format!("Failed to move {} to vault: {}", source_path.display(), e))?;

    create_link(&dest_in_vault, source_path)?;
    Ok(dest_in_vault)
}

pub fn adopt_all_unmanaged() -> Result<usize, String> {
    let targets = get_known_targets();
    let mut count = 0;

    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    for target in &targets {
        for ext_type in &types {
            if let Some(global_dir_str) = target.type_global_dirs.get(ext_type.as_str()) {
                let global_path = PathBuf::from(global_dir_str);
                if global_path.exists() {
                    if let Ok(entries) = fs::read_dir(&global_path) {
                        for entry in entries.flatten() {
                            let entry_path = entry.path();
                            let file_name = entry.file_name().to_string_lossy().to_string();

                            if file_name.starts_with('.') {
                                continue;
                            }

                            let vault_dest = get_vault_dir(ext_type).join(&file_name);
                            let status = check_link_status(&vault_dest, &entry_path);

                            if status == LinkStatus::UnmanagedCopy {
                                if let Ok(_) = adopt_unmanaged_typed(&entry_path, ext_type, &file_name) {
                                    count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(count)
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> Result<(), String> {
    fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name())).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn scan_diagnostics(project_paths: &[PathBuf]) -> Vec<DoctorIssue> {
    let mut issues = Vec::new();
    let targets = get_known_targets();

    let types = [
        ExtensionType::Skill,
        ExtensionType::Agent,
        ExtensionType::Plugin,
        ExtensionType::Command,
        ExtensionType::Rule,
    ];

    // 1. Scan global directories for each target and each extension type
    for target in &targets {
        for ext_type in &types {
            if let Some(global_dir_str) = target.type_global_dirs.get(ext_type.as_str()) {
                let global_path = PathBuf::from(global_dir_str);
                if global_path.exists() {
                    if let Ok(entries) = fs::read_dir(&global_path) {
                        for entry in entries.flatten() {
                            let entry_path = entry.path();
                            let file_name = entry.file_name().to_string_lossy().to_string();

                            if file_name.starts_with('.') {
                                continue;
                            }

                            let expected_vault_path = get_vault_dir(ext_type).join(&file_name);
                            let status = check_link_status(&expected_vault_path, &entry_path);

                            match status {
                                LinkStatus::Broken => {
                                    issues.push(DoctorIssue {
                                        id: format!("broken_global_{}_{}_{}", target.id, ext_type.as_str(), file_name),
                                        title: format!("Broken {}: {}", ext_type.as_str(), file_name),
                                        description: format!("Global symlink in {} ({}) points to a non-existent target.", target.name, ext_type.as_str()),
                                        severity: "error".to_string(),
                                        issue_type: "broken_symlink".to_string(),
                                        extension_type: ext_type.clone(),
                                        target_path: entry_path.to_string_lossy().to_string(),
                                        vault_path: if expected_vault_path.exists() {
                                            Some(expected_vault_path.to_string_lossy().to_string())
                                        } else {
                                            None
                                        },
                                        item_name: Some(file_name),
                                        target_agent: Some(target.id.clone()),
                                        can_auto_fix: true,
                                    });
                                }
                                LinkStatus::UnmanagedCopy => {
                                    issues.push(DoctorIssue {
                                        id: format!("unmanaged_global_{}_{}_{}", target.id, ext_type.as_str(), file_name),
                                        title: format!("Unmanaged {}: {}", ext_type.as_str(), file_name),
                                        description: format!("A physical directory exists in {} without being managed by One Ring.", target.name),
                                        severity: "warning".to_string(),
                                        issue_type: "unmanaged_copy".to_string(),
                                        extension_type: ext_type.clone(),
                                        target_path: entry_path.to_string_lossy().to_string(),
                                        vault_path: Some(expected_vault_path.to_string_lossy().to_string()),
                                        item_name: Some(file_name),
                                        target_agent: Some(target.id.clone()),
                                        can_auto_fix: true,
                                    });
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Scan registered project workspaces
    for project_path in project_paths {
        for target in &targets {
            for ext_type in &types {
                if let Some(project_target_dir) = resolve_project_target_dir(project_path, target, ext_type) {
                    if project_target_dir.exists() {
                        if let Ok(entries) = fs::read_dir(&project_target_dir) {
                            for entry in entries.flatten() {
                                let entry_path = entry.path();
                                let file_name = entry.file_name().to_string_lossy().to_string();

                                if file_name.starts_with('.') {
                                    continue;
                                }

                                let expected_vault_path = get_vault_dir(ext_type).join(&file_name);
                                let status = check_link_status(&expected_vault_path, &entry_path);

                                if status == LinkStatus::Broken {
                                    issues.push(DoctorIssue {
                                        id: format!("broken_proj_{}_{}_{}_{}", project_path.display(), target.id, ext_type.as_str(), file_name),
                                        title: format!("Broken Project Symlink: {}", file_name),
                                        description: format!("Project symlink in {} ({}) is broken.", project_path.display(), target.name),
                                        severity: "error".to_string(),
                                        issue_type: "broken_symlink".to_string(),
                                        extension_type: ext_type.clone(),
                                        target_path: entry_path.to_string_lossy().to_string(),
                                        vault_path: if expected_vault_path.exists() {
                                            Some(expected_vault_path.to_string_lossy().to_string())
                                        } else {
                                            None
                                        },
                                        item_name: Some(file_name),
                                        target_agent: Some(target.id.clone()),
                                        can_auto_fix: true,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_symlink_lifecycle() {
        let temp_dir = std::env::temp_dir().join(format!("one_ring_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let vault_item = temp_dir.join("my-skill");
        fs::create_dir_all(&vault_item).unwrap();
        let mut skill_md = File::create(vault_item.join("SKILL.md")).unwrap();
        writeln!(skill_md, "---\nname: Test Skill\n---\n# Test").unwrap();

        let target_dest = temp_dir.join("dest_agent").join("my-skill");

        assert_eq!(check_link_status(&vault_item, &target_dest), LinkStatus::Unlinked);
        create_link(&vault_item, &target_dest).unwrap();
        assert_eq!(check_link_status(&vault_item, &target_dest), LinkStatus::Linked);
        remove_link(&target_dest).unwrap();
        assert_eq!(check_link_status(&vault_item, &target_dest), LinkStatus::Unlinked);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_broken_symlink_and_unmanaged_status() {
        let temp_dir = std::env::temp_dir().join(format!("one_ring_test_broken_{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let vault_item = temp_dir.join("vault_item");
        fs::create_dir_all(&vault_item).unwrap();
        let target_dest = temp_dir.join("dest_agent").join("linked_item");

        create_link(&vault_item, &target_dest).unwrap();
        assert_eq!(check_link_status(&vault_item, &target_dest), LinkStatus::Linked);

        // Delete source vault item to make symlink broken
        fs::remove_dir_all(&vault_item).unwrap();
        assert_eq!(check_link_status(&vault_item, &target_dest), LinkStatus::Broken);

        // Create a real directory at another path -> UnmanagedCopy
        let unmanaged_path = temp_dir.join("unmanaged_dir");
        fs::create_dir_all(&unmanaged_path).unwrap();
        assert_eq!(check_link_status(&vault_item, &unmanaged_path), LinkStatus::UnmanagedCopy);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

