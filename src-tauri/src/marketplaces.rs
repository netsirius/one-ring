use crate::adapters::{get_home_dir, get_vault_dir};
use crate::models::{ExtensionType, MarketplaceCatalogItem, MarketplaceSource};
use crate::vault::{copy_dir_all_recursive, parse_import_input, parse_item_metadata, sync_vault_manifests};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn get_marketplaces_file() -> PathBuf {
    get_home_dir().join(".one-ring").join("marketplaces.json")
}

/// One Ring-owned cache of shallow git clones, one folder per marketplace id.
pub fn get_marketplaces_cache_dir() -> PathBuf {
    get_home_dir().join(".one-ring").join("marketplaces")
}

const GEMINI_MARKETPLACE_ID: &str = "gemini-plugins";

fn get_gemini_plugins_dir() -> PathBuf {
    get_home_dir().join(".gemini").join("config").join("plugins")
}

pub fn get_default_marketplaces() -> Vec<MarketplaceSource> {
    vec![
        MarketplaceSource {
            id: "claude-plugins-official".to_string(),
            name: "Claude Code Official".to_string(),
            url: "https://github.com/anthropics/claude-plugins-official".to_string(),
            description: "Official Anthropic Claude Code plugins, development tools, and LSP connectors".to_string(),
            default_marketplace: true,
            synced: false,
        },
        MarketplaceSource {
            id: "ecc".to_string(),
            name: "Everything Claude Code (ECC)".to_string(),
            url: "https://github.com/affaan-m/everything-claude-code".to_string(),
            description: "Massive repository of skills, agents, commands, and rules for Claude Code".to_string(),
            default_marketplace: true,
            synced: false,
        },
        MarketplaceSource {
            id: "agent-skills".to_string(),
            name: "Universal Agent Skills Standard".to_string(),
            url: "https://github.com/vercel-labs/skills".to_string(),
            description: "Multi-agent skill workflows and system prompts standard".to_string(),
            default_marketplace: true,
            synced: false,
        },
        MarketplaceSource {
            id: "anthropic-skills".to_string(),
            name: "Anthropic Agent Skills".to_string(),
            url: "https://github.com/anthropics/skills".to_string(),
            description: "Anthropic's public collection of Agent Skills (documents, design, development, enterprise)".to_string(),
            default_marketplace: true,
            synced: false,
        },
    ]
}

fn is_local_source(url: &str) -> bool {
    url.starts_with('/') || url.starts_with('.') || url.starts_with('~') || Path::new(url).exists()
}

/// Normalizes user input into a cloneable git URL or an absolute local path.
pub fn normalize_marketplace_url(url: &str) -> String {
    let trimmed = url.trim();
    if let Some(rest) = trimmed.strip_prefix("~/") {
        return get_home_dir().join(rest).to_string_lossy().to_string();
    }
    if is_local_source(trimmed) {
        return trimmed.to_string();
    }
    parse_import_input(trimmed).0
}

/// Comparable form of a marketplace URL: `…/repo`, `…/repo/` and `…/repo.git` are the same source.
fn canonical_url(url: &str) -> String {
    let lower = url.trim().trim_end_matches('/').to_lowercase();
    lower.strip_suffix(".git").unwrap_or(&lower).to_string()
}

/// Directory holding the marketplace contents, if available locally.
pub fn resolve_marketplace_root(mp: &MarketplaceSource) -> Option<PathBuf> {
    if is_local_source(&mp.url) {
        let p = PathBuf::from(&mp.url);
        return if p.is_dir() { Some(p) } else { None };
    }
    let cached = get_marketplaces_cache_dir().join(&mp.id);
    if cached.is_dir() { Some(cached) } else { None }
}

fn read_custom_marketplaces() -> Vec<MarketplaceSource> {
    fs::read_to_string(get_marketplaces_file())
        .ok()
        .and_then(|c| serde_json::from_str::<Vec<MarketplaceSource>>(&c).ok())
        .unwrap_or_default()
}

fn write_custom_marketplaces(customs: &[MarketplaceSource]) -> Result<(), String> {
    let file = get_marketplaces_file();
    if let Some(parent) = file.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(customs).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| format!("Failed to save marketplaces.json: {}", e))
}

