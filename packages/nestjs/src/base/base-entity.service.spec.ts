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
})
