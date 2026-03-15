'use client'

import { useState, useCallback } from 'react'

interface CustomCategory {
  id: string
  label: string
}

interface PlacedCard {
  cardId: string
  categoryId: string
}

interface UseCustomCategoryStateProps {
  setPlacedCards: React.Dispatch<React.SetStateAction<PlacedCard[]>>
}

interface UseCustomCategoryStateReturn {
  // State
  customCategories: CustomCategory[]
  newCategoryName: string
  showNewCategoryForm: boolean
  editingCategoryId: string | null
  editingCategoryName: string
  categoryToDelete: string | null

  // Setters
  setNewCategoryName: (name: string) => void
  setShowNewCategoryForm: (show: boolean) => void
  setEditingCategoryName: (name: string) => void
  setCategoryToDelete: (id: string | null) => void

  // Actions
  handleCreateCategory: () => void
  /** Create a category with the given name and return its ID */
  createCategoryWithName: (name: string) => string
  /** Create an unnamed category and return its ID (for drop-to-create UX) */
  handleCreateUnnamedCategory: () => string
  handleStartEditCategory: (categoryId: string, currentLabel: string) => void
  handleSaveEditCategory: () => void
  handleCancelEditCategory: () => void
  handleDeleteCategory: (categoryId: string) => void
  confirmDeleteCategory: () => void
}

/** Manages custom categories in open/hybrid card sort modes. */
export function useCustomCategoryState({
  setPlacedCards,
}: UseCustomCategoryStateProps): UseCustomCategoryStateReturn {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const handleCreateCategory = useCallback(() => {
    if (!newCategoryName.trim()) return

    const newCategory: CustomCategory = {
      id: `custom-${Date.now()}`,
      label: newCategoryName.trim(),
    }

    setCustomCategories((prev) => [...prev, newCategory])
    setNewCategoryName('')
    setShowNewCategoryForm(false)
  }, [newCategoryName])

  // Create a category with the given name and return its ID (for inline sheet creation)
  const createCategoryWithName = useCallback((name: string): string => {
    const newCategory: CustomCategory = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
    }
    setCustomCategories((prev) => [...prev, newCategory])
    return newCategory.id
  }, [])

  // Create an unnamed category for drop-to-create UX, returns the new category ID
  const handleCreateUnnamedCategory = useCallback((): string => {
    const newCategory: CustomCategory = {
      id: `custom-${Date.now()}`,
      label: '', // Empty label - user must name it before submit
    }

    setCustomCategories((prev) => [...prev, newCategory])
    return newCategory.id
  }, [])

  const handleStartEditCategory = useCallback((categoryId: string, currentLabel: string) => {
    setEditingCategoryId(categoryId)
    setEditingCategoryName(currentLabel)
  }, [])

  const handleSaveEditCategory = useCallback(() => {
    if (!editingCategoryId) return

    setCustomCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategoryId
          ? { ...c, label: editingCategoryName.trim() || c.label }
          : c
      )
    )
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }, [editingCategoryId, editingCategoryName])

  const handleCancelEditCategory = useCallback(() => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }, [])

  const handleDeleteCategory = useCallback((categoryId: string) => {
    setCategoryToDelete(categoryId)
  }, [])

  const confirmDeleteCategory = useCallback(() => {
    if (!categoryToDelete) return

    // Remove cards from this category (they go back to unsorted)
    setPlacedCards((prev) => prev.filter((p) => p.categoryId !== categoryToDelete))

    // Remove the category
    setCustomCategories((prev) => prev.filter((c) => c.id !== categoryToDelete))
    setCategoryToDelete(null)
  }, [categoryToDelete, setPlacedCards])

  return {
    // State
    customCategories,
    newCategoryName,
    showNewCategoryForm,
    editingCategoryId,
    editingCategoryName,
    categoryToDelete,

    // Setters
    setNewCategoryName,
    setShowNewCategoryForm,
    setEditingCategoryName,
    setCategoryToDelete,

    // Actions
    handleCreateCategory,
    createCategoryWithName,
    handleCreateUnnamedCategory,
    handleStartEditCategory,
    handleSaveEditCategory,
    handleCancelEditCategory,
    handleDeleteCategory,
    confirmDeleteCategory,
  }
}