pub fn list_marketplaces() -> Vec<MarketplaceSource> {
    let mut all = get_default_marketplaces();
    let home = get_home_dir();

    // Legacy Claude Code layout: marketplaces cloned under ~/.claude/plugins/marketplaces/*
    let claude_mps_dir = home.join(".claude").join("plugins").join("marketplaces");
    if let Ok(entries) = fs::read_dir(&claude_mps_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let dir_name = entry.file_name().to_string_lossy().to_string();
            if !path.is_dir() || dir_name.starts_with('.') || dir_name.ends_with(".bak") {
                continue;
            }

            let has_items = path.join(".claude-plugin").join("marketplace.json").exists()
                || ["plugins", "external_plugins", "skills", "agents", "commands", "rules"]
                    .iter()
                    .any(|sub| {
                        let sf = path.join(sub);
                        sf.is_dir() && fs::read_dir(&sf).map(|mut r| r.next().is_some()).unwrap_or(false)
                    });
            if !has_items {
                continue;
            }

            if let Some(existing) = all.iter_mut().find(|m| m.id == dir_name) {
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
                    id: dir_name.clone(),
                    name: pretty_name,
                    url: path.to_string_lossy().to_string(),
                    description: format!("Local marketplace in ~/.claude/plugins/marketplaces/{}", dir_name),
                    default_marketplace: false,
                    synced: false,
                });
            }
        }
    }

    // Antigravity / Gemini locally installed plugins, exposed as a read-only local marketplace.
    let gemini_dir = get_gemini_plugins_dir();
    if gemini_dir.is_dir() {
        all.push(MarketplaceSource {
            id: GEMINI_MARKETPLACE_ID.to_string(),
            name: "Gemini (local plugins)".to_string(),
            url: gemini_dir.to_string_lossy().to_string(),
            description: "Plugins installed under ~/.gemini/config/plugins".to_string(),
            default_marketplace: true,
            synced: false,
        });
    }

    for c in read_custom_marketplaces() {
        if !all.iter().any(|m| m.id == c.id) {
            all.push(c);
        }
    }

    for m in &mut all {
        m.synced = resolve_marketplace_root(m).is_some();
    }
    all
}

