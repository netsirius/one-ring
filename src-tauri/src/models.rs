use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ExtensionType {
    Skill,
    Agent,
    Plugin,
    Command,
    Rule,
}

impl ExtensionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ExtensionType::Skill => "skill",
            ExtensionType::Agent => "agent",
            ExtensionType::Plugin => "plugin",
            ExtensionType::Command => "command",
            ExtensionType::Rule => "rule",
        }
    }

    pub fn folder_name(&self) -> &'static str {
        match self {
            ExtensionType::Skill => "skills",
            ExtensionType::Agent => "agents",
            ExtensionType::Plugin => "plugins",
            ExtensionType::Command => "commands",
            ExtensionType::Rule => "rules",
        }
    }

    pub fn from_folder(folder: &str) -> Option<Self> {
        match folder {
            "skills" => Some(ExtensionType::Skill),
            "agents" => Some(ExtensionType::Agent),
            "plugins" => Some(ExtensionType::Plugin),
            "commands" => Some(ExtensionType::Command),
            "rules" => Some(ExtensionType::Rule),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LinkStatus {
    Linked,
    Unlinked,
    Incompatible,
    Broken,
    ForeignLink { destination: String },
    UnmanagedCopy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTarget {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub description: String,
    pub is_installed: bool,
    pub supported_types: Vec<ExtensionType>,
    pub type_global_dirs: HashMap<String, String>,
    pub type_local_dirs: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultItem {
    pub id: String,
    pub name: String,
    pub extension_type: ExtensionType,
    pub description: String,
    pub path: String,
    pub source: Option<String>,
    pub tags: Vec<String>,
    pub is_directory: bool,
    pub has_doc: bool,
    pub global_status: HashMap<String, LinkStatus>,
    pub supported_agents: Vec<String>,
}

// Backward compatibility alias for SkillItem
pub type SkillItem = VaultItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectItemStatus {
    pub item_id: String,
    pub extension_type: ExtensionType,
    pub status: LinkStatus,
    pub target_agent: String,
    pub path: String,
}

pub type ProjectSkillStatus = ProjectItemStatus;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectWorkspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub items: Vec<ProjectItemStatus>,
    // backward compat field
    pub skills: Vec<ProjectItemStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoctorIssue {
    pub id: String,
    pub title: String,
    pub description: String,
    pub severity: String, // "warning", "error", "info"
    pub issue_type: String, // "broken_symlink", "unmanaged_copy", "orphan"
    pub extension_type: ExtensionType,
    pub target_path: String,
    pub vault_path: Option<String>,
    pub item_name: Option<String>,
    pub target_agent: Option<String>,
    pub can_auto_fix: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub name: String,
    pub extension_type: ExtensionType,
    pub original_path: String,
    pub trash_path: String,
    pub deleted_at: String,
    pub is_unmanaged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub total_vault_items: usize,
    pub total_vault_skills: usize,
    pub total_vault_agents: usize,
    pub total_vault_plugins: usize,
    pub total_vault_commands: usize,
    pub total_vault_rules: usize,
    pub active_global_links: usize,
    pub active_project_links: usize,
    pub detected_agents: usize,
    pub doctor_issues_count: usize,
    pub doctor_broken_count: usize,
    pub doctor_unmanaged_count: usize,
    pub trash_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_type_folders() {
        assert_eq!(ExtensionType::Skill.folder_name(), "skills");
        assert_eq!(ExtensionType::Agent.folder_name(), "agents");
        assert_eq!(ExtensionType::Plugin.folder_name(), "plugins");
        assert_eq!(ExtensionType::Command.folder_name(), "commands");
        assert_eq!(ExtensionType::Rule.folder_name(), "rules");

        assert_eq!(ExtensionType::from_folder("skills"), Some(ExtensionType::Skill));
        assert_eq!(ExtensionType::from_folder("plugins"), Some(ExtensionType::Plugin));
        assert_eq!(ExtensionType::from_folder("agents"), Some(ExtensionType::Agent));
        assert_eq!(ExtensionType::from_folder("commands"), Some(ExtensionType::Command));
        assert_eq!(ExtensionType::from_folder("rules"), Some(ExtensionType::Rule));
        assert_eq!(ExtensionType::from_folder("unknown"), None);
    }

    #[test]
    fn test_extension_type_serialization() {
        let json = serde_json::to_string(&ExtensionType::Skill).unwrap();
        assert_eq!(json, "\"skill\"");

        let parsed: ExtensionType = serde_json::from_str("\"plugin\"").unwrap();
        assert_eq!(parsed, ExtensionType::Plugin);
    }

    #[test]
    fn test_link_status_serde() {
        let status = LinkStatus::Linked;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"linked\"");

        let parsed: LinkStatus = serde_json::from_str("\"unmanaged_copy\"").unwrap();
        assert_eq!(parsed, LinkStatus::UnmanagedCopy);
    }
}

