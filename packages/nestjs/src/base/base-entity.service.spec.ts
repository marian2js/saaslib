import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Model } from 'mongoose'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseEntityService } from './base-entity.service'

@Schema()
class FakeModel {
  @Prop({ unique: true, sparse: true })
  key: string

  @Prop()
  name: string

  @Prop()
  category: string
}

const FakeModelSchema = SchemaFactory.createForClass(FakeModel)

@Injectable()
class FakeEntityService extends BaseEntityService<FakeModel> {
  constructor(@InjectModel(FakeModelSchema.name) private fakeModel: Model<FakeModel>) {
    super(fakeModel)
  }
}

describe('BaseEntityService', () => {
  let app: INestApplication
  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: FakeModelSchema.name, schema: FakeModelSchema }]),
        ...testModuleImports,
      ],
      providers: [FakeEntityService],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })
  let app: INestApplication
let service: FakeEntityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeEntityService],
      imports: [...testModuleImports, MongooseModule.forFeature([{ name: FakeModel.name, schema: FakeModelSchema }])],
    }).compile()

    app = module.createNestApplication()
    service = module.get(FakeEntityService)

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
      expect(found).toEqual(doc)
)
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
    it('should return the number of documents in the collection', async () => {
      await service.create({ name: 'Test1' })
      await service.create({ name: 'Test2' })
      const count = await service.count()
      expect(count).toBeGreaterThanOrEqual(2)
    })

    it('should return the correct count without cache', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })
      await service.create({ name: 'Test3', category: 'B' })
      const count = await service.count({ category: 'A' })
      expect(count).toEqual(2)
    })
  })

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
      await expect(service.create({ name: 'UniqueDoc', key: 'unique' })).rejects.toThrow('ERR_UNAVAILABLE')
    })
  })
  describe('update', () => {
    it('should update a document by ID', async () => {
      const doc = await service.create({ name: 'Initial' })
      await service.update(doc._id, { $set: { name: 'Updated' } });
      const updatedDoc = await service.findOne({ _id: doc._id });
      expect(updatedDoc.name).toBe('Updated');
    });

    it('should not modify any documents if there are no matches', async () => {
      const res = await service.update(new Types.ObjectId(), { $set: { name: 'Updated' } });
      expect(res.matchedCount).toEqual(0);
      expect(res.modifiedCount).toEqual(0);
      expect(res.upsertedCount).toEqual(0);
    });

    it('should return the number of documents that were modified', async () => {
      const doc = await service.create({ name: 'Initial' });
      const res = await service.update(doc._id, { $set: { name: 'Updated' } });
      expect(res.matchedCount).toEqual(1);
      expect(res.modifiedCount).toEqual(1);
      expect(res.upsertedCount).toEqual(0);
    });
  });

  describe('updateOne', () => {
    it('should update the first document that matches the filter', async () => {
      await service.create({ name: 'ToUpdate', key: 'unique' });
      await service.updateOne({ key: 'unique' }, { $set: { name: 'Updated' } });
      const updatedDoc = await service.findOne({ key: 'unique' });
      expect(updatedDoc.name).toBe('Updated');
    });
it('should fail if a unique constraint is violated', async () => {
      await service.create({ name: 'UniqueDoc' })
      await service.create({ name: 'AnotherDoc' })
      await expect(service.updateOne({ key: 'unique' }, { $set: { key: 'another' } })).rejects.toThrowError(new Error('ERR_UNAVAILABLE'))
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

it('should return the number of documents that were upserted', async () => {
      await service.create({ name: 'BatchUpdate', category: 'X' })
      await service.create({ name: 'BatchUpdate', category: 'X' })
      const res = await service.updateMany({ category: 'Y' }, { $set: { name: 'Updated' } })
      expect(res.matchedCount).toEqual(0)
      expect(res.modifiedCount).toEqual(0)
      expect(res.upsertedCount).toEqual(2)
    })
  })

    it('should fail if a unique constraint is violated', async () => {
      await service.create({ name: 'UniqueDoc' })
      await service.create({ name: 'AnotherDoc' })
      await expect(service.updateMany({ key: 'unique' }, { $set: { key: 'another' } })).rejects.toThrowError(new Error('ERR_UNAVAILABLE'))
    })
})
})
})
})
})
})
  })

  describe('deleteById', () => {
    it('should remove a document by ID', async () => {
      const doc = await service.create({ name: 'ToDelete' })
      await service.deleteById(doc._id)
      const deletedDoc = await service.findOne({ _id: doc._id })
      expect(deletedDoc).toBeNull()
    })
)

  describe('deleteOne', () => {
    it('should remove the first document that matches the filter', async () => {
      await service.create({ name: 'ToDelete', key: 'unique' })
      await service.deleteOne({ key: 'unique' })
      const deletedDoc = await service.findOne({ key: 'unique' })
      expect(deletedDoc).toBeNull()
    })
  })

  describe('aggregate', () => {
    it('should perform an aggregation operation', async () => {
      await service.create({ name: 'Agg1', category: 'A' })
      await service.create({ name: 'Agg2', category: 'A' })
      const result = await service.aggregate([
        { $match: { category: 'A' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ])
      expect(result).toEqual([
        { _id: 'A', count: 2 },
      ])
    })
  })
    })
  })
        { $match: { category: 'A' } },
        { $group: { _id: '$category', total: { $sum: 1 } } },
      ])
      expect(result[0].total).toBe(2)
    })
  })
  })
