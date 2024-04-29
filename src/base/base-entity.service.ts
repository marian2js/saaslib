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

  findOne(filter: FilterQuery<T>): Promise<(T & Document) | null> {
    return this.model.findOne(filter).exec()
  }

  findMany(filter: FilterQuery<T>, options?: QueryOptions<T>): Promise<(T & Document)[]> {
    return this.model.find(filter, null, options).exec()
  }

  findAll(): Promise<(T & Document)[]> {
    return this.model.find().exec()
  }

  create(data: Partial<OmitMethods<T>>): Promise<T> {
    const createdDocument = new this.model(data)
    return createdDocument.save() as Promise<T>
  }

  updateById(id: typeof Document.prototype._id, data: UpdateQuery<T>) {
    return this.model.updateOne({ _id: id }, data).exec()
  }

  updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    return this.model.updateOne(filter, update, options).exec()
  }

  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options: MongooseUpdateQueryOptions<T> | null = null,
  ) {
    return this.model.updateMany(filter, update, options).exec()
  }

  deleteById(id: typeof Document.prototype._id) {
    return this.model.deleteOne({ _id: id }).exec()
  }

  deleteOne(filter: FilterQuery<T>) {
    return this.model.deleteOne(filter).exec()
  }

  aggregate(pipeline: any[]) {
    return this.model.aggregate(pipeline).exec()
  }

  bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations)
  }
}
