import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type BaseUserDocument = HydratedDocument<BaseUser>

@Schema()
export class BaseUser {
  _id: Types.ObjectId

  @Prop({
    required: true,
    index: true,
    unique: true,
    trim: true,
    maxlength: 50,
  })
  email: string
}

export const BaseUserSchema = SchemaFactory.createForClass(BaseUser)
