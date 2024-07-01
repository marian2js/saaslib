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
import { OmitMethods } from '../utils/typescript.utils'

export abstract class BaseEntityService<T> {
  protected localCacheSeconds: number | null = null
  protected localCache: Map<string, { doc: T & Document; cachedAt: Date }> = new Map()
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
      const cachedDocs = this.getCachedDocuments()
      const result = cachedDocs.find(sift(filter))
      if (result) return result
    }
    const doc = await this.model.findOne(filter).exec()
    if (doc) {
      this.addToCache(doc)
    }
    return doc
  }

  async findMany(filter: FilterQuery<T>, options?: QueryOptions<T>): Promise<(T & Document)[]> {
    // cache is not supported when using options
    if (this.isCacheEnabled() && this.isFullCacheValid() && !Object.keys(options ?? {}).length) {
      const cachedDocs = this.getCachedDocuments()
      return cachedDocs.filter(sift(filter))
    }
    const docs = await this.model.find(filter, null, options).exec()
    docs.forEach((doc) => this.addToCache(doc))
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
      const cachedDocs = this.getCachedDocuments()
      return cachedDocs.filter(sift(filter)).length
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
      const cachedDocs = this.getCachedDocuments()
      const docToRemove = cachedDocs.find(sift(filter))
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
      this.localCache.set(doc._id.toString(), { doc, cachedAt: new Date() })
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
}