fn slugify(name: &str) -> String {
    name.trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

pub fn add_marketplace(name: &str, url: &str, description: &str) -> Result<MarketplaceSource, String> {
    let id = slugify(name);
    if id.is_empty() {
        return Err("Marketplace name must contain letters or numbers.".to_string());
    }
    let normalized_url = normalize_marketplace_url(url);
    if normalized_url.is_empty() {
        return Err("Marketplace URL or path is required.".to_string());
    }
    if is_local_source(&normalized_url) && !Path::new(&normalized_url).is_dir() {
        return Err(format!("Local path '{}' is not a directory.", normalized_url));
    }

    let current = list_marketplaces();
    let canonical = canonical_url(&normalized_url);
    if current.iter().any(|m| m.id == id || canonical_url(&m.url) == canonical) {
        return Err(format!("Marketplace '{}' or URL already registered.", name));
    }

    let mut new_mp = MarketplaceSource {
        id: id.clone(),
        name: name.trim().to_string(),
        url: normalized_url,
        description: description.trim().to_string(),
        default_marketplace: false,
        synced: false,
    };

    // Fetch before persisting so an unreachable repository is never registered.
    if !is_local_source(&new_mp.url) {
        clone_marketplace_cache(&new_mp)?;
    }
    new_mp.synced = true;

    let mut customs = read_custom_marketplaces();
    customs.push(new_mp.clone());
    write_custom_marketplaces(&customs)?;

    Ok(new_mp)
}

pub fn remove_marketplace(id: &str) -> Result<(), String> {
    let current = list_marketplaces();
    match current.iter().find(|m| m.id == id) {
        Some(t) if t.default_marketplace => {
            return Err("Cannot remove default official marketplace.".to_string());
        }
        Some(_) => {}
        None => return Err(format!("Marketplace '{}' not found.", id)),
    }

    let all_customs = read_custom_marketplaces();
    if !all_customs.iter().any(|m| m.id == id) {
        return Err(format!("Marketplace '{}' is managed by Claude Code and cannot be removed here.", id));
    }
    let customs: Vec<MarketplaceSource> = all_customs.into_iter().filter(|m| m.id != id).collect();
    write_custom_marketplaces(&customs)
        .map_err(|e| format!("Failed to update marketplaces.json: {}", e))?;
    let _ = fs::remove_dir_all(get_marketplaces_cache_dir().join(id));

    Ok(())
}

fn shallow_clone(url: &str, git_ref: Option<&str>, dest: &Path) -> Result<(), String> {
    let mut args = vec!["clone", "--depth", "1"];
    if let Some(r) = git_ref {
        args.push("--branch");
        args.push(r);
    }
    let dest_str = dest.to_string_lossy().to_string();
    args.push(url);
    args.push(&dest_str);

    let output = Command::new("git")
        .args(&args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;
    if !output.status.success() {
        let _ = fs::remove_dir_all(dest);
        return Err(format!("Git clone of '{}' failed: {}", url, String::from_utf8_lossy(&output.stderr).trim()));
    }
    Ok(())
}

fn run_git(repo: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Best-effort pin of a shallow clone to an exact commit; keeps the cloned ref when the commit is unreachable.
fn checkout_sha(repo: &Path, sha: &str) {
    if run_git(repo, &["rev-parse", "HEAD"]).map(|head| head == sha).unwrap_or(false) {
        return;
    }
    let pinned = run_git(repo, &["fetch", "--depth", "1", "origin", sha])
        .and_then(|_| run_git(repo, &["checkout", "--quiet", sha]));
    if let Err(e) = pinned {
        log::warn!("Could not pin {} to commit {}: {}", repo.display(), sha, e);
    }
}

/// Clones the marketplace into a temp folder and swaps it into the cache, keeping the old copy on failure.
fn clone_marketplace_cache(mp: &MarketplaceSource) -> Result<PathBuf, String> {
    let cache_root = get_marketplaces_cache_dir();
    fs::create_dir_all(&cache_root).map_err(|e| e.to_string())?;
    let target = cache_root.join(&mp.id);
    let staging = cache_root.join(format!(".{}.staging", mp.id));
    let _ = fs::remove_dir_all(&staging);

    shallow_clone(&mp.url, None, &staging)?;
    let _ = fs::remove_dir_all(&target);
    fs::rename(&staging, &target).map_err(|e| format!("Failed to update marketplace cache: {}", e))?;
    // Entries with `"source": "./"` copy the cache root itself, so git metadata must not live there.
    let _ = fs::remove_dir_all(target.join(".git"));
    Ok(target)
}

/// Re-fetches a marketplace (git sources only) and returns its catalog size.
pub fn refresh_marketplace(id: &str) -> Result<usize, String> {
    let mp = list_marketplaces()
        .into_iter()
        .find(|m| m.id == id)
        .ok_or_else(|| format!("Marketplace '{}' not found.", id))?;

    let root = if is_local_source(&mp.url) {
        resolve_marketplace_root(&mp).ok_or_else(|| format!("Local path '{}' does not exist.", mp.url))?
    } else {
        clone_marketplace_cache(&mp)?
    };
    Ok(catalog_from_root(&root, &mp.id).len())
}

fn json_author(v: &serde_json::Value) -> Option<String> {
    match v.get("author") {
        Some(serde_json::Value::String(s)) => Some(s.clone()),
        Some(obj) => obj.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()),
        None => None,
    }
}

fn json_string_list(v: &serde_json::Value, key: &str) -> Vec<String> {
    v.get(key)
        .and_then(|t| t.as_array())
        .map(|arr| arr.iter().filter_map(|t| t.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default()
}

/// Parses `.claude-plugin/marketplace.json` plugin entries, resolving each `source` shape.
fn catalog_from_marketplace_json(root: &Path, marketplace_id: &str) -> Vec<MarketplaceCatalogItem> {
    let manifest = root.join(".claude-plugin").join("marketplace.json");
    let Some(v) = fs::read_to_string(&manifest)
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
    else {
        return Vec::new();
    };

    let mut items = Vec::new();
    for entry in v.get("plugins").and_then(|p| p.as_array()).into_iter().flatten() {
        let Some(name) = entry.get("name").and_then(|n| n.as_str()) else { continue };

        let (source_url, source_subdir, source_ref, source_sha) = match entry.get("source") {
            Some(serde_json::Value::String(rel)) => {
                (root.join(rel.trim_start_matches("./")).to_string_lossy().to_string(), None, None, None)
            }
            Some(src) => {
                let git_ref = src.get("ref").and_then(|r| r.as_str()).map(|s| s.to_string());
                let sha = src.get("sha").and_then(|r| r.as_str()).map(|s| s.to_string());
                let url = match src.get("source").and_then(|s| s.as_str()) {
                    Some("github") => src.get("repo").and_then(|r| r.as_str()).map(|r| format!("https://github.com/{}", r)),
                    _ => src.get("url").and_then(|u| u.as_str()).map(|s| s.to_string()),
                };
                let Some(url) = url else { continue };
                let subdir = src.get("path").and_then(|p| p.as_str()).map(|s| s.to_string());
                (url, subdir, git_ref, sha)
            }
            None => continue,
        };

        let mut tags = json_string_list(entry, "tags");
        if tags.is_empty() {
            tags = json_string_list(entry, "keywords");
        }
        if let Some(cat) = entry.get("category").and_then(|c| c.as_str()) {
            tags.insert(0, cat.to_string());
        }
        tags.push(ExtensionType::Plugin.as_str().to_string());
        tags.dedup();

        let components = component_summary(Path::new(&source_url));
        items.push(MarketplaceCatalogItem {
            id: name.to_string(),
            name: name.to_string(),
            extension_type: ExtensionType::Plugin,
            description: entry.get("description").and_then(|d| d.as_str()).unwrap_or_default().to_string(),
            source_url,
            marketplace_id: marketplace_id.to_string(),
            version: entry.get("version").and_then(|s| s.as_str()).map(|s| s.to_string()),
            author: json_author(entry),
            tags,
            is_installed: false,
            source_subdir,
            source_ref,
            source_sha,
            components,
        });
    }
    items
}

fn count_entries(dir: &Path, only_md_files: bool) -> usize {
    fs::read_dir(dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    if name.starts_with('.') || name.eq_ignore_ascii_case("README.md") {
                        return false;
                    }
                    !only_md_files || name.ends_with(".md")
                })
                .count()
        })
        .unwrap_or(0)
}

/// Summarizes what a local plugin directory ships (skills, agents, commands, hooks, MCP, LSP).
fn component_summary(plugin_dir: &Path) -> Vec<String> {
    if !plugin_dir.is_dir() {
        return Vec::new();
    }
    let mut parts = Vec::new();
    for (folder, singular, only_md) in [("skills", "skill", false), ("agents", "agent", true), ("commands", "command", true)] {
        let n = count_entries(&plugin_dir.join(folder), only_md);
        if n > 0 {
            parts.push(format!("{} {}{}", n, singular, if n == 1 { "" } else { "s" }));
        }
    }
    if plugin_dir.join("hooks").is_dir() {
        parts.push("hooks".to_string());
    }
    if plugin_dir.join(".mcp.json").exists() {
        parts.push("MCP".to_string());
    }
    if plugin_dir.join(".lsp.json").exists() {
        parts.push("LSP".to_string());
    }
    parts
}

fn scan_directory_for_catalog(root_dir: &Path, marketplace_id: &str) -> Vec<MarketplaceCatalogItem> {
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
        let Ok(entries) = fs::read_dir(root_dir.join(subfolder)) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || name == "node_modules" || name.eq_ignore_ascii_case("README.md") {
                continue;
            }
            if path.is_file() && !(name.ends_with(".md") || name.ends_with(".mdc") || name.ends_with(".json")) {
                continue;
            }

            let (title, desc, mut tags, _) = parse_item_metadata(&path, ext_type);
            let id = name
                .strip_suffix(".mdc")
                .or_else(|| name.strip_suffix(".md"))
                .unwrap_or(&name)
                .to_string();

            let mut version = None;
            let mut author = None;
            for p_json in [path.join("plugin.json"), path.join(".claude-plugin").join("plugin.json")] {
                if let Some(v) = fs::read_to_string(&p_json)
                    .ok()
                    .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                {
                    version = v.get("version").and_then(|s| s.as_str()).map(|s| s.to_string());
                    author = json_author(&v);
                }
            }

            if !tags.contains(&ext_type.as_str().to_string()) {
                tags.push(ext_type.as_str().to_string());
            }
            let components = if *ext_type == ExtensionType::Plugin { component_summary(&path) } else { Vec::new() };

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
                source_subdir: None,
                source_ref: None,
                source_sha: None,
                components,
            });
        }
    }

    items
}

