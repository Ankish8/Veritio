'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FolderKanban, MoreHorizontal, Pencil, Trash2, FlaskConical, Archive, Search, ArrowUpDown, Check, Eye } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateProjectDialog } from '@veritio/dashboard-common/create-project-dialog'
import { EditProjectDialog } from '@veritio/dashboard-common/edit-project-dialog'
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProjectGridSkeleton } from '@/components/dashboard/skeletons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useProjects, type ProjectWithCount } from '@/hooks/use-projects'
import { prefetchProjectStudies, prefetchIfFast } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useCurrentOrganization } from '@/hooks/use-organizations'
import { calculatePermissions } from '@/lib/supabase/collaboration-types'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'

interface ProjectsClientProps {
  initialData?: ProjectWithCount[]
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

export function ProjectsClient({ initialData }: ProjectsClientProps = {}) {
  const router = useRouter()
  // Pass initialData to SWR - no loading state on first render when data is prefetched
  const { projects, isLoading, error, createProject, updateProject, deleteProject, archiveProject } = useProjects(initialData)

  const { currentOrg } = useCurrentOrganization()
  const permissions = useMemo(
    () => calculatePermissions((currentOrg?.user_role || 'viewer') as OrganizationRole),
    [currentOrg?.user_role]
  )

  // Track which projects we've already prefetched to avoid duplicate requests
  const prefetchedRef = useRef<Set<string>>(new Set())

  // Prefetch project studies on hover - fires once per project
  const handlePrefetch = useCallback((projectId: string) => {
    if (!prefetchedRef.current.has(projectId)) {
      prefetchedRef.current.add(projectId)
      prefetchIfFast(() => prefetchProjectStudies(projectId))
    }
  }, [])

  const [editDialog, setEditDialog] = useState<{ open: boolean; project: ProjectWithCount | null }>({
    open: false,
    project: null,
  })

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; id: string; name: string; studyCount: number }>({
    open: false,
    id: '',
    name: '',
    studyCount: 0,
  })
  const [isArchiving, setIsArchiving] = useState(false)

