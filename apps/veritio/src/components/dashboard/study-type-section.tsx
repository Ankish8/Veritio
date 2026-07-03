"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StudyTypeCard } from "./study-type-card";
import { useVisibleUseCases } from "@/lib/plugins/study-type-icons";

const CATEGORY_TABS = [
  { id: "all", label: "All", description: "All available study types" },
  {
    id: "ia",
    label: "Information Architecture",
    description: "How users organize and find content",
  },
  {
    id: "usability",
    label: "Usability Testing",
    description: "Can users complete tasks on your design?",
  },
  {
    id: "design",
    label: "Design Validation",
    description: "What do users think and feel about your design?",
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Collect opinions and insights from users",
  },
] as const;

type CategoryFilter = (typeof CATEGORY_TABS)[number]["id"];

interface StudyTypeSectionProps {
  hideHeading?: boolean;
}

export function StudyTypeSection({ hideHeading }: StudyTypeSectionProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const el = tabRefs.current.get(activeCategory);
    if (el) {
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeCategory]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const visibleUseCases = useVisibleUseCases();

  const filteredUseCases = useMemo(
    () =>
      activeCategory === "all"
        ? visibleUseCases
        : visibleUseCases.filter((s) => s.category === activeCategory),
    [activeCategory, visibleUseCases],
  );

  return (
    <div>
      {!hideHeading && (
        <h2 className="text-xl font-semibold text-foreground mb-5">
          Create a new study
        </h2>
      )}

      <div
        ref={containerRef}
        className="scrollbar-hide relative -mx-4 mb-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        <div
          className="absolute top-0 rounded-full bg-foreground transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            left: indicator.left,
            width: indicator.width,
            height: "100%",
          }}
        />
        {CATEGORY_TABS.map((tab) => (
          <Tooltip key={tab.id} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                }}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  "relative z-10 min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                  activeCategory === tab.id
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {tab.label}
              </button>
            </TooltipTrigger>
            {tab.id !== "all" && (
              <TooltipContent side="bottom" className="text-xs">
                {tab.description}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredUseCases.map((useCase) => (
          <StudyTypeCard key={useCase.id} useCase={useCase} />
        ))}
      </div>
    </div>
  );
}
