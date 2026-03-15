/**
 * Test Data Fixtures
 *
 * Reusable test data for E2E tests
 */

import { nanoid } from 'nanoid'

// ─────────────────────────────────────────────────────────────────────────────
// Project Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export function createProjectData(overrides: Partial<{ name: string; description: string }> = {}) {
  return {
    name: overrides.name || `Test Project ${nanoid(6)}`,
    description: overrides.description || 'Automated test project',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Study Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export function createStudyData(
  type: 'card-sort' | 'tree-test' | 'survey' | 'prototype-test' | 'first-click',
  overrides: Partial<{ name: string; description: string }> = {}
) {
  const typeNames = {
    'card-sort': 'Card Sort',
    'tree-test': 'Tree Test',
    survey: 'Survey',
    'prototype-test': 'Prototype Test',
    'first-click': 'First Click',
  }

  return {
    name: overrides.name || `${typeNames[type]} ${nanoid(6)}`,
    description: overrides.description || `Automated ${typeNames[type]} test`,
    type,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Sort Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const cardSortCards = [
  { label: 'Home Page', description: 'Main landing page' },
  { label: 'Product Catalog', description: 'Browse all products' },
  { label: 'Shopping Cart', description: 'Items ready for checkout' },
  { label: 'User Account', description: 'Manage your profile' },
  { label: 'Order History', description: 'View past purchases' },
  { label: 'Wishlist', description: 'Save items for later' },
  { label: 'Contact Support', description: 'Get help from our team' },
  { label: 'FAQ', description: 'Frequently asked questions' },
  { label: 'Shipping Info', description: 'Delivery options and rates' },
  { label: 'Returns Policy', description: 'How to return items' },
]

export const cardSortCategories = [
  { label: 'Shopping', description: 'Buying and browsing products' },
  { label: 'Account', description: 'Personal settings and history' },
  { label: 'Help & Support', description: 'Getting assistance' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tree Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const treeTestNodes = [
  {
    id: '1',
    label: 'Home',
    children: [
      {
        id: '1-1',
        label: 'Products',
        children: [
          { id: '1-1-1', label: 'Electronics', children: [] },
          { id: '1-1-2', label: 'Clothing', children: [] },
          { id: '1-1-3', label: 'Books', children: [] },
        ],
      },
      {
        id: '1-2',
        label: 'Account',
        children: [
          { id: '1-2-1', label: 'Profile', children: [] },
          { id: '1-2-2', label: 'Orders', children: [] },
          { id: '1-2-3', label: 'Settings', children: [] },
        ],
      },
      {
        id: '1-3',
        label: 'Help',
        children: [
          { id: '1-3-1', label: 'FAQ', children: [] },
          { id: '1-3-2', label: 'Contact Us', children: [] },
        ],
      },
    ],
  },
]

export const treeTestTasks = [
  {
    instruction: 'Find where you would update your shipping address',
    correctPath: ['Home', 'Account', 'Settings'],
  },
  {
    instruction: 'Find where you would browse laptops',
    correctPath: ['Home', 'Products', 'Electronics'],
  },
  {
    instruction: 'Find where you would check the status of an order',
    correctPath: ['Home', 'Account', 'Orders'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Survey Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const surveyQuestions = [
  {
    type: 'single-choice',
    question: 'How satisfied are you with our product?',
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
  },
  {
    type: 'multiple-choice',
    question: 'Which features do you use most? (Select all that apply)',
    options: ['Dashboard', 'Reports', 'Analytics', 'Integrations', 'API'],
  },
  {
    type: 'text',
    question: 'What improvements would you like to see?',
    placeholder: 'Enter your feedback...',
  },
  {
    type: 'rating',
    question: 'How likely are you to recommend us to a friend?',
    scale: 10,
  },
  {
    type: 'nps',
    question: 'On a scale of 0-10, how likely are you to recommend us?',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Participant Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const participantProfiles = [
  { age: '25-34', experience: 'Intermediate', device: 'Desktop' },
  { age: '35-44', experience: 'Expert', device: 'Mobile' },
  { age: '18-24', experience: 'Beginner', device: 'Tablet' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Response Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export function generateCardSortResponse() {
  return {
    categories: [
      {
        name: 'Shopping',
        cards: ['Home Page', 'Product Catalog', 'Shopping Cart'],
      },
      {
        name: 'Account',
        cards: ['User Account', 'Order History', 'Wishlist'],
      },
      {
        name: 'Support',
        cards: ['Contact Support', 'FAQ', 'Shipping Info', 'Returns Policy'],
      },
    ],
    timeSpent: 120000, // 2 minutes
  }
}

export function generateTreeTestResponse(taskIndex: number) {
  const task = treeTestTasks[taskIndex]
  return {
    path: task.correctPath,
    correct: true,
    timeSpent: 15000, // 15 seconds
  }
}

export function generateSurveyResponse() {
  return {
    answers: [
      { questionIndex: 0, value: 'Satisfied' },
      { questionIndex: 1, value: ['Dashboard', 'Analytics'] },
      { questionIndex: 2, value: 'Great product, would love more integrations!' },
      { questionIndex: 3, value: 8 },
      { questionIndex: 4, value: 9 },
    ],
    timeSpent: 180000, // 3 minutes
  }
}
