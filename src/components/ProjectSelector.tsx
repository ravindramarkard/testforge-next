'use client'
import { useState, useEffect } from 'react'
import type { Project } from '@/types'
import {
  getAllProjects,
  getCurrentProject,
  setCurrentProjectId,
  createProject,
  updateProject,
  deleteProject,
  migrateToProjects,
} from '@/lib/projects'
import clsx from 'clsx'

interface Props {
  onProjectChange?: (project: Project | null) => void
}

export default function ProjectSelector({ onProjectChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [editProject, setEditProject] = useState<Project | null>(null)

  // Load projects and current project on mount
  useEffect(() => {
    // Migrate old data if needed
    migrateToProjects()

    const loadedProjects = getAllProjects()
    setProjects(loadedProjects)

    const current = getCurrentProject()
    setCurrentProject(current)

    // Notify parent once after initial load.
    // We intentionally don't include `onProjectChange` in the deps array to avoid
    // re-running this effect on every render when the parent passes a new callback,
    // which can cause an infinite update loop.
    onProjectChange?.(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProjectId(projectId)
      setCurrentProject(project)
      onProjectChange?.(project)
    }
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    
    const project = createProject(newProjectName.trim(), newProjectDesc.trim() || undefined)
    const updatedProjects = getAllProjects()
    setProjects(updatedProjects)
    setCurrentProjectId(project.id)
    setCurrentProject(project)
    onProjectChange?.(project)
    setShowCreateModal(false)
    setNewProjectName('')
    setNewProjectDesc('')
  }

  const handleEditProject = () => {
    if (!editProject || !newProjectName.trim()) return
    
    const updated = updateProject(editProject.id, {
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
    })
    
    if (updated) {
      const updatedProjects = getAllProjects()
      setProjects(updatedProjects)
      if (currentProject?.id === updated.id) {
        setCurrentProject(updated)
        onProjectChange?.(updated)
      }
      setShowEditModal(false)
      setEditProject(null)
      setNewProjectName('')
      setNewProjectDesc('')
    }
  }

  const handleDeleteProject = () => {
    if (!projectToDelete) return
    
    deleteProject(projectToDelete.id)
    const updatedProjects = getAllProjects()
    setProjects(updatedProjects)
    
    const current = getCurrentProject()
    setCurrentProject(current)
    onProjectChange?.(current)
    
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const openEditModal = (project: Project) => {
    setEditProject(project)
    setNewProjectName(project.name)
    setNewProjectDesc(project.description || '')
    setShowEditModal(true)
  }

  const openDeleteConfirm = (project: Project) => {
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  if (projects.length === 0 && !showCreateModal) {
    // No projects exist, show create button prominently
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <span className="text-sm text-blue-700 dark:text-blue-300">No projects yet. Create your first project to get started.</span>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Create Project
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={currentProject?.id || ''}
          onChange={(e) => handleProjectSelect(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => {
            setNewProjectName('')
            setNewProjectDesc('')
            setShowCreateModal(true)
          }}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Create new project"
        >
          + New
        </button>
        
        {currentProject && (
          <>
            <button
              onClick={() => openEditModal(currentProject)}
              className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Edit project"
            >
              ✏️
            </button>
            {projects.length > 1 && (
              <button
                onClick={() => openDeleteConfirm(currentProject)}
                className="px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-100 transition-colors"
                title="Delete project"
              >
                🗑️
              </button>
            )}
          </>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          style={{ minHeight: '100vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false)
              setNewProjectName('')
              setNewProjectDesc('')
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., E-commerce Tests"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                    if (e.key === 'Escape') setShowCreateModal(false)
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief description of this project..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewProjectName('')
                  setNewProjectDesc('')
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          style={{ minHeight: '100vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false)
              setEditProject(null)
              setNewProjectName('')
              setNewProjectDesc('')
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditProject()
                    if (e.key === 'Escape') setShowEditModal(false)
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditProject(null)
                  setNewProjectName('')
                  setNewProjectDesc('')
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          style={{ minHeight: '100vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false)
              setProjectToDelete(null)
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Delete Project</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{projectToDelete.name}</strong>? This will permanently delete all test cases, history, and configuration for this project. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteProject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setProjectToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
