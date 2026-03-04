'use client'
import { useState, useCallback } from 'react'
import type { TestSuite, SavedTestCase, TestType } from '@/types'
import clsx from 'clsx'

interface Props {
  suites: TestSuite[]
  testCases: SavedTestCase[]
  /**
   * Create a new suite.
   * initialTestCaseIds allows attaching test cases at creation time.
   */
  onCreate: (name: string, description?: string, initialTestCaseIds?: string[]) => void
  onUpdate: (id: string, name: string, description?: string) => void
  onDelete: (id: string) => void
  onAddTestCase: (suiteId: string, testCaseId: string) => void
  onRemoveTestCase: (suiteId: string, testCaseId: string) => void
  onRunSuite?: (suite: TestSuite) => void
}

export default function TestSuitesPanel({
  suites,
  testCases,
  onCreate,
  onUpdate,
  onDelete,
  onAddTestCase,
  onRemoveTestCase,
  onRunSuite,
}: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<TestSuite | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TestSuite | null>(null)
  const [newSuiteName, setNewSuiteName] = useState('')
  const [newSuiteDesc, setNewSuiteDesc] = useState('')
  const [newSuiteSelectedIds, setNewSuiteSelectedIds] = useState<string[]>([])
  const [editSuiteName, setEditSuiteName] = useState('')
  const [editSuiteDesc, setEditSuiteDesc] = useState('')
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null)
  const [testTypeFilter, setTestTypeFilter] = useState<TestType | 'all'>('all')
  const [createModalFilter, setCreateModalFilter] = useState<TestType | 'all'>('all')
  const [createModalSearch, setCreateModalSearch] = useState('')

  const handleCreate = useCallback(() => {
    if (newSuiteName.trim()) {
      onCreate(
        newSuiteName.trim(),
        newSuiteDesc.trim() || undefined,
        newSuiteSelectedIds.length ? newSuiteSelectedIds : undefined,
      )
      setNewSuiteName('')
      setNewSuiteDesc('')
      setNewSuiteSelectedIds([])
      setShowCreateModal(false)
    }
  }, [newSuiteName, newSuiteDesc, newSuiteSelectedIds, onCreate])

  const handleEdit = useCallback(() => {
    if (showEditModal && editSuiteName.trim()) {
      onUpdate(showEditModal.id, editSuiteName.trim(), editSuiteDesc.trim() || undefined)
      setShowEditModal(null)
      setEditSuiteName('')
      setEditSuiteDesc('')
    }
  }, [showEditModal, editSuiteName, editSuiteDesc, onUpdate])

  const startEdit = useCallback((suite: TestSuite) => {
    setShowEditModal(suite)
    setEditSuiteName(suite.name)
    setEditSuiteDesc(suite.description || '')
  }, [])

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete(showDeleteConfirm.id)
      setShowDeleteConfirm(null)
    }
  }, [showDeleteConfirm, onDelete])

  const getTestCaseById = useCallback((id: string) => {
    return testCases.find(tc => tc.id === id)
  }, [testCases])

  const getAvailableTestCases = useCallback((suite: TestSuite) => {
    let filtered = testCases.filter(tc => !suite.testCaseIds.includes(tc.id))
    if (testTypeFilter !== 'all') {
      filtered = filtered.filter(tc => tc.testType === testTypeFilter)
    }
    return filtered
  }, [testCases, testTypeFilter])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-forge-surface border-b border-forge-border shrink-0">
        <span className="text-[10px] font-mono text-forge-muted mr-auto">
          {suites.length} test {suites.length === 1 ? 'suite' : 'suites'}
        </span>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1 rounded border border-forge-border bg-forge-surface2
            text-[11px] font-mono text-forge-text hover:text-forge-accent hover:border-forge-accent transition-all"
        >
          + New Suite
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {suites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-forge-muted border border-dashed border-forge-border/60 rounded-lg bg-forge-surface2/40">
            <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center text-2xl mb-2">
              📦
            </div>
            <p className="text-forge-text font-bold text-sm mb-1">No test suites yet</p>
            <p className="text-[11px] max-w-sm leading-relaxed px-4">
              Create a suite (Smoke, Regression, Sanity, etc.) and then add test cases from the <span className="font-mono">Test Cases</span> tab.
            </p>
          </div>
        )}

        {suites.map((suite) => {
          const suiteTestCases = suite.testCaseIds.map(id => getTestCaseById(id)).filter(Boolean) as SavedTestCase[]
          const availableCases = getAvailableTestCases(suite)
          const isExpanded = expandedSuite === suite.id

          return (
            <div
              key={suite.id}
              className="group bg-forge-surface border border-forge-border rounded-lg overflow-hidden"
            >
              {/* Suite Header */}
              <div className="p-3">
                <div className="flex items-start gap-2 mb-1.5">
                  <button
                    onClick={() => setExpandedSuite(isExpanded ? null : suite.id)}
                    className="flex-1 text-left"
                  >
                    <span className="text-[12px] font-bold text-forge-text">
                      {suite.name}
                    </span>
                    {suite.description && (
                      <p className="text-[10px] text-forge-dim mt-0.5">{suite.description}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRunSuite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRunSuite(suite) }}
                        className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2
                          text-forge-muted hover:text-forge-green hover:border-forge-green transition-all"
                        title="Run Suite"
                      >
                        ▶️
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(suite) }}
                      className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2
                        text-forge-muted hover:text-forge-text hover:border-forge-accent transition-all"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(suite) }}
                      className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2
                        text-forge-muted hover:text-forge-red hover:border-forge-red transition-all"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-forge-muted">
                  <span>{suiteTestCases.length} test {suiteTestCases.length === 1 ? 'case' : 'cases'}</span>
                  <span className="text-forge-dim">
                    {new Date(suite.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-forge-border p-3 bg-forge-surface2">
                  {/* Test Cases in Suite */}
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-forge-muted uppercase mb-2">
                      Test Cases ({suiteTestCases.length})
                    </p>
                    {suiteTestCases.length === 0 ? (
                      <p className="text-[10px] text-forge-dim">No test cases in this suite</p>
                    ) : (
                      <div className="space-y-1">
                        {suiteTestCases.map((tc) => {
                          const typeColors: Record<TestType, string> = {
                            ui: 'bg-forge-accent/10 text-forge-accent border-forge-accent/30',
                            api: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                            e2e: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                            performance: 'bg-forge-green/10 text-forge-green border-forge-green/30',
                          }
                          return (
                            <div
                              key={tc.id}
                              className="flex items-center justify-between px-2 py-1 bg-forge-surface rounded border border-forge-border gap-2"
                            >
                              <span className="text-[10px] font-mono text-forge-text truncate flex-1">
                                {tc.name}
                              </span>
                              <span className={clsx(
                                'px-1.5 py-px rounded border text-[8px] font-bold font-mono shrink-0',
                                typeColors[tc.testType]
                              )}>
                                {tc.testType.toUpperCase()}
                              </span>
                              <button
                                onClick={() => onRemoveTestCase(suite.id, tc.id)}
                                className="px-1 py-0.5 text-[9px] text-forge-red hover:bg-forge-red/10 rounded shrink-0"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Test Cases */}
                  {testCases.filter(tc => !suite.testCaseIds.includes(tc.id)).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-forge-muted uppercase">
                          Add Test Cases
                        </p>
                        {/* Filter buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTestTypeFilter('all')}
                            className={clsx(
                              'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                              testTypeFilter === 'all'
                                ? 'bg-forge-accent text-forge-bg border-forge-accent'
                                : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-accent'
                            )}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setTestTypeFilter('ui')}
                            className={clsx(
                              'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                              testTypeFilter === 'ui'
                                ? 'bg-forge-accent/10 text-forge-accent border-forge-accent'
                                : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-accent/50'
                            )}
                          >
                            UI
                          </button>
                          <button
                            onClick={() => setTestTypeFilter('api')}
                            className={clsx(
                              'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                              testTypeFilter === 'api'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/50'
                                : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-purple-500/50'
                            )}
                          >
                            API
                          </button>
                          <button
                            onClick={() => setTestTypeFilter('performance')}
                            className={clsx(
                              'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                              testTypeFilter === 'performance'
                                ? 'bg-forge-green/10 text-forge-green border-forge-green/50'
                                : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-green/50'
                            )}
                          >
                            Perf
                          </button>
                        </div>
                      </div>
                      {availableCases.length === 0 ? (
                        <p className="text-[10px] text-forge-dim py-2">
                          No {testTypeFilter === 'all' ? '' : testTypeFilter.toUpperCase()} test cases available
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {availableCases.map((tc) => {
                            const typeColors: Record<TestType, string> = {
                              ui: 'bg-forge-accent/10 text-forge-accent border-forge-accent/30',
                              api: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                              e2e: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                              performance: 'bg-forge-green/10 text-forge-green border-forge-green/30',
                            }
                            return (
                              <button
                                key={tc.id}
                                onClick={() => onAddTestCase(suite.id, tc.id)}
                                className="w-full text-left px-2 py-1 bg-forge-surface rounded border border-forge-border
                                  text-[10px] font-mono text-forge-text hover:border-forge-accent hover:bg-forge-accent/5 transition-all
                                  flex items-center justify-between gap-2"
                              >
                                <span className="truncate flex-1">+ {tc.name}</span>
                                <span className={clsx(
                                  'px-1.5 py-px rounded border text-[8px] font-bold font-mono shrink-0',
                                  typeColors[tc.testType]
                                )}>
                                  {tc.testType.toUpperCase()}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-4">Create Test Suite</h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[11px] font-bold text-forge-muted uppercase mb-2">
                  Suite Name *
                </label>
                <input
                  type="text"
                  value={newSuiteName}
                  onChange={(e) => setNewSuiteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') setShowCreateModal(false)
                  }}
                  placeholder="e.g., Smoke Suite, Regression Suite"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-forge-surface2 border border-forge-border rounded-md
                    text-[12px] font-mono text-forge-text outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-forge-muted uppercase mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newSuiteDesc}
                  onChange={(e) => setNewSuiteDesc(e.target.value)}
                  placeholder="Describe what this suite tests..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-forge-surface2 border border-forge-border rounded-md
                    text-[12px] font-mono text-forge-text outline-none focus:border-blue-500 resize-y"
                />
              </div>

              {/* Optional: attach test cases on creation */}
              {testCases.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-forge-muted uppercase">
                      Add Test Cases (optional)
                    </p>
                    <span className="text-[10px] font-mono text-forge-dim">
                      {newSuiteSelectedIds.length} selected
                    </span>
                  </div>
                  <p className="text-[10px] text-forge-dim mb-2">
                    Pick existing test cases from the <span className="font-mono">Test Cases</span> tab to include in this suite.
                  </p>

                  {/* Filter & search */}
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCreateModalFilter('all')}
                        className={clsx(
                          'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                          createModalFilter === 'all'
                            ? 'bg-forge-accent text-forge-bg border-forge-accent'
                            : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-accent'
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setCreateModalFilter('ui')}
                        className={clsx(
                          'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                          createModalFilter === 'ui'
                            ? 'bg-forge-accent/10 text-forge-accent border-forge-accent'
                            : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-accent/50'
                        )}
                      >
                        UI
                      </button>
                      <button
                        onClick={() => setCreateModalFilter('api')}
                        className={clsx(
                          'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                          createModalFilter === 'api'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/50'
                            : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-purple-500/50'
                        )}
                      >
                        API
                      </button>
                      <button
                        onClick={() => setCreateModalFilter('performance')}
                        className={clsx(
                          'px-2 py-0.5 rounded text-[9px] font-bold font-mono border transition-all',
                          createModalFilter === 'performance'
                            ? 'bg-forge-green/10 text-forge-green border-forge-green/50'
                            : 'bg-forge-surface2 text-forge-muted border-forge-border hover:border-forge-green/50'
                        )}
                      >
                        Perf
                      </button>
                    </div>
                    <input
                      type="text"
                      value={createModalSearch}
                      onChange={(e) => setCreateModalSearch(e.target.value)}
                      placeholder="Search…"
                      className="flex-1 min-w-0 px-2 py-1 bg-forge-surface2 border border-forge-border rounded-md text-[10px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>

                  {/* Dual list selector */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 text-[11px] items-stretch">
                    {/* Available */}
                    <div className="border border-forge-border/70 rounded-md bg-forge-surface2/60 max-h-48 overflow-y-auto">
                      {(() => {
                        const available = testCases.filter((tc) => {
                          const typeOk = createModalFilter === 'all' || tc.testType === createModalFilter
                          const notSelected = !newSuiteSelectedIds.includes(tc.id)
                          const searchOk =
                            !createModalSearch.trim() ||
                            tc.name.toLowerCase().includes(createModalSearch.toLowerCase())
                          return typeOk && notSelected && searchOk
                        })
                        if (available.length === 0) {
                          return (
                            <p className="px-2 py-2 text-[10px] text-forge-dim">
                              No {createModalFilter === 'all' ? '' : createModalFilter.toUpperCase() + ' '}test cases available
                            </p>
                          )
                        }
                        const typeColors: Record<TestType, string> = {
                          ui: 'bg-forge-accent/10 text-forge-accent border-forge-accent/40',
                          api: 'bg-purple-500/10 text-purple-300 border-purple-500/40',
                          e2e: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
                          performance: 'bg-forge-green/10 text-forge-green border-forge-green/40',
                        }
                        return available.map((tc) => {
                          const checked = newSuiteSelectedIds.includes(tc.id)
                          return (
                            <label
                              key={tc.id}
                              className="w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-forge-surface border-b border-forge-border/40 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  setNewSuiteSelectedIds((prev) =>
                                    e.target.checked
                                      ? [...prev, tc.id]
                                      : prev.filter((id) => id !== tc.id)
                                  )
                                }}
                                className="h-3 w-3 rounded border border-forge-border bg-forge-bg text-forge-accent focus:ring-forge-accent cursor-pointer"
                              />
                              <span className="truncate flex-1 font-mono text-forge-text">
                                {tc.name}
                              </span>
                              <span
                                className={clsx(
                                  'px-1.5 py-px rounded border text-[9px] font-bold font-mono shrink-0',
                                  typeColors[tc.testType],
                                )}
                              >
                                {tc.testType.toUpperCase()}
                              </span>
                            </label>
                          )
                        })
                      })()}
                    </div>

                    {/* Arrow controls */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewSuiteSelectedIds((prev) => {
                            const availableAll = testCases.filter((tc) => {
                              const typeOk = createModalFilter === 'all' || tc.testType === createModalFilter
                              const notSelected = !prev.includes(tc.id)
                              const searchOk =
                                !createModalSearch.trim() ||
                                tc.name.toLowerCase().includes(createModalSearch.toLowerCase())
                              return typeOk && notSelected && searchOk
                            })
                            if (availableAll.length === 0) return prev
                            return [...prev, ...availableAll.map((tc) => tc.id)]
                          })
                        }}
                        className="px-2 py-1 rounded border border-forge-border bg-forge-surface2 hover:border-forge-accent text-[10px] font-mono"
                      >
                        &gt;&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSuiteSelectedIds((prev) => {
                            if (prev.length === 0) return prev
                            return prev.slice(0, -1)
                          })
                        }}
                        className="px-2 py-1 rounded border border-forge-border bg-forge-surface2 hover:border-forge-accent text-[10px] font-mono"
                      >
                        &lt;&lt;
                      </button>
                    </div>

                    {/* Selected */}
                    <div className="border border-forge-border/70 rounded-md bg-forge-surface2/60 max-h-48 overflow-y-auto">
                      {(() => {
                        const selected = testCases.filter((tc) =>
                          newSuiteSelectedIds.includes(tc.id)
                        )
                        if (selected.length === 0) {
                          return (
                            <p className="px-2 py-2 text-[10px] text-forge-dim">
                              No test cases selected yet
                            </p>
                          )
                        }
                        const typeColors: Record<TestType, string> = {
                          ui: 'bg-forge-accent/10 text-forge-accent border-forge-accent/40',
                          api: 'bg-purple-500/10 text-purple-300 border-purple-500/40',
                          e2e: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
                          performance: 'bg-forge-green/10 text-forge-green border-forge-green/40',
                        }
                        return selected.map((tc) => (
                          <label
                            key={tc.id}
                            className="w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-forge-surface border-b border-forge-border/40 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={(e) => {
                                e.stopPropagation()
                                setNewSuiteSelectedIds((prev) => prev.filter((id) => id !== tc.id))
                              }}
                              className="h-3 w-3 rounded border border-forge-border bg-forge-accent text-forge-accent focus:ring-forge-accent cursor-pointer"
                            />
                            <span className="truncate flex-1 font-mono text-forge-text">
                              {tc.name}
                            </span>
                            <span
                              className={clsx(
                                'px-1.5 py-px rounded border text-[9px] font-bold font-mono shrink-0',
                                typeColors[tc.testType],
                              )}
                            >
                              {tc.testType.toUpperCase()}
                            </span>
                          </label>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={!newSuiteName.trim()}
                className="flex-1 px-4 py-2 bg-forge-accent text-forge-bg rounded-md font-bold
                  hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSuiteName('')
                  setNewSuiteDesc('')
                  setNewSuiteSelectedIds([])
                  setCreateModalFilter('all')
                  setCreateModalSearch('')
                }}
                className="px-4 py-2 border border-forge-border rounded-md text-forge-text hover:bg-forge-surface2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-4">Edit Test Suite</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-forge-muted uppercase mb-2">
                  Suite Name *
                </label>
                <input
                  type="text"
                  value={editSuiteName}
                  onChange={(e) => setEditSuiteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit()
                    if (e.key === 'Escape') setShowEditModal(null)
                  }}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-forge-surface2 border border-forge-border rounded-md
                    text-[12px] font-mono text-forge-text outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-forge-muted uppercase mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={editSuiteDesc}
                  onChange={(e) => setEditSuiteDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-forge-surface2 border border-forge-border rounded-md
                    text-[12px] font-mono text-forge-text outline-none focus:border-blue-500 resize-y"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEdit}
                disabled={!editSuiteName.trim()}
                className="flex-1 px-4 py-2 bg-forge-accent text-forge-bg rounded-md font-bold
                  hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditModal(null)
                  setEditSuiteName('')
                  setEditSuiteDesc('')
                }}
                className="px-4 py-2 border border-forge-border rounded-md text-forge-text hover:bg-forge-surface2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-forge-text mb-4">Delete Test Suite</h3>
            <p className="text-[12px] text-forge-muted mb-6">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-forge-red text-white rounded-md font-bold hover:brightness-110"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-forge-border rounded-md text-forge-text hover:bg-forge-surface2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
