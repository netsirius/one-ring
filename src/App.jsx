import React, { useEffect, useState, useCallback } from "react";
import { api } from "./services/api";
import Header from "./components/Header";
import ViewNav from "./components/ViewNav";
import VaultView from "./components/VaultView";
import GlobalSwitchboard from "./components/GlobalSwitchboard";
import ProjectMatrixView from "./components/ProjectMatrixView";
import DoctorView from "./components/DoctorView";
import TrashView from "./components/TrashView";
import SkillDrawer from "./components/SkillDrawer";
import AddSkillModal from "./components/AddSkillModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import { CheckCircle2, Sparkles, Info } from "lucide-react";

export default function App() {
  const [items, setItems] = useState([]);
  const [targets, setTargets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total_vault_items: 0,
    total_vault_skills: 0,
    total_vault_agents: 0,
    total_vault_plugins: 0,
    total_vault_commands: 0,
    total_vault_rules: 0,
    active_global_links: 0,
    active_project_links: 0,
    detected_agents: 0,
    doctor_issues_count: 0,
    doctor_broken_count: 0,
    doctor_unmanaged_count: 0,
    trash_count: 0,
  });
  const [issues, setIssues] = useState([]);
  const [trashItems, setTrashItems] = useState([]);

  const [activeTab, setActiveTab] = useState("vault");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState(null);

  // Modal deletion / quarantine config: { isOpen, item, mode: "trash" | "permanent" | "empty_trash" }
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    item: null,
    mode: "trash",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, icon = "check") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [vItems, aTargets, sProjects, sStats, dIssues, tItems] = await Promise.all([
        api.getVaultItems(),
        api.getAgentTargets(),
        api.getSavedProjects(),
        api.getSystemStats(),
        api.runDoctorDiagnostics(),
        api.listTrashItems(),
      ]);

      setItems(vItems || []);
      setTargets(aTargets || []);
      setProjects(sProjects || []);
      setStats(sStats || {});
      setIssues(dIssues || []);
      setTrashItems(tItems || []);
    } catch (err) {
      console.error("Failed to load One Ring data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGlobal = async (itemId, extType, agentId, enable) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId && i.extension_type === extType) {
          return {
            ...i,
            global_status: {
              ...i.global_status,
              [agentId]: enable ? "linked" : "unlinked",
            },
          };
        }
        return i;
      })
    );

    try {
      await api.toggleGlobalItem(itemId, extType, agentId, enable);
      showToast(`${enable ? "Linked" : "Unlinked"} ${itemId} for ${agentId}`);
      loadData();
    } catch (err) {
      console.error("Failed to toggle global symlink:", err);
      loadData();
    }
  };

  const handleToggleProject = async (projectPath, extType, itemId, agentId, enable) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.path === projectPath) {
          const items = [...(proj.items || [])];
          const idx = items.findIndex(
            (i) => (i.item_id === itemId || i.id === itemId) && i.extension_type === extType
          );
          const newStatus = enable ? "linked" : "unlinked";
          if (idx >= 0) {
            items[idx] = { ...items[idx], status: newStatus };
          } else {
            items.push({
              item_id: itemId,
              extension_type: extType,
              status: newStatus,
              target_agent: agentId,
              path: `${projectPath}/.agents/${extType}s/${itemId}`,
            });
          }
          return { ...proj, items, skills: items };
        }
        return proj;
      })
    );

    try {
      await api.toggleProjectItem(projectPath, extType, itemId, agentId, enable);
      showToast(`${enable ? "Linked" : "Unlinked"} ${itemId} in project`);
      loadData();
    } catch (err) {
      console.error("Failed to toggle project symlink:", err);
      showToast(`Error: ${err}`, "alert");
      loadData();
    }
  };

  const handleAddProject = async (path) => {
    try {
      const added = await api.addProject(path);
      showToast(`Registered workspace: ${path.split("/").pop()}`);
      loadData();
    } catch (err) {
      showToast(`Error adding workspace: ${err}`, "alert");
    }
  };

  const handleRemoveProject = async (path) => {
    setProjects((prev) => prev.filter((p) => p.path !== path));
    try {
      await api.removeProject(path);
      showToast(`Removed workspace from One Ring`);
      loadData();
    } catch (err) {
      console.error("Failed to remove project:", err);
      showToast(`Error removing workspace: ${err}`, "alert");
      loadData();
    }
  };

  const handleRemoveProjectItem = async (projectPath, extType, itemId) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.path === projectPath) {
          const items = (proj.items || []).map((i) => {
            if ((i.item_id === itemId || i.id === itemId) && i.extension_type === extType) {
              return { ...i, status: "unlinked" };
            }
            return i;
          });
          return { ...proj, items, skills: items };
        }
        return proj;
      })
    );

    try {
      await api.removeItemFromProject(projectPath, extType, itemId);
      showToast(`Removed '${itemId}' from workspace`);
      loadData();
    } catch (err) {
      console.error("Failed to remove item from project:", err);
      showToast(`Error: ${err}`, "alert");
      loadData();
    }
  };

  const handleImportItem = async (url, extType, customName) => {
    await api.importItem(url, extType, customName);
    showToast(`Imported extension into Vault`);
    loadData();
  };

  const handleCreateItem = async (name, extType, description, content) => {
    await api.createVaultItem(name, extType, description, content);
    showToast(`Created ${name} in Vault`);
    loadData();
  };

  // 1. Move Vault Item to Trash
  const handleDeleteVaultItem = (itemId, extType) => {
    const target = items.find(
      (i) => i.id === itemId && i.extension_type === extType
    ) || { id: itemId, name: itemId, extension_type: extType, is_unmanaged: false };
    setDeleteModalConfig({
      isOpen: true,
      item: target,
      mode: "trash",
    });
  };

  // 2. Move Unmanaged Copy to Trash (from Doctor)
  const handlePromptMoveUnmanagedToTrash = (sourcePath, extType, itemName) => {
    setDeleteModalConfig({
      isOpen: true,
      item: {
        id: itemName,
        name: itemName,
        extension_type: extType,
        sourcePath,
        is_unmanaged: true,
      },
      mode: "trash",
    });
  };

  // 3. Permanent Deletion from Trash
  const handlePromptPermanentDelete = (trashItem) => {
    setDeleteModalConfig({
      isOpen: true,
      item: trashItem,
      mode: "permanent",
    });
  };

  // 4. Empty Trash Confirmation
  const handlePromptEmptyTrash = () => {
    setDeleteModalConfig({
      isOpen: true,
      item: null,
      mode: "empty_trash",
    });
  };

  // Unified confirmation executor
  const handleConfirmModalAction = async () => {
    const { mode, item } = deleteModalConfig;
    setIsDeleting(true);

    try {
      if (mode === "trash") {
        if (item.is_unmanaged) {
          await api.moveUnmanagedToTrash(item.sourcePath, item.extension_type, item.name);
          showToast(`Moved unmanaged '${item.name}' to Trash`);
        } else {
          await api.moveVaultItemToTrash(item.id, item.extension_type);
          showToast(`Moved '${item.name || item.id}' to Trash`);
          if (inspectingItem && inspectingItem.id === item.id) {
            setInspectingItem(null);
          }
        }
      } else if (mode === "permanent") {
        await api.deleteTrashItemPermanently(item.id);
        showToast(`Permanently deleted '${item.name}' from disk`);
      } else if (mode === "empty_trash") {
        const count = await api.emptyTrash();
        showToast(`Emptied ${count} items from Trash`);
      }

      setDeleteModalConfig({ isOpen: false, item: null, mode: "trash" });
      loadData();
    } catch (err) {
      showToast(`Action failed: ${err}`, "alert");
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore item from Trash
  const handleRestoreTrash = async (trashId, name) => {
    try {
      await api.restoreTrashItem(trashId);
      showToast(`Restored '${name}' to original location`);
      loadData();
    } catch (err) {
      showToast(`Failed to restore: ${err}`, "alert");
    }
  };

  const handleFixDoctorIssue = async (
    targetPath,
    issueType,
    extType,
    vaultPath,
    itemName
  ) => {
    try {
      await api.fixDoctorIssue(targetPath, issueType, extType, vaultPath, itemName);
      showToast(`Repaired ${itemName || targetPath.split("/").pop()}`);
      loadData();
    } catch (err) {
      alert("Failed to repair: " + err);
    }
  };

  const handleAdoptAll = async () => {
    try {
      const count = await api.adoptAllUnmanagedSkills();
      showToast(`Adopted ${count} unmanaged extensions into Vault`);
      loadData();
    } catch (err) {
      alert("Failed to adopt all: " + err);
    }
  };

  const handleOpenFinder = (path) => {
    api.openInFinder(path);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        stats={stats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        theme={theme}
        setTheme={setTheme}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <ViewNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          doctorCount={issues.length}
          brokenCount={issues.filter((i) => i.issue_type === "broken_symlink").length}
          trashCount={trashItems.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {activeTab === "vault" && (
          <VaultView
            items={items}
            targets={targets}
            onToggleGlobal={handleToggleGlobal}
            onInspectItem={(item) => setInspectingItem(item)}
            onOpenFinder={handleOpenFinder}
            onDeleteItem={handleDeleteVaultItem}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            viewMode={viewMode}
            onShowToast={showToast}
          />
        )}

        {activeTab === "switchboard" && (
          <GlobalSwitchboard
            items={items}
            targets={targets}
            onToggleGlobal={handleToggleGlobal}
            onAdoptUnmanaged={(itemId, extType, agentId) => {
              const target = targets.find((t) => t.id === agentId);
              const path = `${target.type_global_dirs[extType]}/${itemId}`;
              handleFixDoctorIssue(path, "unmanaged_copy", extType, null, itemId);
            }}
            onAdoptAll={handleAdoptAll}
            onInspectItem={(item) => setInspectingItem(item)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onShowToast={showToast}
          />
        )}

        {activeTab === "projects" && (
          <ProjectMatrixView
            projects={projects}
            targets={targets}
            items={items}
            vaultItems={items}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
            onToggleProjectItem={handleToggleProject}
            onRemoveProjectItem={handleRemoveProjectItem}
            onOpenFinder={handleOpenFinder}
            onInspectItem={(item) => setInspectingItem(item)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onShowToast={showToast}
          />
        )}

        {activeTab === "doctor" && (
          <DoctorView
            issues={issues}
            onFixIssue={(targetPath, issueType, extType, vaultPath, itemName) => {
              handleFixDoctorIssue(
                targetPath,
                issueType,
                extType,
                vaultPath,
                itemName
              );
            }}
            onAdoptAll={handleAdoptAll}
            onMoveUnmanagedToTrash={handlePromptMoveUnmanagedToTrash}
            onRefresh={loadData}
            isRefreshing={isRefreshing}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onShowToast={showToast}
          />
        )}

        {activeTab === "trash" && (
          <TrashView
            trashItems={trashItems}
            onRestore={handleRestoreTrash}
            onPermanentDelete={handlePromptPermanentDelete}
            onEmptyTrash={handlePromptEmptyTrash}
            onRefresh={loadData}
            isRefreshing={isRefreshing}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenFinder={handleOpenFinder}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Item Inspector Drawer */}
      <SkillDrawer
        item={inspectingItem}
        onClose={() => setInspectingItem(null)}
        onOpenFinder={handleOpenFinder}
        onDeleteItem={handleDeleteVaultItem}
        onShowToast={showToast}
      />

      {/* Add Extension Modal */}
      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onImport={handleImportItem}
        onCreate={handleCreateItem}
        onShowToast={showToast}
      />

      {/* Unified Confirm Deletion / Quarantine Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalConfig.isOpen}
        item={deleteModalConfig.item}
        mode={deleteModalConfig.mode}
        onClose={() => setDeleteModalConfig({ isOpen: false, item: null, mode: "trash" })}
        onConfirm={handleConfirmModalAction}
        isDeleting={isDeleting}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <CheckCircle2 size={14} color="#ffffff" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
