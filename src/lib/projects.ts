import type { Project, SavedTestCase, HistoryItem, TestSuite, AIProvider } from '@/types'

const PROJECTS_STORAGE_KEY = 'testforge-projects'
const CURRENT_PROJECT_KEY = 'testforge-current-project'

// ─── Project Storage Keys ──────────────────────────────────────────────────────

function getProjectConfigKey(projectId: string): string {
  return `testforge-config-${projectId}`
}

function getProjectCasesKey(projectId: string): string {
  return `testforge-cases-${projectId}`
}

function getProjectHistoryKey(projectId: string): string {
  return `testforge-history-${projectId}`
}

function getProjectSuitesKey(projectId: string): string {
  return `testforge-suites-${projectId}`
}

// ─── Project Management ────────────────────────────────────────────────────────

export function getAllProjects(): Project[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

export function getProject(projectId: string): Project | null {
  const projects = getAllProjects()
  return projects.find(p => p.id === projectId) || null
}

export function createProject(name: string, description?: string): Project {
  const project: Project = {
    id: Math.random().toString(36).slice(2, 10),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  const projects = getAllProjects()
  projects.push(project)
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  
  return project
}

export function updateProject(projectId: string, updates: Partial<Project>): Project | null {
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === projectId)
  if (index === -1) return null
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  return projects[index]
}

export function deleteProject(projectId: string): boolean {
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === projectId)
  if (index === -1) return false
  
  // Delete project-specific data
  localStorage.removeItem(getProjectConfigKey(projectId))
  localStorage.removeItem(getProjectCasesKey(projectId))
  localStorage.removeItem(getProjectHistoryKey(projectId))
  
  // Remove project
  projects.splice(index, 1)
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  
  // If deleted project was current, switch to first available or null
  const currentId = getCurrentProjectId()
  if (currentId === projectId) {
    if (projects.length > 0) {
      setCurrentProjectId(projects[0].id)
    } else {
      setCurrentProjectId(null)
    }
  }
  
  return true
}

// ─── Current Project ───────────────────────────────────────────────────────────

export function getCurrentProjectId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CURRENT_PROJECT_KEY)
  } catch {
    return null
  }
}

export function setCurrentProjectId(projectId: string | null): void {
  if (typeof window === 'undefined') return
  if (projectId) {
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId)
  } else {
    localStorage.removeItem(CURRENT_PROJECT_KEY)
  }
}

export function getCurrentProject(): Project | null {
  const projectId = getCurrentProjectId()
  if (!projectId) return null
  return getProject(projectId)
}

// ─── Project-Scoped Config ─────────────────────────────────────────────────────

export type Environment = string // Changed to string to support custom environments

export interface ProjectConfig {
  timeout: number
  retries: number
  workers: number
  baseUrl: string
  reporter: 'html' | 'list' | 'dot'
  apiAuthMethod: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth' | 'oauth2' | 'custom'
  apiAuthToken: string
  apiBasicUsername: string
  apiBasicPassword: string
  apiKeyName: string
  apiKeyValue: string
  apiOAuthToken: string
  apiOAuth2GrantType: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token'
  apiOAuth2AuthUrl: string
  apiOAuth2TokenUrl: string
  apiOAuth2ClientId: string
  apiOAuth2ClientSecret: string
  apiOAuth2Scope: string
  apiOAuth2RedirectUri: string
  apiOAuth2Username: string
  apiOAuth2Password: string
  apiOAuth2RefreshToken: string
  apiOAuth2AccessToken: string
  apiCustomAuth: string
  apiContentType: string
  apiCustomHeader: string
  aiProvider: AIProvider
  apiKey: string
  aiModel: string
  aiBaseUrl: string
  customProviderName: string
}

export interface ProjectEnvironments {
  [env: string]: Partial<ProjectConfig>
}

