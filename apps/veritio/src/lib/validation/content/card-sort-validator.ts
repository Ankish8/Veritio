import type {
  CardWithImage,
  Category,
  CardSortSettings,
} from "@veritio/study-types";
import type { ValidationIssue, ValidationNavigationPath } from "../types";
import { createIssue, truncateText, findDuplicateLabels } from "../utils";
import { validateCategoryLimitValues } from "@/lib/card-sort/category-limits";

function validateCards(cards: CardWithImage[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const navPath: ValidationNavigationPath = {
    tab: "content",
  };

  if (cards.length === 0) {
    issues.push(
      createIssue(
        "card_sort_content",
        "At least one card is required",
        navPath,
        { rule: "min-cards" },
      ),
    );
    return issues;
  }

  const emptyCards = cards.filter(
    (c) => !c.label || c.label.trim().length === 0,
  );
  if (emptyCards.length > 0) {
    for (const card of emptyCards) {
      issues.push(
        createIssue(
          "card_sort_content",
          `A card is missing a label`,
          { ...navPath, itemId: card.id, itemType: "card" },
          { itemId: card.id, rule: "empty-card-label" },
        ),
      );
    }
  }

  const duplicates = findDuplicateLabels(cards);
  for (const label of duplicates) {
    issues.push(
      createIssue(
        "card_sort_content",
        `Duplicate card label "${truncateText(label, 25)}"`,
        navPath,
        { rule: "duplicate-card-label" },
      ),
    );
  }

  return issues;
}

function validateCategories(
  categories: Category[],
  settings: CardSortSettings,
  cardCount: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const navPath: ValidationNavigationPath = {
    tab: "content",
  };

  if (settings.mode === "open") {
    return issues;
  }

  if (categories.length === 0) {
    issues.push(
      createIssue(
        "card_sort_content",
        "At least one category is required for closed/hybrid mode",
        navPath,
        { rule: "min-categories" },
      ),
    );
    return issues;
  }

  const emptyCategories = categories.filter(
    (c) => !c.label || c.label.trim().length === 0,
  );
  if (emptyCategories.length > 0) {
    for (const category of emptyCategories) {
      issues.push(
        createIssue(
          "card_sort_content",
          `A category is missing a label`,
          { ...navPath, itemId: category.id, itemType: "category" },
          { itemId: category.id, rule: "empty-category-label" },
        ),
      );
    }
  }

  const duplicates = findDuplicateLabels(categories);
  for (const label of duplicates) {
    issues.push(
      createIssue(
        "card_sort_content",
        `Duplicate category label "${truncateText(label, 25)}"`,
        navPath,
        { rule: "duplicate-category-label" },
      ),
    );
  }

  for (const category of categories) {
    const limitError = validateCategoryLimitValues(
      category.min_cards,
      category.max_cards,
    );
    if (limitError) {
      issues.push(
        createIssue(
          "card_sort_content",
          `${category.label || "Category"}: ${limitError}`,
          { ...navPath, itemId: category.id, itemType: "category" },
          { itemId: category.id, rule: "category-card-limits" },
        ),
      );
    }
    const effectiveCardCount = settings.cardSubset
      ? Math.min(settings.cardSubset, cardCount)
      : cardCount;
    if (category.min_cards != null && category.min_cards > effectiveCardCount) {
      issues.push(
        createIssue(
          "card_sort_content",
          `${category.label || "Category"} requires more cards than a participant will receive`,
          { ...navPath, itemId: category.id, itemType: "category" },
          { itemId: category.id, rule: "category-min-exceeds-card-count" },
        ),
      );
    }
  }

  const effectiveCardCount = settings.cardSubset
    ? Math.min(settings.cardSubset, cardCount)
    : cardCount;
  const minimumTotal = categories.reduce(
    (total, category) => total + (category.min_cards ?? 0),
    0,
  );
  if (minimumTotal > effectiveCardCount) {
    issues.push(
      createIssue(
        "card_sort_content",
        `Category minimums require ${minimumTotal} cards, but each participant receives ${effectiveCardCount}`,
        navPath,
        { rule: "category-minimums-infeasible" },
      ),
    );
  }

  const requireAllCards =
    settings.requireAllCardsSorted ??
    (!settings.allowSkip && settings.mode === "closed");
  if (
    requireAllCards &&
    categories.every((category) => category.max_cards != null)
  ) {
    const maximumTotal = categories.reduce(
      (total, category) => total + (category.max_cards ?? 0),
      0,
    );
    if (maximumTotal < effectiveCardCount) {
      issues.push(
        createIssue(
          "card_sort_content",
          `Category maximums only allow ${maximumTotal} cards, but participants must sort ${effectiveCardCount}`,
          navPath,
          { rule: "category-maximums-infeasible" },
        ),
      );
    }
  }

  return issues;
}

export function validateCardSortContent(
  cards: CardWithImage[],
  categories: Category[],
  settings: CardSortSettings,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...validateCards(cards));
  issues.push(...validateCategories(categories, settings, cards.length));

  return issues;
}
