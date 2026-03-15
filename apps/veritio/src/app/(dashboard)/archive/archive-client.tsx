"use client"

import { useState } from "react"
import {
  FolderKanban,
  FlaskConical,
  Layers3,
  GitBranch,
  RotateCcw,
  Trash2,
  Archive,
  MoreVertical,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useArchivedProjects, useArchivedStudies } from "@/hooks/use-archive"
import { toast } from "@/components/ui/sonner"

function ArchivedProjectsTab() {
  const { projects, isLoading, error, restoreProject, deleteProject } = useArchivedProjects()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleRestore = async (projectId: string, projectName: string) => {
    try {
      await restoreProject(projectId)
      toast.success(`"${projectName}" restored`)
    } catch {
      toast.error("Failed to restore project")
    }
  }

  const handleDelete = async () => {
    if (!projectToDelete) return
    try {
      await deleteProject(projectToDelete.id)
      toast.success(`"${projectToDelete.name}" permanently deleted`)
    } catch {
      toast.error("Failed to delete project")
    } finally {
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-destructive/60 p-12 text-center bg-destructive/5">
        <FolderKanban className="h-12 w-12 mx-auto text-destructive/50" />
        <h3 className="font-semibold text-foreground mt-4">Failed to load archived projects</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {error}
        </p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No archived projects"
        description="Projects you archive will appear here. You can restore them at any time."
      />
    )
  }

  return (
    <>
      <div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Project</TableHead>
              <TableHead>Studies</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                      <FolderKanban className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{project.study_count} studies</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRestore(project.id, project.name)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setProjectToDelete({ id: project.id, name: project.name })
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{projectToDelete?.name}" and all its studies.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ArchivedStudiesTab() {
  const { studies, isLoading, error, restoreStudy, deleteStudy } = useArchivedStudies()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studyToDelete, setStudyToDelete] = useState<{ id: string; title: string } | null>(null)

  const handleRestore = async (studyId: string, studyTitle: string) => {
    try {
      await restoreStudy(studyId)
      toast.success(`"${studyTitle}" restored`)
    } catch {
      toast.error("Failed to restore study")
    }
  }

  const handleDelete = async () => {
    if (!studyToDelete) return
    try {
      await deleteStudy(studyToDelete.id)
      toast.success(`"${studyToDelete.title}" permanently deleted`)
    } catch {
      toast.error("Failed to delete study")
    } finally {
      setDeleteDialogOpen(false)
      setStudyToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-destructive/60 p-12 text-center bg-destructive/5">
        <FlaskConical className="h-12 w-12 mx-auto text-destructive/50" />
        <h3 className="font-semibold text-foreground mt-4">Failed to load archived studies</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {error}
        </p>
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No archived studies"
        description="Studies you archive will appear here. You can restore them at any time."
      />
    )
  }

  return (
    <>
      <div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Study</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studies.map((study) => (
              <TableRow key={study.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                      {study.study_type === "card_sort" ? (
                        <Layers3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <GitBranch className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <span className="font-medium text-foreground">{study.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground capitalize">
                    {study.study_type.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{study.participant_count}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRestore(study.id, study.title)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setStudyToDelete({ id: study.id, title: study.title })
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete study permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{studyToDelete?.title}" and all its data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function ArchiveClient() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Archive className="h-5 w-5" />
        <p className="text-sm">
          Archived items are hidden from your main views. You can restore them at any time.
        </p>
      </div>

      <Tabs defaultValue="studies" className="w-full">
        <TabsList variant="underline">
          <TabsTrigger value="studies" variant="underline">
            Studies
          </TabsTrigger>
          <TabsTrigger value="projects" variant="underline">
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studies" className="mt-4">
          <ArchivedStudiesTab />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <ArchivedProjectsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