/// Catalog for one marketplace root: manifest entries first, then conventional folders.
pub fn catalog_from_root(root: &Path, marketplace_id: &str) -> Vec<MarketplaceCatalogItem> {
    let mut items = catalog_from_marketplace_json(root, marketplace_id);
    items.extend(scan_directory_for_catalog(root, marketplace_id));

    let mut seen = HashSet::new();
    items.retain(|item| seen.insert(format!("{}:{}", item.extension_type.as_str(), item.id)));
    items
}

/// Gemini plugins live directly under the plugins dir, one folder per plugin.
fn gemini_catalog(dir: &Path) -> Vec<MarketplaceCatalogItem> {
    let mut items = Vec::new();
    let Ok(entries) = fs::read_dir(dir) else { return items };
    for entry in entries.flatten() {
        let p = entry.path();
        let dir_name = entry.file_name().to_string_lossy().to_string();
        if p.is_dir() && !dir_name.starts_with('.') {
            let (title, desc, tags, _) = parse_item_metadata(&p, &ExtensionType::Plugin);
            items.push(MarketplaceCatalogItem {
                id: dir_name.clone(),
                name: if title.is_empty() { dir_name } else { title },
                extension_type: ExtensionType::Plugin,
                description: desc,
                source_url: p.to_string_lossy().to_string(),
                marketplace_id: GEMINI_MARKETPLACE_ID.to_string(),
                version: None,
                author: None,
                tags,
                is_installed: false,
                source_subdir: None,
                source_ref: None,
                source_sha: None,
                components: component_summary(&p),
            });
        }
    }
    items
}

