import { Logger } from '@nestjs/common'
import {
  Document,
  FilterQuery,
  Model,
  MongooseUpdateQueryOptions,
  QueryOptions,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from 'mongoose'
import { OmitMethods } from '../utils/typescript.utils'

export abstract class BaseEntityService<T> {
  protected readonly logger: Logger = new Logger(BaseEntityService.name)

  constructor(private readonly model: Model<T>) {}

  async findOne(filter: FilterQuery<T>): Promise<(T & Document) | null> {
    return this.model.findOne(filter).exec()
  }

  async findMany(filter: FilterQuery<T>, options?: QueryOptions<T>): Promise<(T & Document)[]> {
    return this.model.find(filter, null, options).exec()
  }

  async findAll(): Promise<(T & Document)[]> {
    return await this.model.find().exec()
  }

  async create(data: Partial<OmitMethods<T>>): Promise<T> {
    const createdDocument = new this.model(data)
    return createdDocument.save() as T
  }

  async updateById(id: typeof Document.prototype._id, data: UpdateQuery<T>) {
    return this.model.updateOne({ _id: id }, data).exec()
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    return this.model.updateOne(filter, update, options).exec()
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    return this.model.updateMany(filter, update, options).exec()
  }

  async deleteById(id: typeof Document.prototype._id) {
    return this.model.deleteOne({ _id: id }).exec()
  }

  async aggregate(pipeline: any[]) {
    return this.model.aggregate(pipeline).exec()
  }

  async bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations)
  }
}