export function loadProjectConfig(projectId: string, environment?: Environment): Partial<ProjectConfig> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    if (!raw) return null
    
    const data = JSON.parse(raw)
    
    // If it's the old format (single config), migrate it
    if (!data.environments && !environment) {
      // Return old format for backward compatibility
      return data as Partial<ProjectConfig>
    }
    
    // New format with environments
    if (data.environments) {
      const env = environment || data.currentEnvironment || 'dev'
      return data.environments[env] || null
    }
    
    return null
  } catch {
    return null
  }
}

export function saveProjectConfig(projectId: string, config: Partial<ProjectConfig>, environment?: Environment): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    let data: { environments?: ProjectEnvironments; currentEnvironment?: Environment } = {}
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        // If old format, migrate to new format
        if (!parsed.environments) {
          data.environments = {
            dev: parsed as Partial<ProjectConfig>
          }
          data.currentEnvironment = 'dev'
        } else {
          data = parsed
        }
      } catch {
        // Start fresh
      }
    }
    
    if (!data.environments) {
      data.environments = {}
    }
    
    const env = environment || data.currentEnvironment || 'dev'
    data.currentEnvironment = env
    
    const existing = data.environments[env] || {}
    data.environments[env] = { ...existing, ...config }
    
    localStorage.setItem(getProjectConfigKey(projectId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function getCurrentEnvironment(projectId: string): Environment {
  if (typeof window === 'undefined') return 'dev'
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    if (!raw) return 'dev'
    const data = JSON.parse(raw)
    return data.currentEnvironment || 'dev'
  } catch {
    return 'dev'
  }
}

export function setCurrentEnvironment(projectId: string, environment: Environment): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    let data: { environments?: ProjectEnvironments; currentEnvironment?: Environment } = {}
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.environments) {
          data = parsed
        } else {
          // Migrate old format
          data.environments = {
            dev: parsed as Partial<ProjectConfig>
          }
        }
      } catch {
        // Start fresh
      }
    }
    
    if (!data.environments) {
      data.environments = {}
    }
    
    data.currentEnvironment = environment
    localStorage.setItem(getProjectConfigKey(projectId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function getAllEnvironments(projectId: string): Environment[] {
  if (typeof window === 'undefined') return ['dev']
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    if (!raw) return ['dev']
    const data = JSON.parse(raw)
    
    if (data.environments) {
      return Object.keys(data.environments) as Environment[]
    }
    
    return ['dev']
  } catch {
    return ['dev']
  }
}

export function createEnvironment(projectId: string, name: string): Environment | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    let data: { environments?: ProjectEnvironments; currentEnvironment?: Environment } = {}
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.environments) {
          data = parsed
        } else {
          // Migrate old format
          data.environments = {
            dev: parsed as Partial<ProjectConfig>
          }
        }
      } catch {
        // Start fresh
      }
    }
    
    if (!data.environments) {
      data.environments = {}
    }
    
    const normalizedName = name.toLowerCase()
    if (data.environments[normalizedName]) {
      console.warn(`Environment with name '${name}' already exists.`)
      return null
    }
    
    // Create a default config for the new environment
    const defaultConfig: Partial<ProjectConfig> = {
      timeout: 30000,
      retries: 2,
      workers: 4,
      baseUrl: 'https://demo.playwright.dev',
      reporter: 'html',
      apiAuthMethod: 'none',
      apiContentType: 'application/json',
      apiKeyName: 'X-API-Key',
      aiProvider: 'anthropic',
      aiBaseUrl: 'http://localhost:11434/v1',
    }
    
    data.environments[normalizedName] = defaultConfig
    data.currentEnvironment = normalizedName
    localStorage.setItem(getProjectConfigKey(projectId), JSON.stringify(data))
    return normalizedName
  } catch {
    return null
  }
}

