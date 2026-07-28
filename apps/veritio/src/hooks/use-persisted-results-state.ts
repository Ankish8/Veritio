"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildResultsSearchParams,
  mergeResultsStateSources,
  readResultsStateFromSearchParams,
} from "./results-url-state";

const STORAGE_KEY_PREFIX = "results-state-";
const RESULTS_STATE_VERSION = 2;

export interface ResultsPageState {
  stateVersion: number;
  /** Main tab: 'overview' | 'participants' | 'questionnaire' | 'analysis' | 'downloads' | 'sharing' */
  activeMainTab: string;
  /** Participants sub-tab: 'list' | 'segments' */
  participantsSubTab: "list" | "segments";
  /** Status filter: 'included' | 'all' | 'completed' | 'abandoned' | 'in_progress' | 'with_responses' | 'no_responses' | 'excluded' */
  statusFilter: string;
  /** Analysis sub-tab (varies by study type) */
  analysisSubTab: string;
  /** Selected task ID (Tree Test specific) */
  selectedTaskId: string | null;
  /** Active segment ID from segment store */
  activeSegmentId: string | null;
}

const DEFAULT_STATE: ResultsPageState = {
  stateVersion: RESULTS_STATE_VERSION,
  activeMainTab: "overview",
  participantsSubTab: "list",
  statusFilter: "included",
  analysisSubTab: "tasks",
  selectedTaskId: null,
  activeSegmentId: null,
};

/** Hook to persist results page UI state (tabs, filters, selections) in localStorage. */
export function usePersistedResultsState(
  studyId: string,
  overrideDefaults?: Partial<ResultsPageState>,
  availableMainTabs: readonly string[] = [
    "overview",
    "participants",
    "questionnaire",
    "analysis",
    "recordings",
    "report",
  ],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaults = { ...DEFAULT_STATE, ...overrideDefaults };
  const [state, setState] = useState<ResultsPageState>(defaults);
  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = `${STORAGE_KEY_PREFIX}${studyId}`;
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ResultsPageState>;
        const statusFilter =
          parsed.stateVersion === undefined &&
          parsed.statusFilter === "completed"
            ? defaults.statusFilter
            : (parsed.statusFilter ?? defaults.statusFilter);
        // Merge stored values with defaults (in case new fields were added)
        const next = mergeResultsStateSources(
          defaults,
          { ...parsed, statusFilter },
          readResultsStateFromSearchParams(searchParams, availableMainTabs),
        );
        stateRef.current = next;
        setState(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
      } else {
        const next = mergeResultsStateSources(
          defaults,
          {},
          readResultsStateFromSearchParams(searchParams, availableMainTabs),
        );
        stateRef.current = next;
        setState(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, quota exceeded)
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId]); // Only re-run when studyId changes

  // Helper to persist state to localStorage
  const persist = useCallback(
    (newState: ResultsPageState) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch {
        // Ignore localStorage errors
      }
    },
    [storageKey],
  );

  // Browser back/forward navigation should restore the URL-addressed view.
  useEffect(() => {
    if (!isHydrated) return;
    const urlState = readResultsStateFromSearchParams(
      searchParams,
      availableMainTabs,
    );
    if (Object.keys(urlState).length === 0) return;

    // Derived from stateRef, not a setState updater: persisting from inside an
    // updater makes it impure and double-writes under StrictMode.
    const previous = stateRef.current;
    const next = { ...previous, ...urlState };
    if (JSON.stringify(next) === JSON.stringify(previous)) return;

    stateRef.current = next;
    persist(next);
    setState(next);
  }, [availableMainTabs, isHydrated, persist, searchParams]);

  const persistAndAddress = useCallback(
    (newState: ResultsPageState) => {
      stateRef.current = newState;
      persist(newState);
      const params = buildResultsSearchParams(searchParams, newState);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, persist, router, searchParams],
  );

  /**
   * Applies a state patch, then persists and URL-addresses it.
   *
   * The next state is derived from `stateRef` rather than from a `setState`
   * updater callback on purpose. React runs updater callbacks during the render
   * phase and requires them to be pure, so calling `persistAndAddress` (which
   * writes localStorage and calls `router.replace`) from inside one updated the
   * Router while this component was rendering. `stateRef` already tracks the
   * latest state, so reading it here keeps the side effects in the event
   * handler where they belong.
   */
  const applyState = useCallback(
    (patch: Partial<ResultsPageState>) => {
      const next = { ...stateRef.current, ...patch };
      setState(next);
      persistAndAddress(next);
    },
    [persistAndAddress],
  );

  // Individual setters - each updates state and persists
  const setActiveMainTab = useCallback(
    (tab: string) => {
      applyState({ activeMainTab: tab });
    },
    [applyState],
  );

  const setParticipantsSubTab = useCallback(
    (tab: "list" | "segments") => {
      applyState({ participantsSubTab: tab });
    },
    [applyState],
  );

  const setStatusFilter = useCallback(
    (filter: string) => {
      applyState({ statusFilter: filter });
    },
    [applyState],
  );

  const setAnalysisSubTab = useCallback(
    (tab: string) => {
      applyState({ analysisSubTab: tab });
    },
    [applyState],
  );

  const setSelectedTaskId = useCallback(
    (taskId: string | null) => {
      applyState({ selectedTaskId: taskId });
    },
    [applyState],
  );

  const setActiveSegmentId = useCallback(
    (segmentId: string | null) => {
      applyState({ activeSegmentId: segmentId });
    },
    [applyState],
  );

  // Return defaults during SSR to prevent hydration mismatch
  return {
    state: isHydrated ? state : defaults,
    setActiveMainTab,
    setParticipantsSubTab,
    setStatusFilter,
    setAnalysisSubTab,
    setSelectedTaskId,
    setActiveSegmentId,
    isHydrated,
  };
}

export function clearResultsState(studyId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${studyId}`);
  } catch {
    // Ignore errors
  }
}
