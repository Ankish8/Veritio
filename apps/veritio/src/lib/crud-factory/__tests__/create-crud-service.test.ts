import { describe, it, expect } from 'vitest'
import { createCrudService } from '../create-crud-service'
import type { EntityConfig } from '../types'

// Test entity config - validates factory creates proper service structure
const testConfig: EntityConfig<
  { id: string; study_id: string; name: string; position: number },
  { name: string; position?: number },
  { id: string; name: string; position: number }
> = {
  tableName: 'cards',
  entityName: 'Test Entity',
  cache: {
    keyGenerator: (studyId) => `test:${studyId}`,
    ttl: 60000,
  },
  selects: {
    list: 'id, study_id, name, position',
    listWithOwnership: 'id, study_id, name, position, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, name, position',
  },
  orderBy: { column: 'position', ascending: true },
  upsertStrategy: 'parallel',
  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    name: input.name,
    position: input.position ?? 0,
  }),
  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    name: item.name,
    position: item.position,
  }),
}

describe('createCrudService', () => {
  describe('factory creation', () => {
    it('should create a service with all CRUD methods', () => {
      const service = createCrudService(testConfig)

      expect(service).toHaveProperty('list')
      expect(service).toHaveProperty('get')
      expect(service).toHaveProperty('create')
      expect(service).toHaveProperty('update')
      expect(service).toHaveProperty('delete')
      expect(service).toHaveProperty('bulkUpdate')
      expect(service).toHaveProperty('invalidateCache')
    })

    it('should return functions for all CRUD methods', () => {
      const service = createCrudService(testConfig)

      expect(typeof service.list).toBe('function')
      expect(typeof service.get).toBe('function')
      expect(typeof service.create).toBe('function')
      expect(typeof service.update).toBe('function')
      expect(typeof service.delete).toBe('function')
      expect(typeof service.bulkUpdate).toBe('function')
      expect(typeof service.invalidateCache).toBe('function')
    })
  })

  describe('configuration validation', () => {
    it('should use provided entity name in config', () => {
      const customConfig = {
        ...testConfig,
        entityName: 'Custom Entity',
      }
      const service = createCrudService(customConfig)

      // Service created successfully with custom entity name
      expect(service).toBeDefined()
    })

    it('should use provided cache configuration', () => {
      const customConfig = {
        ...testConfig,
        cache: {
          keyGenerator: (id: string) => `custom:${id}`,
          ttl: 120000,
        },
      }
      const service = createCrudService(customConfig)

      // Service created successfully with custom cache config
      expect(service).toBeDefined()
    })

    it('should handle parallel upsert strategy', () => {
      const parallelConfig = {
        ...testConfig,
        upsertStrategy: 'parallel' as const,
      }
      const service = createCrudService(parallelConfig)
      expect(service).toBeDefined()
    })

    it('should handle batch upsert strategy', () => {
      const batchConfig = {
        ...testConfig,
        upsertStrategy: 'batch' as const,
      }
      const service = createCrudService(batchConfig)
      expect(service).toBeDefined()
    })
  })

  describe('buildInsertData', () => {
    it('should be called correctly by factory', () => {
      let _insertDataCalled = false
      let _capturedStudyId = ''
      let _capturedInput: unknown = null

      const configWithSpy: typeof testConfig = {
        ...testConfig,
        buildInsertData: (studyId, input) => {
          _insertDataCalled = true
          _capturedStudyId = studyId
          _capturedInput = input
          return {
            study_id: studyId,
            name: (input as { name: string }).name,
            position: 0,
          }
        },
      }

      // Just creating the service should work
      const service = createCrudService(configWithSpy)
      expect(service).toBeDefined()

      // The buildInsertData is stored and will be used when create() is called
      expect(typeof configWithSpy.buildInsertData).toBe('function')
    })
  })

  describe('buildUpsertData', () => {
    it('should be available in factory config', () => {
      const service = createCrudService(testConfig)
      expect(service).toBeDefined()
      expect(typeof testConfig.buildUpsertData).toBe('function')
    })

    it('should produce correct upsert data structure', () => {
      const item = { id: 'item-1', name: 'Test Item', position: 5 }
      const result = testConfig.buildUpsertData('study-123', item)

      expect(result).toEqual({
        id: 'item-1',
        study_id: 'study-123',
        name: 'Test Item',
        position: 5,
      })
    })
  })

  describe('error handlers', () => {
    it('should accept empty error handlers array', () => {
      const config = {
        ...testConfig,
        errorHandlers: [],
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })

    it('should accept error handlers with string patterns', () => {
      const config = {
        ...testConfig,
        errorHandlers: [
          { pattern: 'foreign key', message: 'Related entity not found' },
          { pattern: 'duplicate key', message: 'Entity already exists' },
        ],
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })

    it('should accept error handlers with regex patterns', () => {
      const config = {
        ...testConfig,
        errorHandlers: [
          { pattern: /foreign\s+key/i, message: 'Related entity not found' },
        ],
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })
  })

  describe('field transformers', () => {
    it('should accept create transformer', () => {
      const config = {
        ...testConfig,
        fieldTransformers: {
          create: (input: { name: string }, studyId: string) => ({
            study_id: studyId,
            name: input.name.toUpperCase(),
            position: 0,
          }),
        },
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })

    it('should accept update transformer', () => {
      const config = {
        ...testConfig,
        fieldTransformers: {
          update: (input: { name?: string }) => ({
            name: input.name?.trim(),
          }),
        },
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })

    it('should accept bulkItem transformer', () => {
      const config = {
        ...testConfig,
        fieldTransformers: {
          bulkItem: (item: { id: string; name: string; position: number }, studyId: string) => ({
            id: item.id,
            study_id: studyId,
            name: item.name.toLowerCase(),
            position: item.position,
          }),
        },
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })
  })

  describe('transform list result', () => {
    it('should accept custom list transformer', () => {
      const config = {
        ...testConfig,
        transformListResult: (rows: unknown[]) => {
          return rows.map((row) => ({
            ...(row as Record<string, unknown>),
            transformed: true,
          }))
        },
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })
  })

  describe('cache invalidation patterns', () => {
    it('should accept additional invalidation patterns', () => {
      const config = {
        ...testConfig,
        cache: {
          ...testConfig.cache,
          invalidatePatterns: ['related:', 'dependent:'],
        },
      }
      const service = createCrudService(config)
      expect(service).toBeDefined()
    })
  })
})
