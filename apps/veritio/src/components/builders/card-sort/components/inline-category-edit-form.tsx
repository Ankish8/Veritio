"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  KeyboardShortcutHint,
  EscapeHint,
} from "@/components/ui/keyboard-shortcut-hint";
import type { Category } from "@veritio/study-types";
import { validateCategoryLimitValues } from "@/lib/card-sort/category-limits";

interface InlineCategoryEditFormProps {
  category: Category;
  showDescription?: boolean;
  showLimits?: boolean;
  onSave: (updates: {
    label: string;
    description?: string | null;
    min_cards?: number | null;
    max_cards?: number | null;
  }) => void;
  onCancel: () => void;
}

export function InlineCategoryEditForm({
  category,
  showDescription,
  showLimits,
  onSave,
  onCancel,
}: InlineCategoryEditFormProps) {
  const [label, setLabel] = useState(category.label);
  const [description, setDescription] = useState(category.description ?? "");
  const [minCards, setMinCards] = useState(
    category.min_cards == null ? "" : String(category.min_cards),
  );
  const [maxCards, setMaxCards] = useState(
    category.max_cards == null ? "" : String(category.max_cards),
  );

  const parsedMin = minCards === "" ? null : Number(minCards);
  const parsedMax = maxCards === "" ? null : Number(maxCards);
  const limitError = showLimits
    ? validateCategoryLimitValues(parsedMin, parsedMax)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim() && !limitError) {
      onSave({
        label: label.trim(),
        description: showDescription ? description.trim() || null : undefined,
        min_cards: showLimits ? parsedMin : undefined,
        max_cards: showLimits ? parsedMax : undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border bg-muted/50 p-3">
      {showDescription || showLimits ? (
        <div className="space-y-2">
          <Input
            placeholder="Category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          {showDescription && (
            <Textarea
              placeholder="Category description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          )}
          {showLimits && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`min-cards-${category.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Minimum cards
                </label>
                <Input
                  id={`min-cards-${category.id}`}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="No minimum"
                  value={minCards}
                  onChange={(event) => setMinCards(event.target.value)}
                  aria-invalid={Boolean(limitError)}
                />
              </div>
              <div>
                <label
                  htmlFor={`max-cards-${category.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Maximum cards
                </label>
                <Input
                  id={`max-cards-${category.id}`}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="No maximum"
                  value={maxCards}
                  onChange={(event) => setMaxCards(event.target.value)}
                  aria-invalid={Boolean(limitError)}
                />
              </div>
            </div>
          )}
          {limitError && (
            <p className="text-xs text-destructive" role="alert">
              {limitError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!label.trim() || Boolean(limitError)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
              <KeyboardShortcutHint
                shortcut="enter"
                variant="dark"
                className="ml-1"
              />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
              <EscapeHint className="ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!label.trim()}>
            <Check className="h-3.5 w-3.5" />
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
            <EscapeHint />
          </Button>
        </div>
      )}
    </form>
  );
}