export function deleteEnvironment(projectId: string, name: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    if (!raw) return false
    
    const data = JSON.parse(raw)
    if (!data.environments) return false
    
    const normalizedName = name.toLowerCase()
    const envKeys = Object.keys(data.environments)
    
    // Don't allow deleting the last environment
    if (envKeys.length <= 1) {
      console.warn('Cannot delete the last remaining environment.')
      return false
    }
    
    delete data.environments[normalizedName]
    
    // If deleted environment was current, switch to first available
    if (data.currentEnvironment === normalizedName) {
      const remaining = Object.keys(data.environments)
      if (remaining.length > 0) {
        data.currentEnvironment = remaining[0]
      }
    }
    
    localStorage.setItem(getProjectConfigKey(projectId), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function renameEnvironment(projectId: string, oldName: string, newName: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(getProjectConfigKey(projectId))
    if (!raw) return false
    
    const data = JSON.parse(raw)
    if (!data.environments) return false
    
    const normalizedOldName = oldName.toLowerCase()
    const normalizedNewName = newName.toLowerCase()
    
    // Check if new name already exists
    if (data.environments[normalizedNewName]) {
      return false
    }
    
    // Move config to new name
    if (data.environments[normalizedOldName]) {
      data.environments[normalizedNewName] = data.environments[normalizedOldName]
      delete data.environments[normalizedOldName]
      
      // Update current environment if it was the renamed one
      if (data.currentEnvironment === normalizedOldName) {
        data.currentEnvironment = normalizedNewName
      }
      
      localStorage.setItem(getProjectConfigKey(projectId), JSON.stringify(data))
      return true
    }
    
    return false
  } catch {
    return false
  }
}

// ─── Project-Scoped Test Cases ────────────────────────────────────────────────

export function loadProjectCases(projectId: string): SavedTestCase[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getProjectCasesKey(projectId))
    if (!raw) return []
    return JSON.parse(raw) as SavedTestCase[]
  } catch {
    return []
  }
}

export function saveProjectCases(projectId: string, cases: SavedTestCase[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getProjectCasesKey(projectId), JSON.stringify(cases))
  } catch {
    // ignore
  }
}

// ─── Project-Scoped History ────────────────────────────────────────────────────

export function loadProjectHistory(projectId: string): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getProjectHistoryKey(projectId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryItem[]
    // Convert timestamp strings back to Date objects
    return parsed.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }))
  } catch {
    return []
  }
}

export function saveProjectHistory(projectId: string, history: HistoryItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getProjectHistoryKey(projectId), JSON.stringify(history))
  } catch {
    // ignore
  }
}

// ─── Project-Scoped Test Suites ──────────────────────────────────────────────

export function loadProjectSuites(projectId: string): TestSuite[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getProjectSuitesKey(projectId))
    if (!raw) return []
    return JSON.parse(raw) as TestSuite[]
  } catch {
    return []
  }
}

export function saveProjectSuites(projectId: string, suites: TestSuite[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getProjectSuitesKey(projectId), JSON.stringify(suites))
  } catch {
    // ignore
  }
}

// ─── Migration: Migrate old data to default project ───────────────────────────

export function migrateToProjects(): void {
  if (typeof window === 'undefined') return
  
  // Check if migration already done
  if (localStorage.getItem('testforge-migrated')) return
  
  // Check if old data exists
  const oldConfig = localStorage.getItem('testforge-config')
  const oldCases = localStorage.getItem('testforge-cases')
  
  if (!oldConfig && !oldCases) {
    localStorage.setItem('testforge-migrated', 'true')
    return
  }
  
  // Create default project
  const defaultProject = createProject('Default Project', 'Migrated from single-project setup')
  setCurrentProjectId(defaultProject.id)
  
  // Migrate config
  if (oldConfig) {
    try {
      const config = JSON.parse(oldConfig)
      saveProjectConfig(defaultProject.id, config)
      localStorage.removeItem('testforge-config')
    } catch {}
  }
  
  // Migrate cases
  if (oldCases) {
    try {
      const cases = JSON.parse(oldCases)
      saveProjectCases(defaultProject.id, cases)
      localStorage.removeItem('testforge-cases')
    } catch {}
  }
  
  localStorage.setItem('testforge-migrated', 'true')
}
