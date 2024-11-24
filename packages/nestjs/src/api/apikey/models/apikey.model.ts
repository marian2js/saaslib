import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { OwneableModel } from '../../../owneable/models/owneable.model'

export type ApiKeyDocument = HydratedDocument<ApiKey>

@Schema()
export class ApiKey extends OwneableModel {
  @Prop({ unique: true, index: true })
  key: string

  @Prop()
  limit?: number

  @Prop()
  ttl?: number

  @Prop()
  unlimited?: boolean
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey)
