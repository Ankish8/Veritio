"use client";

import { useCallback, useMemo } from "react";
import type {
  CardWithImage,
  CardSortSettings,
  Category,
} from "@veritio/study-types";
import {
  validateCategoryPlacements,
  type CardPlacement,
} from "@/lib/card-sort/category-limits";

interface CustomCategory {
  id: string;
  label: string;
}

// Extended settings interface for additional validation options
interface ExtendedCardSortSettings extends CardSortSettings {
  requireAllCardsSorted?: boolean;
  requireCategoriesNamed?: boolean;
}

interface UseCardSortValidationProps {
  cards: CardWithImage[];
  placedCardsCount: number;
  customCategories: CustomCategory[];
  categories: Category[];
  placedCards: CardPlacement[];
  settings: ExtendedCardSortSettings;
}

interface UseCardSortValidationReturn {
  getValidationErrors: () => string[];
  canSubmit: boolean;
}

/** Validates card sort state: all cards sorted and custom categories named. */
export function useCardSortValidation({
  cards,
  placedCardsCount,
  customCategories,
  categories,
  placedCards,
  settings,
}: UseCardSortValidationProps): UseCardSortValidationReturn {
  const availableCardsCount = cards.length - placedCardsCount;

  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    // Check if all cards are sorted
    // - If allowSkip is enabled, participants can submit without sorting all cards
    // - Otherwise, default behavior: required in closed mode, optional in open/hybrid
    const allowSkipping = settings.allowSkip ?? false;
    const requireAllSorted =
      settings.requireAllCardsSorted ??
      (!allowSkipping && settings.mode === "closed");
    if (requireAllSorted && availableCardsCount > 0) {
      errors.push("Please sort all items before submitting your response");
    }

    // Check if all custom categories are named
    const requireNamed = settings.requireCategoriesNamed ?? true;
    if (requireNamed) {
      const unnamedCategories = customCategories.filter((c) => !c.label.trim());
      if (unnamedCategories.length > 0) {
        errors.push(
          "You must name all the groups before you can finish. Click the group title to change it.",
        );
      }
    }

    errors.push(
      ...validateCategoryPlacements(categories, placedCards).map(
        (violation) => violation.message,
      ),
    );

    return errors;
  }, [
    availableCardsCount,
    categories,
    customCategories,
    placedCards,
    settings,
  ]);

  const canSubmit = useMemo(
    () => getValidationErrors().length === 0,
    [getValidationErrors],
  );

  return {
    getValidationErrors,
    canSubmit,
  };
}