  // Search and sort
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'studies'>('recent')

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = projects

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'studies':
          return b.study_count - a.study_count
        case 'recent':
        default:
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      }
    })
  }, [projects, searchQuery, sortBy])

  const handleProjectCreated = (project: { id: string }) => {
    toast.success('Project created successfully')
    router.push(`/projects/${project.id}`)
  }

  const handleProjectUpdated = (project: { id: string; name: string }) => {
    toast.success(`"${project.name}" has been updated`)
  }

  const openEditDialog = (project: ProjectWithCount) => {
    setEditDialog({ open: true, project })
  }

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name })
  }

  const handleDelete = async () => {
    const projectName = deleteDialog.name
    const projectId = deleteDialog.id

    // Close dialog immediately for optimistic UI
    setDeleteDialog({ open: false, id: '', name: '' })
    setIsDeleting(true)

    try {
      await deleteProject(projectId)
      toast.success(`"${projectName}" has been deleted`)
    } catch {
      toast.error('Failed to delete project', {
        description: 'Please try again or contact support if the issue persists.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openArchiveDialog = (id: string, name: string, studyCount: number) => {
    setArchiveDialog({ open: true, id, name, studyCount })
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    try {
      await archiveProject(archiveDialog.id)
      toast.success(`"${archiveDialog.name}" has been archived`)
      setArchiveDialog({ open: false, id: '', name: '', studyCount: 0 })
    } catch {
      toast.error('Failed to archive project', {
        description: 'Please try again or contact support if the issue persists.',
      })
    } finally {
      setIsArchiving(false)
    }
  }

  // Calculate stats
  const totalStudies = useMemo(() =>
    projects.reduce((sum, p) => sum + p.study_count, 0),
    [projects]
  )

  // Show loading skeleton while hydrating or on first load with no data
  if (!projects.length && isLoading) {
    return (
      <>
        <Header title="Projects" />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <ProjectGridSkeleton count={6} />
        </div>
      </>
    )
  }

  if (error && !projects.length) {
    return (
      <>
        <Header title="Projects" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Failed to load projects</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Projects">
        {/* Search in header */}
        {projects.length > 0 && (
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        )}
        {permissions.canCreate && (
          <CreateProjectDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            }
            createProject={createProject}
            onSuccess={handleProjectCreated}
          />
        )}
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {projects.length === 0 ? (
          /* Empty State - More inviting and modern */
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="max-w-md text-center">
              {/* Decorative illustration */}
              <div className="relative mx-auto mb-6 w-32 h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-3xl rotate-6" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-3xl -rotate-3" />
                <div className="relative flex h-full items-center justify-center rounded-3xl bg-card border border-border/60 shadow-sm">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/60" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground">
                Create your first project
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Projects help you organize your UX research studies. Start by creating a project, then add card sorts, tree tests, or surveys.
              </p>

              {permissions.canCreate && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <CreateProjectDialog
                    trigger={
                      <Button size="lg" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Project
                      </Button>
                    }
                    createProject={createProject}
                    onSuccess={handleProjectCreated}
                  />
                </div>
              )}

            </div>
          </div>
        ) : (
          <>
            {/* Stats bar with sort */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </span>
                <span className="text-border">•</span>
                <span className="text-muted-foreground">
                  {totalStudies} {totalStudies === 1 ? 'study' : 'studies'} total
                </span>
              </div>

              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-sm">
                      {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Studies'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('recent')}>
                    {sortBy === 'recent' && <Check className="mr-2 h-4 w-4" />}
                    <span className={sortBy !== 'recent' ? 'ml-6' : ''}>Recently Updated</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    {sortBy === 'name' && <Check className="mr-2 h-4 w-4" />}
                    <span className={sortBy !== 'name' ? 'ml-6' : ''}>Name A-Z</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('studies')}>
                    {sortBy === 'studies' && <Check className="mr-2 h-4 w-4" />}
                    <span className={sortBy !== 'studies' ? 'ml-6' : ''}>Most Studies</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Project grid */}
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No projects match &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Clear search
                </button>
              </div>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((project) => {
                const relativeTime = formatRelativeTime(project.updated_at)

                return (
                  <div
                    key={project.id}
                    className={cn(
                      "group relative rounded-xl border bg-card overflow-hidden",
                      "border-border/60 hover:border-border/80",
                      "hover:shadow-sm",
                      "transition-all duration-150"
                    )}
                    onMouseEnter={() => handlePrefetch(project.id)}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="block p-5"
                      prefetch={true}
                    >
                      {/* Content */}
                      <div className="pr-6">
                        <h3 className="font-semibold text-foreground truncate">
                          {project.name}
                        </h3>
                        {project.description ? (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 mt-1 italic">
                            No description
                          </p>
                        )}
                      </div>

                      {/* Footer with stats */}
                      <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FlaskConical className="h-3.5 w-3.5" />
                          <span>{project.study_count} {project.study_count === 1 ? 'study' : 'studies'}</span>
                        </div>

                        {/* Last updated */}
                        {relativeTime && (
                          <span className="text-xs text-muted-foreground/60">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Dropdown menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Project
                          </Link>
                        </DropdownMenuItem>
                        {permissions.canEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              openEditDialog(project)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {permissions.canCreate && (
                          <DropdownMenuItem
                            onClick={() => openArchiveDialog(project.id, project.name, project.study_count)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {permissions.canCreate && (
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            onClick={() => openDeleteDialog(project.id, project.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
            )}
          </>
        )}
      </div>

      {editDialog.project && (
        <EditProjectDialog
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
          projectId={editDialog.project.id}
          initialName={editDialog.project.name}
          initialDescription={editDialog.project.description}
          updateProject={updateProject}
          onSuccess={handleProjectUpdated}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        itemName={deleteDialog.name}
        itemType="project"
        onConfirm={handleDelete}
        loading={isDeleting}
      />

      <AlertDialog open={archiveDialog.open} onOpenChange={(open) => setArchiveDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive &quot;{archiveDialog.name}&quot;
              {archiveDialog.studyCount > 0 && (
                <> and all {archiveDialog.studyCount} {archiveDialog.studyCount === 1 ? 'study' : 'studies'} within it</>
              )}
              . Archived items are hidden from your main views but can be restored anytime from the Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
