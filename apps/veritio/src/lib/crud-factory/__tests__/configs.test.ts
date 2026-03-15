import { describe, it, expect } from 'vitest'
import {
  cardsConfig,
  categoriesConfig,
  treeNodesConfig,
  tasksConfig,
} from '../configs/index'

describe('Entity Configurations', () => {
  describe('cardsConfig', () => {
    it('should have correct table name', () => {
      expect(cardsConfig.tableName).toBe('cards')
    })

    it('should have correct entity name', () => {
      expect(cardsConfig.entityName).toBe('Card')
    })

    it('should use parallel upsert strategy', () => {
      expect(cardsConfig.upsertStrategy).toBe('parallel')
    })

    it('should generate correct cache key', () => {
      expect(cardsConfig.cache.keyGenerator('study-123')).toBe('cards:study-123')
    })

    it('should build correct insert data', () => {
      const input = { label: '  Test Card  ', description: '  Desc  ', position: 5 }
      const result = cardsConfig.buildInsertData('study-1', input)

      expect(result).toEqual({
        study_id: 'study-1',
        label: 'Test Card',
        description: 'Desc',
        position: 5,
        image: null,
      })
    })

    it('should build insert data with defaults', () => {
      const input = { label: 'Test' }
      const result = cardsConfig.buildInsertData('study-1', input)

      expect(result.position).toBe(0)
      expect(result.description).toBeNull()
    })

    it('should build correct upsert data with image', () => {
      const item = {
        id: 'card-1',
        label: 'Test',
        position: 0,
        image: { url: 'http://example.com/img.png', alt: 'Test' },
      }
      const result = cardsConfig.buildUpsertData('study-1', item)

      expect(result).toEqual({
        id: 'card-1',
        study_id: 'study-1',
        label: 'Test',
        description: null,
        position: 0,
        image: { url: 'http://example.com/img.png', alt: 'Test' },
      })
    })

    it('should include image field in selects', () => {
      expect(cardsConfig.selects.list).toContain('image')
      expect(cardsConfig.selects.bulkUpdate).toContain('image')
    })
  })

  describe('categoriesConfig', () => {
    it('should have correct table name', () => {
      expect(categoriesConfig.tableName).toBe('categories')
    })

    it('should have correct entity name', () => {
      expect(categoriesConfig.entityName).toBe('Category')
    })

    it('should use parallel upsert strategy', () => {
      expect(categoriesConfig.upsertStrategy).toBe('parallel')
    })

    it('should generate correct cache key', () => {
      expect(categoriesConfig.cache.keyGenerator('study-123')).toBe('categories:study-123')
    })

    it('should not include image field (unlike cards)', () => {
      expect(categoriesConfig.selects.list).not.toContain('image')
    })

    it('should build correct insert data', () => {
      const input = { label: 'Category A', description: 'Desc', position: 2 }
      const result = categoriesConfig.buildInsertData('study-1', input)

      expect(result).toEqual({
        study_id: 'study-1',
        label: 'Category A',
        description: 'Desc',
        position: 2,
      })
    })
  })

  describe('treeNodesConfig', () => {
    it('should have correct table name', () => {
      expect(treeNodesConfig.tableName).toBe('tree_nodes')
    })

    it('should have correct entity name', () => {
      expect(treeNodesConfig.entityName).toBe('Tree node')
    })

    it('should use batch upsert strategy for FK ordering', () => {
      expect(treeNodesConfig.upsertStrategy).toBe('batch')
    })

    it('should generate correct cache key', () => {
      expect(treeNodesConfig.cache.keyGenerator('study-123')).toBe('tree-nodes:study-123')
    })

    it('should have foreign key error handlers', () => {
      expect(treeNodesConfig.errorHandlers).toBeDefined()
      expect(treeNodesConfig.errorHandlers?.length).toBeGreaterThan(0)

      const fkHandler = treeNodesConfig.errorHandlers?.find(
        (h) => h.pattern === 'foreign key'
      )
      expect(fkHandler).toBeDefined()
      expect(fkHandler?.message).toBe('Parent node not found')
    })

    it('should include parent_id in selects', () => {
      expect(treeNodesConfig.selects.list).toContain('parent_id')
      expect(treeNodesConfig.selects.list).toContain('path')
    })

    it('should build correct insert data with parent', () => {
      const input = { label: 'Child Node', parent_id: 'parent-1', position: 1 }
      const result = treeNodesConfig.buildInsertData('study-1', input)

      expect(result).toEqual({
        study_id: 'study-1',
        label: 'Child Node',
        parent_id: 'parent-1',
        position: 1,
      })
    })

    it('should build insert data with null parent for root nodes', () => {
      const input = { label: 'Root Node' }
      const result = treeNodesConfig.buildInsertData('study-1', input)

      expect(result.parent_id).toBeNull()
    })
  })

  describe('tasksConfig', () => {
    it('should have correct table name', () => {
      expect(tasksConfig.tableName).toBe('tasks')
    })

    it('should have correct entity name', () => {
      expect(tasksConfig.entityName).toBe('Task')
    })

    it('should use batch upsert strategy', () => {
      expect(tasksConfig.upsertStrategy).toBe('batch')
    })

    it('should generate correct cache key', () => {
      expect(tasksConfig.cache.keyGenerator('study-123')).toBe('tasks:study-123')
    })

    it('should have foreign key error handlers for correct_node', () => {
      expect(tasksConfig.errorHandlers).toBeDefined()

      const fkHandler = tasksConfig.errorHandlers?.find(
        (h) => h.pattern === 'foreign key'
      )
      expect(fkHandler).toBeDefined()
      expect(fkHandler?.message).toBe('Correct answer node not found')
    })

    it('should include correct_node join in selects', () => {
      expect(tasksConfig.selects.list).toContain('correct_node:tree_nodes')
      expect(tasksConfig.selects.get).toContain('correct_node:tree_nodes')
    })

    it('should include correct_node_ids array in selects', () => {
      expect(tasksConfig.selects.list).toContain('correct_node_ids')
    })

    it('should build correct insert data', () => {
      const input = {
        question: 'Find the settings',
        correct_node_id: 'node-1',
        correct_node_ids: ['node-1', 'node-2'],
        position: 0,
      }
      const result = tasksConfig.buildInsertData('study-1', input)

      expect(result).toEqual({
        study_id: 'study-1',
        question: 'Find the settings',
        correct_node_id: 'node-1',
        correct_node_ids: ['node-1', 'node-2'],
        position: 0,
      })
    })

    it('should build upsert data with post_task_questions', () => {
      const item = {
        id: 'task-1',
        question: 'Test task',
        correct_node_id: null,
        correct_node_ids: ['a', 'b'],
        position: 0,
        post_task_questions: [{ type: 'rating', text: 'How easy?' }],
      }
      const result = tasksConfig.buildUpsertData('study-1', item)

      expect(result.id).toBe('task-1')
      expect(result.study_id).toBe('study-1')
      expect(result.post_task_questions).toBeDefined()
    })

    it('should have transformListResult for type casting', () => {
      expect(tasksConfig.transformListResult).toBeDefined()

      const mockRows = [
        { id: '1', question: 'Test', correct_node: { id: 'n1', label: 'Node' } },
      ]
      const result = tasksConfig.transformListResult!(mockRows)
      expect(result).toEqual(mockRows)
    })
  })

  describe('Common Configuration Properties', () => {
    const allConfigs = [cardsConfig, categoriesConfig, treeNodesConfig, tasksConfig]

    it.each(allConfigs)('should have all required select strings', (config) => {
      expect(config.selects.list).toBeDefined()
      expect(config.selects.listWithOwnership).toBeDefined()
      expect(config.selects.get).toBeDefined()
      expect(config.selects.create).toBeDefined()
      expect(config.selects.update).toBeDefined()
      expect(config.selects.bulkUpdate).toBeDefined()
    })

    it.each(allConfigs)('should have ownership join in listWithOwnership select', (config) => {
      expect(config.selects.listWithOwnership).toContain('studies!inner(id)')
    })

    it.each(allConfigs)('should order by position ascending', (config) => {
      expect(config.orderBy.column).toBe('position')
      expect(config.orderBy.ascending).toBe(true)
    })

    it.each(allConfigs)('should have buildInsertData function', (config) => {
      expect(typeof config.buildInsertData).toBe('function')
    })

    it.each(allConfigs)('should have buildUpsertData function', (config) => {
      expect(typeof config.buildUpsertData).toBe('function')
    })

    it.each(allConfigs)('should have cache configuration', (config) => {
      expect(config.cache.keyGenerator).toBeDefined()
      expect(config.cache.ttl).toBeGreaterThan(0)
    })
  })
})
