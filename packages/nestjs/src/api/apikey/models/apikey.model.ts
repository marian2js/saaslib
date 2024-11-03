import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type ApiKeyDocument = HydratedDocument<ApiKey>

@Schema()
export class ApiKey {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId

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
