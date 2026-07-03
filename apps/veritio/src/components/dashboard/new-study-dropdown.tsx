"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateStudyWithProjectDialog } from "./create-study-with-project-dialog";
import { useVisibleUseCases } from "@/lib/plugins/study-type-icons";

interface NewStudyDropdownProps {
  /** When set, studies are created directly in this project (skips project selection). */
  projectId?: string;
  className?: string;
}

export function NewStudyDropdown({
  projectId,
  className,
}: NewStudyDropdownProps = {}) {
  const visibleUseCases = useVisibleUseCases();
  const activeCases = visibleUseCases.filter((uc) => !uc.comingSoon);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className ?? "rounded-lg shadow-sm"}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Study
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[min(70dvh,28rem)] w-[min(calc(100vw-2rem),18rem)] overflow-y-auto"
      >
        {activeCases.map((useCase) => {
          const Icon = useCase.icon;
          return (
            <CreateStudyWithProjectDialog
              key={useCase.id}
              useCase={useCase}
              presetProjectId={projectId}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-3 py-2.5 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">{useCase.name}</span>
                </DropdownMenuItem>
              }
            />
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
