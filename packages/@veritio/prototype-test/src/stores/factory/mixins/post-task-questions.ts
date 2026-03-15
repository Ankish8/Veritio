/**
 * Post-Task Questions Mixin
 *
 * Shared actions for managing post-task questions in tasks.
 * Used by tree-test and prototype-test builders.
 */

import type { StoreApi } from 'zustand'
import type { PostTaskQuestion, Json } from '@veritio/prototype-test/lib/supabase/types'
import { castJsonArray, toJson } from '@veritio/core'
export interface TaskWithPostTaskQuestions {
  id: string
  post_task_questions: Json | null
}
export interface PostTaskQuestionsState<TTask extends TaskWithPostTaskQuestions> {
  tasks: TTask[]
}
export interface PostTaskQuestionsActions {
  addPostTaskQuestion: (taskId: string, question: Omit<PostTaskQuestion, 'id' | 'position'>) => void
  updatePostTaskQuestion: (taskId: string, questionId: string, updates: Partial<PostTaskQuestion>) => void
  removePostTaskQuestion: (taskId: string, questionId: string) => void
  reorderPostTaskQuestions: (taskId: string, questions: PostTaskQuestion[]) => void
}
export function createPostTaskQuestionsActions<
  TTask extends TaskWithPostTaskQuestions,
  TState extends PostTaskQuestionsState<TTask>
>(
  set: StoreApi<TState>['setState']
): PostTaskQuestionsActions {
  return {
    addPostTaskQuestion: (taskId, question) =>
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task
          const questions = castJsonArray<PostTaskQuestion>(task.post_task_questions)
          const newQuestion: PostTaskQuestion = {
            id: crypto.randomUUID(),
            position: questions.length,
            question_type: question.question_type,
            question_text: question.question_text,
            question_text_html: question.question_text_html,
            is_required: question.is_required,
            config: question.config,
          }
          return {
            ...task,
            post_task_questions: toJson([...questions, newQuestion]),
          }
        }),
      } as Partial<TState>)),

    updatePostTaskQuestion: (taskId, questionId, updates) =>
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task
          const questions = castJsonArray<PostTaskQuestion>(task.post_task_questions)
          const updatedQuestions = questions.map((q) =>
            q.id === questionId ? { ...q, ...updates } : q
          )
          return {
            ...task,
            post_task_questions: toJson(updatedQuestions),
          }
        }),
      } as Partial<TState>)),

    removePostTaskQuestion: (taskId, questionId) =>
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task
          const questions = castJsonArray<PostTaskQuestion>(task.post_task_questions)
          const filteredQuestions = questions
            .filter((q) => q.id !== questionId)
            .map((q, idx) => ({ ...q, position: idx }))
          return {
            ...task,
            post_task_questions: toJson(filteredQuestions),
          }
        }),
      } as Partial<TState>)),

    reorderPostTaskQuestions: (taskId, questions) =>
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task
          const reorderedQuestions = questions.map((q, idx) => ({ ...q, position: idx }))
          return {
            ...task,
            post_task_questions: toJson(reorderedQuestions),
          }
        }),
      } as Partial<TState>)),
  }
}
