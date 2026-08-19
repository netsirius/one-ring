use crate::adapters::{get_known_targets, get_vault_dir};
use crate::models::{ExtensionType, TrashItem};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn get_one_ring_home() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".one-ring")
}

pub fn get_trash_dir() -> PathBuf {
    get_one_ring_home().join("trash")
}

fn get_trash_items_dir() -> PathBuf {
    get_trash_dir().join("items")
}

fn get_manifest_path() -> PathBuf {
    get_trash_dir().join("manifest.json")
}

fn read_manifest() -> Vec<TrashItem> {
    let manifest_path = get_manifest_path();
    if !manifest_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&manifest_path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_manifest(items: &[TrashItem]) -> Result<(), String> {
    let trash_dir = get_trash_dir();
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;

    let manifest_path = get_manifest_path();
    let json = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    fs::write(manifest_path, json).map_err(|e| e.to_string())?;
    Ok(())
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

fn move_path_safely(src: &Path, dst: &Path) -> Result<(), String> {
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    if let Err(_) = fs::rename(src, dst) {
        if src.is_dir() {
            copy_dir_all(src, dst)?;
            fs::remove_dir_all(src).map_err(|e| e.to_string())?;
        } else {
            fs::copy(src, dst).map_err(|e| e.to_string())?;
            fs::remove_file(src).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn list_trash_items() -> Vec<TrashItem> {
    let mut items = read_manifest();
    // Verify each item actually exists in trash
    items.retain(|i| Path::new(&i.trash_path).exists());
    let _ = save_manifest(&items);
    items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    items
}

pub fn move_vault_item_to_trash(ext_type: &ExtensionType, item_id: &str) -> Result<TrashItem, String> {
    let vault_dir = get_vault_dir(ext_type);
    let item_path = vault_dir.join(item_id);

    if !item_path.exists() {
        return Err(format!("Item '{}' not found in vault.", item_id));
    }

    // 1. Safely remove all active symlinks from agent targets
    let targets = get_known_targets();
    for target in &targets {
        if let Some(global_dir_str) = target.type_global_dirs.get(ext_type.as_str()) {
            let dest = PathBuf::from(global_dir_str).join(item_id);
            let _ = crate::symlink::remove_link(&dest);
        }
    }

    // 2. Prepare trash destination
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let trash_id = format!("{}_{}_{}", ext_type.as_str(), item_id, timestamp);
    let trash_items_dir = get_trash_items_dir();
    let trash_dest = trash_items_dir.join(&trash_id).join(item_id);

    // 3. Move files to trash
    move_path_safely(&item_path, &trash_dest)?;

    // 4. Update manifest
    let trash_item = TrashItem {
        id: trash_id,
        name: item_id.to_string(),
        extension_type: ext_type.clone(),
        original_path: item_path.to_string_lossy().to_string(),
        trash_path: trash_dest.to_string_lossy().to_string(),
        deleted_at: format!("{}", timestamp),
        is_unmanaged: false,
    };

    let mut manifest = read_manifest();
    manifest.push(trash_item.clone());
    save_manifest(&manifest)?;

    Ok(trash_item)
}

pub fn move_unmanaged_to_trash(
    source_path: &Path,
    ext_type: &ExtensionType,
    item_name: &str,
) -> Result<TrashItem, String> {
    if !source_path.exists() {
        return Err(format!("Source path '{}' does not exist.", source_path.display()));
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let trash_id = format!("unmanaged_{}_{}_{}", ext_type.as_str(), item_name, timestamp);
    let trash_items_dir = get_trash_items_dir();
    let trash_dest = trash_items_dir.join(&trash_id).join(item_name);

    move_path_safely(source_path, &trash_dest)?;

    let trash_item = TrashItem {
        id: trash_id,
        name: item_name.to_string(),
        extension_type: ext_type.clone(),
        original_path: source_path.to_string_lossy().to_string(),
        trash_path: trash_dest.to_string_lossy().to_string(),
        deleted_at: format!("{}", timestamp),
        is_unmanaged: true,
    };

    let mut manifest = read_manifest();
    manifest.push(trash_item.clone());
    save_manifest(&manifest)?;

    Ok(trash_item)
}

pub fn restore_trash_item(trash_id: &str) -> Result<(), String> {
    let mut manifest = read_manifest();
    let idx = manifest
        .iter()
        .position(|i| i.id == trash_id)
        .ok_or_else(|| format!("Trash item '{}' not found in manifest.", trash_id))?;

    let trash_path = PathBuf::from(&manifest[idx].trash_path);
    let original_path = PathBuf::from(&manifest[idx].original_path);
    let item_name = manifest[idx].name.clone();

    if !trash_path.exists() {
        manifest.remove(idx);
        let _ = save_manifest(&manifest);
        return Err(format!("Trash files for '{}' not found on disk.", item_name));
    }

    if original_path.exists() {
        return Err(format!(
            "Cannot restore: target destination '{}' already exists.",
            original_path.display()
        ));
    }

    move_path_safely(&trash_path, &original_path)?;

    // Clean up empty container folder inside trash
    if let Some(parent) = trash_path.parent() {
        let _ = fs::remove_dir_all(parent);
    }

    manifest.remove(idx);
    save_manifest(&manifest)?;

    Ok(())
}

pub fn delete_trash_item_permanently(trash_id: &str) -> Result<(), String> {
    let mut manifest = read_manifest();
    let idx = manifest
        .iter()
        .position(|i| i.id == trash_id)
        .ok_or_else(|| format!("Trash item '{}' not found in manifest.", trash_id))?;

    let trash_path = PathBuf::from(&manifest[idx].trash_path);

    if trash_path.exists() {
        if trash_path.is_dir() {
            let _ = fs::remove_dir_all(&trash_path);
        } else {
            let _ = fs::remove_file(&trash_path);
        }
    }

    if let Some(parent) = trash_path.parent() {
        let _ = fs::remove_dir_all(parent);
    }

    manifest.remove(idx);
    save_manifest(&manifest)?;

    Ok(())
}

pub fn empty_all_trash() -> Result<usize, String> {
    let manifest = read_manifest();
    let count = manifest.len();

    let trash_items_dir = get_trash_items_dir();
    if trash_items_dir.exists() {
        let _ = fs::remove_dir_all(&trash_items_dir);
    }

    let _ = fs::create_dir_all(&trash_items_dir);
    save_manifest(&[])?;

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_copy_dir_all_and_move_safely() {
        let temp_dir = std::env::temp_dir().join(format!("one_ring_trash_test_{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let src_dir = temp_dir.join("src_folder");
        fs::create_dir_all(&src_dir).unwrap();
        let mut file1 = File::create(src_dir.join("file.txt")).unwrap();
        writeln!(file1, "sample content").unwrap();

        let dst_dir = temp_dir.join("dst_folder");
        copy_dir_all(&src_dir, &dst_dir).unwrap();
        assert!(dst_dir.join("file.txt").exists());

        let moved_dir = temp_dir.join("moved_folder");
        move_path_safely(&dst_dir, &moved_dir).unwrap();
        assert!(!dst_dir.exists());
        assert!(moved_dir.join("file.txt").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

