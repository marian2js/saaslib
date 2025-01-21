import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Model, Types } from 'mongoose'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseEntityService } from './base-entity.service'

@Schema()
class FakeModel {
  _id: Types.ObjectId

  @Prop({ unique: true, sparse: true })
  key: string

  @Prop({})
  name: string

  @Prop({})
  category: string
}

const FakeModelSchema = SchemaFactory.createForClass(FakeModel)

FakeModelSchema.index({ key: 1 }, { unique: true, sparse: true })

@Injectable()
class FakeEntityService extends BaseEntityService<FakeModel> {
  constructor(@InjectModel(FakeModel.name) private fakeModel: Model<FakeModel>) {
    super(fakeModel)
  }
}

describe('BaseEntityService', () => {
  let app: INestApplication
  let service: FakeEntityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeEntityService],
      imports: [...testModuleImports, MongooseModule.forFeature([{ name: FakeModel.name, schema: FakeModelSchema }])],
    }).compile()

    app = module.createNestApplication()
    service = module.get<FakeEntityService>(FakeEntityService)

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findOne', () => {
    it('should return null if no document matches the filter', async () => {
      const result = await service.findOne({ name: 'Nonexistent' })
      expect(result).toBeNull()
    })

    it('should retrieve a document by filter', async () => {
      const doc = await service.create({ name: 'Test' })
      const found = await service.findOne({ _id: doc._id })
      expect(found).toBeDefined()
      expect(found.name).toBe('Test')
    })
  })

  describe('findMany', () => {
    it('should retrieve multiple documents by filter', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      const results = await service.findMany({ category: 'A' })
      expect(results.length).toEqual(2)
    })

    it('should return an empty array if no documents match the filter', async () => {
      const results = await service.findMany({ category: 'Nonexistent' })
      expect(results).toEqual([])
    })
  })

  describe('findAll', () => {
    it('should retrieve all documents in the collection', async () => {
      await service.create({ name: 'Test1' })
      await service.create({ name: 'Test2' })
      const results = await service.findAll()
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('count', () => {
    it('should return the correct count without cache', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.create({ name: 'Test3', category: 'B' })

      const countA = await service.count({ category: 'A' })
      expect(countA).toBe(2)

      const countB = await service.count({ category: 'B' })
      expect(countB).toBe(1)

      const countAll = await service.count()
      expect(countAll).toBe(3)
    })
  })

  describe('create', () => {
    it('should create a new document', async () => {
      const doc = await service.create({ name: 'NewDoc' })
      const found = await service.findOne({ _id: doc._id })
      expect(found.name).toBe('NewDoc')
    })

    it('should fail if a unique constraint is violated', async () => {
      await service.create({ name: 'UniqueDoc', key: 'unique' })
      await expect(service.create({ name: 'UniqueDoc', key: 'unique' })).rejects.toThrow()
    })
  })

  describe('updateById', () => {
    it('should update a document by ID', async () => {
      const doc = await service.create({ name: 'Initial' })
      await service.updateById(doc._id, { $set: { name: 'Updated' } })
      const updatedDoc = await service.findOne({ _id: doc._id })
      expect(updatedDoc.name).toBe('Updated')
    })

    it('should not modify any documents if there are no matches', async () => {
      const res = await service.updateById(new Types.ObjectId(), { $set: { name: 'Updated' } })
      expect(res.matchedCount).toEqual(0)
      expect(res.modifiedCount).toEqual(0)
      expect(res.upsertedCount).toEqual(0)
    })

    it('should return the number of documents that were modified', async () => {
      const doc = await service.create({ name: 'Initial' })
      const res = await service.updateById(doc._id, { $set: { name: 'Updated' } })
      expect(res.matchedCount).toEqual(1)
      expect(res.modifiedCount).toEqual(1)
      expect(res.upsertedCount).toEqual(0)
    })
  })

  describe('updateOne', () => {
    it('should update the first document that matches the filter', async () => {
      await service.create({ name: 'ToUpdate', key: 'unique' })
      await service.updateOne({ key: 'unique' }, { $set: { name: 'Updated' } })
      const updatedDoc = await service.findOne({ key: 'unique' })
      expect(updatedDoc.name).toBe('Updated')
    })

    it('should fail if a unique constraint is violated', async () => {
      await service.create({ name: 'UniqueDoc', key: 'unique' })
      await service.create({ name: 'AnotherDoc', key: 'another' })
      await expect(service.updateOne({ key: 'unique' }, { $set: { key: 'another' } })).rejects.toThrow()
    })
  })

  describe('updateMany', () => {
    it('should update all documents that match the filter', async () => {
      await service.create({ name: 'BatchUpdate', category: 'X' })
      await service.create({ name: 'BatchUpdate', category: 'X' })
      await service.updateMany({ category: 'X' }, { $set: { name: 'Updated' } })
      const results = await service.findMany({ name: 'Updated' })
      expect(results.length).toEqual(2)
    })

    it('should return the number of documents that were modified', async () => {
      await service.create({ name: 'BatchUpdate', category: 'X' })
      await service.create({ name: 'BatchUpdate', category: 'X' })
      const res = await service.updateMany({ category: 'X' }, { $set: { name: 'Updated' } })
      expect(res.matchedCount).toEqual(2)
      expect(res.modifiedCount).toEqual(2)
      expect(res.upsertedCount).toEqual(0)
    })

    it('should fail if a unique constraint is violated', async () => {
      await service.create({ name: 'UniqueDoc', key: 'unique' })
      await service.create({ name: 'AnotherDoc', key: 'another' })
      await expect(service.updateMany({ key: 'unique' }, { $set: { key: 'another' } })).rejects.toThrow()
    })
  })

  describe('deleteById', () => {
    it('should remove a document by ID', async () => {
      const doc = await service.create({ name: 'ToDelete' })
      await service.deleteById(doc._id)
      const deletedDoc = await service.findOne({ _id: doc._id })
      expect(deletedDoc).toBeNull()
    })

    it('should not delete any documents if there are no matches', async () => {
      const res = await service.deleteById(new Types.ObjectId())
      expect(res.deletedCount).toEqual(0)
    })
  })

  describe('deleteOne', () => {
    it('should remove the first document that matches the filter', async () => {
      await service.create({ name: 'ToDelete', key: 'unique' })
      await service.deleteOne({ key: 'unique' })
      const deletedDoc = await service.findOne({ key: 'unique' })
      expect(deletedDoc).toBeNull()
    })

    it('should not delete any documents if there are no matches', async () => {
      const res = await service.deleteOne({ key: 'nonexistent' })
      expect(res.deletedCount).toEqual(0)
    })
  })

  describe('upsertOne', () => {
    it('should create a new document when no match is found', async () => {
      const { doc, created } = await service.upsertOne(
        { name: 'NonExistent' },
        { $set: { name: 'NewDoc', category: 'Test' } },
      )
      expect(created).toBe(true)
      expect(doc.name).toBe('NewDoc')
      expect(doc.category).toBe('Test')

      const foundDoc = await service.findOne({ name: 'NewDoc' })
      expect(foundDoc).toBeDefined()
      expect(foundDoc!.category).toBe('Test')
    })

    it('should update an existing document when a match is found', async () => {
      const existingDoc = await service.create({ name: 'ExistingDoc', category: 'Old' })
      const { doc, created } = await service.upsertOne({ _id: existingDoc._id }, { $set: { category: 'Updated' } })
      expect(created).toBe(false)
      expect(doc._id).toEqual(existingDoc._id)
      expect(doc.name).toBe('ExistingDoc')
      expect(doc.category).toBe('Updated')

      const foundDoc = await service.findOne({ _id: existingDoc._id })
      expect(foundDoc!.category).toBe('Updated')
    })

    it('should fail if update violates a unique constraint', async () => {
      await service.create({ name: 'FirstDoc', key: 'unique1' })
      await service.create({ name: 'SecondDoc', key: 'unique2' })

      await expect(service.upsertOne({ name: 'FirstDoc' }, { $set: { key: 'unique2' } })).rejects.toThrow()
    })

    it('should handle direct update without $set operator', async () => {
      const { doc, created } = await service.upsertOne(
        { name: 'NonExistent' },
        { name: 'DirectUpdate', category: 'Test' },
      )
      expect(created).toBe(true)
      expect(doc.name).toBe('DirectUpdate')
      expect(doc.category).toBe('Test')

      const foundDoc = await service.findOne({ name: 'DirectUpdate' })
      expect(foundDoc).toBeDefined()
      expect(foundDoc!.category).toBe('Test')
    })
  })

  describe('aggregate', () => {
    it('should perform an aggregation operation', async () => {
      await service.create({ name: 'Agg1', category: 'A' })
      await service.create({ name: 'Agg2', category: 'A' })
      const result = await service.aggregate([{ $match: { category: 'A' } }, { $count: 'total' }])
      expect(result[0].total).toBe(2)
    })
  })

  describe('bulkWrite', () => {
    it('should perform multiple write operations', async () => {
      const operations = [
        { insertOne: { document: { name: 'Bulk1' } } },
        { insertOne: { document: { name: 'Bulk2' } } },
      ]
      const result = await service.bulkWrite(operations)
      expect(result.insertedCount).toEqual(2)
    })
  })

  describe('local cache', () => {
    beforeEach(() => service.setLocalCacheSeconds(60 * 60))

    afterEach(async () => {
      service.clearCache()
      await app.close()
    })

    it('should cache and return document after findById', async () => {
      const doc = await service.create({ name: 'CacheTest' })
      const cachedDoc = await service.findById(doc._id)
      expect(cachedDoc.name).toBe('CacheTest')
      expect(service.getCacheSize()).toBe(1)

      // Modify document directly in DB
      await service['model'].updateOne({ _id: doc._id }, { $set: { name: 'Updated' } })

      const cachedAgain = await service.findById(doc._id)
      expect(cachedAgain.name).toBe('CacheTest') // Should return cached version
    })

    it('should cache and return document after findOne', async () => {
      await service.create({ name: 'FindOneTest', key: 'unique' })
      const cachedDoc = await service.findOne({ key: 'unique' })
      expect(cachedDoc.name).toBe('FindOneTest')
      expect(service.getCacheSize()).toBe(1)

      // Modify document directly in DB
      await service['model'].updateOne({ key: 'unique' }, { $set: { name: 'Updated' } })

      const cachedAgain = await service.findOne({ key: 'unique' })
      expect(cachedAgain.name).toBe('FindOneTest') // Should return cached version
    })

    it('should use cache for findMany when full cache is valid', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })

      await service.findAll() // Populate full cache
      expect(service.getCacheSize()).toBe(2)

      // Modify a document directly in DB
      await service['model'].updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' })
      expect(results.length).toBe(2) // Should return cached results
    })

    it('should use cache for findMany with supported options (sort)', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll() // Populate cache

      await service['model'].updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' }, { sort: { name: 1 } })
      expect(results.length).toBe(2) // Returns cached results
      expect(results[0].name).toBe('Test1')
      expect(results[1].name).toBe('Test2')
    })

    it('should use cache for findMany with supported options (limit)', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll() // Populate cache

      await service['model'].updateMany({}, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' }, { limit: 1 })
      expect(results.length).toBe(1)
      expect(results[0].category).toBe('A') // Should use cached value
    })

    it('should use cache for findMany with supported options (skip)', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll() // Populate cache

      await service['model'].updateMany({}, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' }, { skip: 1 })
      expect(results.length).toBe(1)
      expect(results[0].category).toBe('A')
    })

    it('should not use cache for findMany with unsupported options', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll() // Populate cache

      await service['model'].updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' }, { select: { name: 1 } })
      expect(results.length).toBe(1) // Fresh DB results
      expect(results[0].name).toBe('Test2')
    })

    it('should cache all documents after findAll', async () => {
      await service.create({ name: 'All1' })
      await service.create({ name: 'All2' })

      const allDocs = await service.findAll()
      expect(allDocs.length).toBe(2)
      expect(service.getCacheSize()).toBe(2)

      // Modify a document directly in DB
      await service['model'].updateOne({ name: 'All1' }, { $set: { name: 'Updated' } })

      const cachedAll = await service.findAll()
      expect(cachedAll.find((doc) => doc.name === 'All1')).toBeDefined() // Should return cached version
    })

    it('should use cache when full cache is valid', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll()

      // Modify database directly
      await service['model'].create({ name: 'Test3', category: 'A' })

      const count = await service.count({ category: 'A' })
      expect(count).toBe(2)
    })

    it('should return correct count after cache update', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll()

      await service.create({ name: 'Test3', category: 'A' })

      const count = await service.count({ category: 'A' })
      expect(count).toBe(3)
    })

    it('should update cache after create', async () => {
      const doc = await service.create({ name: 'NewDoc' })
      expect(service.getCacheSize()).toBe(1)

      const cachedDoc = await service.findById(doc._id)
      expect(cachedDoc.name).toBe('NewDoc')
    })

    it('should update cache after updateById', async () => {
      const doc = await service.create({ name: 'InitialName' })
      await service.findById(doc._id) // Cache the document

      await service.updateById(doc._id, { $set: { name: 'UpdatedName' } })

      const updatedDoc = await service.findById(doc._id)
      expect(updatedDoc.name).toBe('UpdatedName') // Should return updated cached version
    })

    it('should update cache after updateOne', async () => {
      await service.create({ name: 'ToUpdate', key: 'unique' })
      await service.findOne({ key: 'unique' }) // Cache the document

      await service.updateOne({ key: 'unique' }, { $set: { name: 'Updated' } })

      const updatedDoc = await service.findOne({ key: 'unique' })
      expect(updatedDoc.name).toBe('Updated') // Should return updated cached version
    })

    it('should update cache after updateMany', async () => {
      await service.create({ name: 'Batch1', category: 'X' })
      await service.create({ name: 'Batch2', category: 'X' })
      await service.findAll() // Cache all documents

      await service.updateMany({ category: 'X' }, { $set: { name: 'Updated' } })

      const updatedDocs = await service.findMany({ category: 'X' })
      expect(updatedDocs.every((doc) => doc.name === 'Updated')).toBe(true)
    })

    it('should remove document from cache after deleteById', async () => {
      const doc = await service.create({ name: 'ToDelete' })
      await service.findById(doc._id) // Cache the document
      expect(service.getCacheSize()).toBe(1)

      await service.deleteById(doc._id)
      expect(service.getCacheSize()).toBe(0)

      const deletedDoc = await service.findById(doc._id)
      expect(deletedDoc).toBeNull()
    })

    it('should remove document from cache after deleteOne', async () => {
      await service.create({ name: 'ToDelete', key: 'unique' })
      await service.findOne({ key: 'unique' }) // Cache the document
      expect(service.getCacheSize()).toBe(1)

      await service.deleteOne({ key: 'unique' })
      expect(service.getCacheSize()).toBe(0)

      const deletedDoc = await service.findOne({ key: 'unique' })
      expect(deletedDoc).toBeNull()
    })

    it('should not use cache for aggregate operations', async () => {
      await service.create({ name: 'Agg1', category: 'A' })
      await service.create({ name: 'Agg2', category: 'A' })
      await service.findAll() // Cache all documents

      // Modify a document directly in DB
      await service['model'].updateOne({ name: 'Agg1' }, { $set: { category: 'B' } })

      const result = await service.aggregate([{ $match: { category: 'A' } }, { $count: 'total' }])
      expect(result[0].total).toBe(1) // Should reflect the DB change, not cache
    })

    it('should not update cache for bulkWrite operations', async () => {
      const doc1 = await service.create({ name: 'Bulk1' })
      const doc2 = await service.create({ name: 'Bulk2' })
      await service.findAll() // Cache all documents

      const operations = [
        { updateOne: { filter: { _id: doc1._id }, update: { $set: { name: 'BulkUpdated1' } } } },
        { updateOne: { filter: { _id: doc2._id }, update: { $set: { name: 'BulkUpdated2' } } } },
      ]
      await service.bulkWrite(operations)

      // Check cached versions (should be unchanged)
      const cachedDoc1 = await service.findById(doc1._id)
      const cachedDoc2 = await service.findById(doc2._id)
      expect(cachedDoc1.name).toBe('Bulk1')
      expect(cachedDoc2.name).toBe('Bulk2')

      // Verify actual database state
      const dbDoc1 = await service['model'].findById(doc1._id)
      const dbDoc2 = await service['model'].findById(doc2._id)
      expect(dbDoc1.name).toBe('BulkUpdated1')
      expect(dbDoc2.name).toBe('BulkUpdated2')
    })
  })

  describe('local cache with max size', () => {
    beforeEach(() => {
      service.setLocalCacheSeconds(60 * 60)
      service.setLocalMaxCacheSize(3)
    })

    afterEach(async () => {
      service.clearCache()
      service.setLocalMaxCacheSize(null)
      await app.close()
    })

    it('should limit cache size to localMaxCacheSize', async () => {
      await service.create({ name: 'Doc1' })
      await service.create({ name: 'Doc2' })
      await service.create({ name: 'Doc3' })
      await service.create({ name: 'Doc4' })

      // Fetch all documents to ensure they're cached
      await service.findAll()

      expect(service.getCacheSize()).toBe(3)
    })

    it('should remove oldest items when cache limit is exceeded', async () => {
      const doc1 = await service.create({ name: 'Doc1' })
      await service.findById(doc1._id)

      const doc2 = await service.create({ name: 'Doc2' })
      await service.findById(doc2._id)

      const doc3 = await service.create({ name: 'Doc3' })
      await service.findById(doc3._id)

      const doc4 = await service.create({ name: 'Doc4' })
      await service.findById(doc4._id) // This should push out Doc1 from cache

      expect(service.getCacheSize()).toBe(3)

      // Doc1 should no longer be in cache
      await service['model'].updateOne({ _id: doc1._id }, { $set: { name: 'Updated1' } })
      const fetchedDoc1 = await service.findById(doc1._id)
      expect(fetchedDoc1.name).toBe('Updated1')

      // Doc4 should be in cache
      await service['model'].updateOne({ _id: doc4._id }, { $set: { name: 'Updated4' } })
      const fetchedDoc4 = await service.findById(doc4._id)
      expect(fetchedDoc4.name).toBe('Doc4')
    })

    it('should disable full cache functionality when localMaxCacheSize is set', async () => {
      await service.create({ name: 'Doc1', category: 'A' })
      await service.create({ name: 'Doc2', category: 'A' })
      await service.create({ name: 'Doc3', category: 'B' })

      await service.findAll()

      // Modify a document directly in DB
      await service['model'].updateOne({ name: 'Doc1' }, { $set: { category: 'C' } })

      const results = await service.findMany({ category: 'A' })
      expect(results.length).toBe(1) // Should return fresh results from database, not cached
    })

    it('should not use cache when full cache is invalid', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.findAll()

      await service['model'].create({ name: 'Test3', category: 'A' })

      const count = await service.count({ category: 'A' })
      expect(count).toBe(3)
    })

    it('should update cache correctly when performing operations', async () => {
      const doc1 = await service.create({ name: 'Doc1' })
      const doc2 = await service.create({ name: 'Doc2' })
      await service.findAll()

      await service.updateById(doc1._id, { $set: { name: 'UpdatedDoc1' } })
      const doc3 = await service.create({ name: 'Doc3' })
      await service.deleteById(doc2._id)

      expect(service.getCacheSize()).toBe(2)

      const cachedDoc1 = await service.findById(doc1._id)
      expect(cachedDoc1.name).toBe('UpdatedDoc1')

      const cachedDoc3 = await service.findById(doc3._id)
      expect(cachedDoc3.name).toBe('Doc3')

      const deletedDoc2 = await service.findById(doc2._id)
      expect(deletedDoc2).toBeNull()
    })
  })
})
