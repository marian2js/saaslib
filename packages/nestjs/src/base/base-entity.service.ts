import {
  Document,
  FilterQuery,
  Model,
  MongooseUpdateQueryOptions,
  QueryOptions,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from 'mongoose'
import sift from 'sift'
import { getNestedValue } from '../utils/object.utils'
import { OmitMethods } from '../utils/typescript.utils'

export abstract class BaseEntityService<T> {
  protected localCacheSeconds: number | null = null
  protected localCache: Map<string, { doc: T & Document; docObj: T; cachedAt: Date }> = new Map()
  protected localCacheAllAt: Date | null = null
  protected localMaxCacheSize: number | null = null

  constructor(private readonly model: Model<T>) {}

  async findById(id: typeof Document.prototype._id): Promise<(T & Document) | null> {
    if (this.isCacheEnabled()) {
      const cached = this.localCache.get(id.toString())
      if (cached && new Date().getTime() - cached.cachedAt.getTime() < this.localCacheSeconds! * 1000) {
        return cached.doc
      }
    }
    const doc = await this.model.findById(id).exec()
    if (doc) {
      this.addToCache(doc)
    }
    return doc
  }

  async findOne(filter: FilterQuery<T>): Promise<(T & Document) | null> {
    if (this.isCacheEnabled()) {
      const result = this.findCachedDocument(filter, true)
      if (result) {
        return result
      }
    }
    const doc = await this.model.findOne(filter).exec()
    if (doc) {
      this.addToCache(doc)
    }
    return doc
  }

  async findMany(filter: FilterQuery<T>, options?: QueryOptions<T>): Promise<(T & Document)[]> {
    const optionKeys = options ? Object.keys(options) : []

    // reading cache is only supported for these options (or no options)
    const isCacheSupportedReading =
      !optionKeys.length || optionKeys.every((key) => ['sort', 'limit', 'skip'].includes(key))

    // writing cache is not supported if these options are present
    const isCacheSupportedWriting = !optionKeys.some((key) => ['projection', 'lean'].includes(key))

    if (this.isCacheEnabled() && this.isFullCacheValid() && isCacheSupportedReading) {
      let cachedDocs = this.filterCachedDocuments(filter)

      if (options?.sort) {
        cachedDocs = this.applySortToCache(cachedDocs, options.sort)
      }
      if (options?.skip) {
        cachedDocs = cachedDocs.slice(options.skip)
      }
      if (options?.limit) {
        cachedDocs = cachedDocs.slice(0, options.limit)
      }

      return cachedDocs
    }

    const docs = await this.model.find(filter, null, options).exec()
    if (isCacheSupportedWriting) {
      docs.forEach((doc) => this.addToCache(doc))
    }
    return docs
  }

  async findAll(): Promise<(T & Document)[]> {
    if (this.isCacheEnabled() && this.isFullCacheValid()) {
      return this.getCachedDocuments()
    }
    const docs = await this.model.find().exec()
    this.localCache.clear()
    docs.forEach((doc) => this.addToCache(doc))
    this.localCacheAllAt = new Date()
    return docs
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    if (this.isCacheEnabled() && this.isFullCacheValid()) {
      return this.filterCachedDocuments(filter).length
    }
    return this.model.countDocuments(filter).exec()
  }

  async create(data: Partial<OmitMethods<T>>): Promise<T> {
    const createdDocument = new this.model(data)
    const savedDoc = (await createdDocument.save()) as T & Document
    this.addToCache(savedDoc)
    return savedDoc
  }

  async updateById(id: typeof Document.prototype._id, data: UpdateQuery<T>) {
    const result = await this.model.updateOne({ _id: id }, data).exec()
    if (this.isCacheEnabled() && result.modifiedCount) {
      const updatedDoc = await this.model.findById(id)
      if (updatedDoc) {
        this.addToCache(updatedDoc)
      }
    }
    return result
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    const result = await this.model.updateOne(filter, update, options).exec()
    if (this.isCacheEnabled() && result.modifiedCount > 0) {
      const updatedDoc = await this.model.findOne(filter)
      if (updatedDoc) {
        this.addToCache(updatedDoc)
      }
    }
    return result
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    const result = await this.model.updateMany(filter, update, options).exec()
    if (this.isCacheEnabled() && result.modifiedCount > 0) {
      const updatedDocs = await this.model.find(filter)
      updatedDocs.forEach((doc) => this.addToCache(doc))
    }
    return result
  }

  async upsertOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ): Promise<{ doc: T & Document; created: boolean }> {
    const existingDoc = await this.findOne(filter)
    if (existingDoc) {
      await this.updateOne(filter, update, options)
      const updatedDoc = await this.findOne(filter)
      return { doc: updatedDoc, created: false }
    }
    const data = ('$set' in update ? update.$set : update) as Partial<OmitMethods<T>>
    const createdDoc = await this.create({
      ...filter,
      ...data,
    })
    return { doc: createdDoc as T & Document, created: true }
  }

  async deleteById(id: typeof Document.prototype._id): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const result = await this.model.deleteOne({ _id: id }).exec()
    if (result.deletedCount > 0) {
      this.removeFromCache(id.toString())
    }
    return result
  }

  async deleteOne(filter: FilterQuery<T>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const result = await this.model.deleteOne(filter).exec()
    if (result.deletedCount > 0) {
      const docToRemove = this.findCachedDocument(filter, false)
      if (docToRemove) {
        this.removeFromCache(docToRemove._id.toString())
      }
    }
    return result
  }

  aggregate(pipeline: any[]) {
    return this.model.aggregate(pipeline).exec()
  }

  bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations)
  }

  setLocalCacheSeconds(seconds: number): void {
    this.localCacheSeconds = seconds
  }

  setLocalMaxCacheSize(size: number | null): void {
    this.localMaxCacheSize = size
  }

  getCacheSize(): number {
    return this.localCache.size
  }

  clearCache(): void {
    this.localCache.clear()
    this.localCacheAllAt = null
  }

  private isCacheEnabled(): boolean {
    return this.localCacheSeconds !== null && this.localCacheSeconds > 0
  }

  private isFullCacheValid(): boolean {
    if (this.localMaxCacheSize !== null || !this.localCacheAllAt) {
      return false
    }
    const now = new Date().getTime()
    return now - this.localCacheAllAt.getTime() < this.localCacheSeconds! * 1000
  }

  private addToCache(doc: T & Document): void {
    if (this.isCacheEnabled()) {
      // Pre-convert document to an object for faster filtering
      const docObj = doc.toObject() as T
      this.localCache.set(doc._id.toString(), { doc, docObj, cachedAt: new Date() })
      this.enforceCacheLimit()
    }
  }

  private enforceCacheLimit(): void {
    if (this.localMaxCacheSize !== null && this.localCache.size > this.localMaxCacheSize) {
      const entriesToRemove = this.localCache.size - this.localMaxCacheSize
      const entries = Array.from(this.localCache.entries())
      entries.sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime())
      for (let i = 0; i < entriesToRemove; i++) {
        this.localCache.delete(entries[i][0])
      }
    }
  }

  private removeFromCache(id: string): void {
    if (this.isCacheEnabled()) {
      this.localCache.delete(id)
    }
  }

  private getCachedDocuments(): (T & Document)[] {
    if (!this.isCacheEnabled()) {
      return []
    }
    const now = new Date().getTime()
    return Array.from(this.localCache.values())
      .filter(({ cachedAt }) => now - cachedAt.getTime() < this.localCacheSeconds! * 1000)
      .map(({ doc }) => doc)
  }

  /**
   * Finds a single cached document that matches the filter
   */
  private findCachedDocument(filter: FilterQuery<T>, checkExpiration: boolean): (T & Document) | null {
    let entries = Array.from(this.localCache.values())

    if (checkExpiration) {
      const now = new Date().getTime()
      entries = entries.filter(({ cachedAt }) => now - cachedAt.getTime() < this.localCacheSeconds! * 1000)
    }

    const siftFilter = sift(filter)
    const foundEntry = entries.find(({ docObj }) => siftFilter(docObj))
    return foundEntry ? foundEntry.doc : null
  }

  /**
   * Returns all cached documents that match the filter
   * Assumes full cache is valid
   */
  private filterCachedDocuments(filter: FilterQuery<T>): (T & Document)[] {
    const entries = Array.from(this.localCache.values())
    const siftFilter = sift(filter)
    return entries.filter(({ docObj }) => siftFilter(docObj)).map(({ doc }) => doc)
  }

  private applySortToCache(docs: (T & Document)[], sort: Record<string, 1 | -1>): (T & Document)[] {
    return [...docs].sort((a, b) => {
      for (const [field, order] of Object.entries(sort)) {
        const aVal = getNestedValue(a, field)
        const bVal = getNestedValue(b, field)

        if (aVal === bVal) continue
        return aVal > bVal ? order : -order
      }
      return 0
    })
  }
}