fn catalog_for_marketplace(mp: &MarketplaceSource) -> Vec<MarketplaceCatalogItem> {
    let Some(root) = resolve_marketplace_root(mp) else { return Vec::new() };
    let mut items = if mp.id == GEMINI_MARKETPLACE_ID {
        gemini_catalog(&root)
    } else {
        catalog_from_root(&root, &mp.id)
    };
    for item in &mut items {
        item.is_installed = get_vault_dir(&item.extension_type).join(&item.id).exists();
    }
    items
}

pub fn get_marketplace_catalog() -> Vec<MarketplaceCatalogItem> {
    let mut catalog: Vec<MarketplaceCatalogItem> =
        list_marketplaces().iter().flat_map(catalog_for_marketplace).collect();
    catalog.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    catalog
}

/// Copies a catalog item's real files into `target_dir`. Never fabricates content.
fn install_item_into(item: &MarketplaceCatalogItem, target_dir: &Path) -> Result<(), String> {
    if !is_local_source(&item.source_url) {
        let temp_dir = std::env::temp_dir().join(format!("one_ring_mp_{}_{}", std::process::id(), item.id));
        let _ = fs::remove_dir_all(&temp_dir);
        shallow_clone(&item.source_url, item.source_ref.as_deref(), &temp_dir)?;
        if let Some(sha) = &item.source_sha {
            checkout_sha(&temp_dir, sha);
        }
        let _ = fs::remove_dir_all(temp_dir.join(".git"));

        let src = match &item.source_subdir {
            Some(subdir) => temp_dir.join(subdir),
            None => temp_dir.clone(),
        };
        let result = if src.is_dir() {
            copy_dir_all_recursive(&src, target_dir)
        } else {
            Err(format!(
                "Path '{}' not found in repository '{}'.",
                item.source_subdir.as_deref().unwrap_or("."),
                item.source_url
            ))
        };
        let _ = fs::remove_dir_all(&temp_dir);
        return result;
    }

    let local_path = PathBuf::from(&item.source_url);
    if local_path.is_dir() {
        return copy_dir_all_recursive(&local_path, target_dir)
            .map_err(|e| format!("Failed to copy item from local marketplace into Vault: {}", e));
    }
    if local_path.is_file() {
        fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;
        let dest_filename = match item.extension_type {
            ExtensionType::Skill => "SKILL.md",
            ExtensionType::Agent => "AGENT.md",
            ExtensionType::Plugin => "plugin.json",
            ExtensionType::Command => "COMMAND.md",
            ExtensionType::Rule => "RULE.md",
        };
        return fs::copy(&local_path, target_dir.join(dest_filename))
            .map(|_| ())
            .map_err(|e| format!("Failed to copy file into Vault: {}", e));
    }

    Err(format!("Source '{}' is not available locally.", item.source_url))
}