describe('bulkWrite', () => {
    it('should perform multiple write operations', async () => {
      const operations = [
        { insertOne: { document: { name: 'Bulk1' } } },
        { insertOne: { document: { name: 'Bulk2' } } },
      ]
      const result = await service.bulkWrite(operations)
    })
  })
      expect(result.insertedCount).toBe(2)
    })
    })
})
      expect(result.insertedCount).toEqual(2)
    })
  })

  describe('localCache', () => {
    beforeEach(() => service.setLocalCacheSeconds(60 * 60 * 1000))
    afterEach(async () => {
      service.clearCache()
      await app.close()
    })

    it('should cache and return document after findById', async () => {
      const doc = await service.create({ name: 'CacheTest' })
      const cachedDoc = await service.findById(doc._id)
      expect(cachedDoc.name).toBe('CacheTest')
      expect(service.getCacheSize()).toBe(1)
    })
  })
    })

it('should return cached document after findById', async () => {
```ts
      const cachedAgain = await service.findOne({ key: 'unique' })
      expect(cachedAgain.name).toBe('Updated') // Should return updated version
    })

    it('should use cache for findMany when full cache is valid', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })

      await service.findAll() // Populate full cache
      expect(service.getCacheSize()).toBe(2)

      // Modify a document directly in DB
      await service.model.updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' })
      expect(results.length).toBe(1) // Should return updated results
    })

    it('should not use cache for findMany when options are provided', async () => {
      await service.create({ name: 'Test1', category: 'A' })
      await service.create({ name: 'Test2', category: 'A' })

      await service.findAll() // Populate full cache
      expect(service.getCacheSize()).toBe(2)

      const results = await service.findMany({ category: 'A' }, { sort: { name: -1 } })
      expect(results.length).toBe(2) // Should return updated results
    })
```
import { useWindowDimensions } from 'expo-screen-size';

const MyComponent = () => {
  const { width, height } = useWindowDimensions();

  return (
    <View style={{ width, height }}>
      <Text>Width: {width}</Text>
      <Text>Height: {height}</Text>
    </View>
  );
};

export default MyComponent;

output:
import { useDimensions } from 'expo-screen-size';

const MyComponent = () => {
  const { width, height } = useDimensions();

  return (
    <View style={{ width, height }}>
      <Text>Width: {width}</Text>
      <Text>Height: {height}</Text>
    </View>
  );
};

export default MyComponent;
      // Modify a document directly in DB
      await service.model.updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const results = await service.findMany({ category: 'A' }, { sort: { name: 1 } })
      expect(results.length).toBe(1) // Should return fresh results from database
    })

    it('should cache all documents after findAll', async () => {
      await service.create({ name: 'All1' })
      await service.create({ name: 'All2' })
      const allDocs = await service.findAll()
      expect(allDocs.length).toBe(2)
      expect(service.getCacheSize()).toBe(2)

      // Modify a document directly in DB
      await service.model.updateOne({ name: 'All1' }, { $set: { name: 'Updated' } })

      const cachedAll = await service.findAll()
      expect(cachedAll.find((doc) => doc.name === 'Updated')).toBeDefined() // Should return cached version
    })
      // Modify a document directly in DB
      await service.model.updateOne({ name: 'Test1' }, { $set: { category: 'B' } })

      const cachedAll = await service.findAll()
      expect(cachedAll.find((doc) => doc.name === 'Test1')).toBeDefined() // Should return cached version
    })
      const count = await service.count({ category: 'A' })
      expect(count).toBe(2)
    })

```javascript
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
```
```
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

    it('should remove document from cache after deleteOne', async () => {
      const doc = await service.create({ name: 'ToDelete' })
      await service.findById(doc._id) // Cache the document
      expect(service.getCacheSize()).toBe(1)

      await service.deleteOne({ _id: doc._id })
      expect(service.getCacheSize()).toBe(0)
    })
```
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

      // Aggregate operation should not use cache
      const docs = await service.aggregate([
        { $match: { category: 'A' } },
      ])
      expect(docs.length).toBe(1)
      expect(docs[0].name).toBe('Agg2')
)
      const result = await service.aggregate([{ $match: { category: 'A' } }, { $count: 'total' }])
      expect(result[0].total).toBe(1) // Should reflect the DB change, not cache
    })

    it('should not update cache for bulkWrite operations', async () => {
      const doc1 = await service.create({ name: 'Bulk1' })
      const doc2 = await service.create({ name: 'Bulk2' })
      const doc3 = await service.create({ name: 'Bulk3' })
      const doc4 = await service.create({ name: 'Bulk4' })
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
      service.setLocalCacheSeconds(60 * 60);
      service.setLocalMaxCacheSize(2);
    });

    afterEach(async () => {
      service.clearCache();
      service.setLocalMaxCacheSize(null);
      await app.close();
    });

    it('should limit cache size to localMaxCacheSize', async () => {
      await service.create({ name: 'Doc1' });
      await service.create({ name: 'Doc2' });
      await service.create({ name: 'Doc3' });
    });
});
      await service.create({ name: 'Doc4' })
      await service.create({ name: 'Doc5' })

      // Doc1 and Doc2 should be evicted from the cache
      expect(service.localCache.has(doc1._id)).toBe(false)
      expect(service.localCache.has(doc2._id)).toBe(false)
      expect(service.localCache.has(doc3._id)).toBe(true)
      expect(service.localCache.has(doc4._id)).toBe(true)
      expect(service.localCache.has(doc5._id)).toBe(true)
    })
  })
      await service.create({ name: 'Doc3' })
      await service.create({ name: 'Doc4' })

      // Fetch all documents to ensure they're cached
      await service.findAll()

      expect(service.getCacheSize()).toBe(3)
    })

    it('should remove oldest items when cache limit is exceeded', async () => {
      const doc1 = await service.create({ name: 'Doc1' })
      await service.findById(doc1._id)
    })
  });
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
      try {
        await service.sendSMSAsync(doc1.id, 'Hello')
      } catch (err) {
        expect(err.code).toBe('ERR_UNAVAILABLE')
      }
    })
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