pub fn install_marketplace_item(
    item_id: &str,
    marketplace_id: &str,
    ext_type: &ExtensionType,
) -> Result<String, String> {
    let mp = list_marketplaces()
        .into_iter()
        .find(|m| m.id == marketplace_id)
        .ok_or_else(|| format!("Marketplace '{}' not found.", marketplace_id))?;
    let catalog = catalog_for_marketplace(&mp);
    let item = catalog
        .iter()
        .find(|i| i.id == item_id && i.marketplace_id == marketplace_id && &i.extension_type == ext_type)
        .ok_or_else(|| format!("Catalog item '{}' not found in marketplace '{}'. Try syncing it.", item_id, marketplace_id))?;

    let target_dir = get_vault_dir(ext_type).join(item_id);
    if target_dir.exists() {
        return Err(format!("Item '{}' already installed in Vault.", item_id));
    }

    if let Err(e) = install_item_into(item, &target_dir) {
        let _ = fs::remove_dir_all(&target_dir);
        return Err(e);
    }

    if *ext_type == ExtensionType::Plugin {
        let _ = sync_vault_manifests();
    }
    Ok(item_id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("one_ring_mp_test_{}_{}", label, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_default_marketplaces() {
        let defaults = get_default_marketplaces();
        assert!(defaults.len() >= 3);
        assert!(defaults.iter().any(|m| m.id == "claude-plugins-official"));
        assert!(defaults.iter().all(|m| m.url.starts_with("https://github.com/")));
    }

    #[test]
    fn test_catalog_from_marketplace_json_source_shapes() {
        let root = fixture_dir("manifest");
        fs::create_dir_all(root.join(".claude-plugin")).unwrap();
        fs::create_dir_all(root.join("plugins").join("local-one")).unwrap();
        fs::write(
            root.join(".claude-plugin").join("marketplace.json"),
            r#"{"name":"m","plugins":[
                {"name":"local-one","description":"Rel","source":"./plugins/local-one","author":{"name":"Acme"},"category":"dev"},
                {"name":"url-one","source":{"source":"url","url":"https://example.com/a.git"}},
                {"name":"gh-one","source":{"source":"github","repo":"acme/gh"}},
                {"name":"sub-one","source":{"source":"git-subdir","url":"https://example.com/b.git","path":"plugins/x","ref":"v1","sha":"abc123"}}
            ]}"#,
        )
        .unwrap();

        let items = catalog_from_root(&root, "m");
        let get = |id: &str| items.iter().find(|i| i.id == id).unwrap();

        // local-one appears once even though it is also discovered by folder scan
        assert_eq!(items.iter().filter(|i| i.id == "local-one").count(), 1);
        assert_eq!(get("local-one").source_url, root.join("plugins/local-one").to_string_lossy());
        assert_eq!(get("local-one").author.as_deref(), Some("Acme"));
        assert!(get("local-one").tags.contains(&"dev".to_string()));
        assert_eq!(get("url-one").source_url, "https://example.com/a.git");
        assert_eq!(get("gh-one").source_url, "https://github.com/acme/gh");
        assert_eq!(get("sub-one").source_subdir.as_deref(), Some("plugins/x"));
        assert_eq!(get("sub-one").source_ref.as_deref(), Some("v1"));
        assert_eq!(get("sub-one").source_sha.as_deref(), Some("abc123"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_catalog_folder_scan_fallback() {
        let root = fixture_dir("folders");
        fs::create_dir_all(root.join("skills").join("my-skill")).unwrap();
        fs::write(root.join("skills/my-skill/SKILL.md"), "---\nname: My Skill\ndescription: Does things\n---\n").unwrap();
        fs::create_dir_all(root.join("agents")).unwrap();
        fs::write(root.join("agents/reviewer.md"), "---\nname: reviewer\ndescription: Reviews\n---\n").unwrap();
        fs::write(root.join("agents/README.md"), "# Agents").unwrap();
        fs::create_dir_all(root.join("rules")).unwrap();
        fs::write(root.join("rules/style.mdc"), "# Style").unwrap();

        let items = catalog_from_root(&root, "f");
        assert!(items.iter().any(|i| i.id == "my-skill" && i.extension_type == ExtensionType::Skill && i.name == "My Skill"));
        assert!(items.iter().any(|i| i.id == "reviewer" && i.extension_type == ExtensionType::Agent));
        assert!(items.iter().any(|i| i.id == "style" && i.extension_type == ExtensionType::Rule));
        assert!(!items.iter().any(|i| i.id == "README"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_install_item_copies_real_files_or_fails() {
        let root = fixture_dir("install");
        fs::create_dir_all(root.join("skills/real")).unwrap();
        fs::write(root.join("skills/real/SKILL.md"), "real content").unwrap();
        fs::write(root.join("skills/real/helper.py"), "print(1)").unwrap();

        let items = catalog_from_root(&root, "i");
        let item = items.iter().find(|i| i.id == "real").unwrap();
        let target = root.join("out").join("real");
        install_item_into(item, &target).unwrap();
        assert_eq!(fs::read_to_string(target.join("SKILL.md")).unwrap(), "real content");
        assert!(target.join("helper.py").exists());

        // Missing local source must error instead of writing a stub
        let mut missing = item.clone();
        missing.source_url = root.join("does-not-exist").to_string_lossy().to_string();
        let missing_target = root.join("out").join("missing");
        assert!(install_item_into(&missing, &missing_target).is_err());
        assert!(!missing_target.exists());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_install_root_source_plugin() {
        let root = fixture_dir("rootsrc");
        fs::create_dir_all(root.join(".claude-plugin")).unwrap();
        fs::write(
            root.join(".claude-plugin").join("marketplace.json"),
            r#"{"plugins":[{"name":"whole","source":"./"}]}"#,
        )
        .unwrap();
        fs::write(root.join("README.md"), "# Whole repo plugin").unwrap();

        let items = catalog_from_root(&root, "r");
        let item = items.iter().find(|i| i.id == "whole").unwrap();
        let target = std::env::temp_dir().join(format!("one_ring_mp_test_rootsrc_out_{}", std::process::id()));
        let _ = fs::remove_dir_all(&target);
        install_item_into(item, &target).unwrap();
        assert!(target.join("README.md").exists());
        assert!(target.join(".claude-plugin").join("marketplace.json").exists());

        let _ = fs::remove_dir_all(&target);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_component_summary() {
        let dir = fixture_dir("components");
        fs::create_dir_all(dir.join("skills/a")).unwrap();
        fs::create_dir_all(dir.join("skills/b")).unwrap();
        fs::create_dir_all(dir.join("agents")).unwrap();
        fs::write(dir.join("agents/one.md"), "x").unwrap();
        fs::write(dir.join("agents/README.md"), "x").unwrap();
        fs::create_dir_all(dir.join("hooks")).unwrap();
        fs::write(dir.join(".mcp.json"), "{}").unwrap();

        assert_eq!(component_summary(&dir), vec!["2 skills", "1 agent", "hooks", "MCP"]);
        assert!(component_summary(&dir.join("missing")).is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_canonical_url_dedupes_variants() {
        assert_eq!(canonical_url("https://github.com/A/Repo.git"), canonical_url("https://github.com/a/repo/"));
        assert_ne!(canonical_url("https://github.com/a/repo"), canonical_url("https://github.com/a/other"));
    }

    #[test]
    fn test_remove_default_marketplace_rejected() {
        assert!(remove_marketplace("claude-plugins-official").is_err());
    }

    #[test]
    fn test_refresh_marketplace_unknown_id() {
        assert!(refresh_marketplace("definitely-not-registered").is_err());
    }

    #[test]
    fn test_normalize_and_slugify() {
        assert_eq!(normalize_marketplace_url("acme/ai-plugins"), "https://github.com/acme/ai-plugins");
        assert_eq!(normalize_marketplace_url(" https://github.com/a/b "), "https://github.com/a/b");
        assert_eq!(normalize_marketplace_url("/tmp/local-mp"), "/tmp/local-mp");
        assert_eq!(slugify("Acme AI / Registry!"), "acme-ai-registry");
    }
}
