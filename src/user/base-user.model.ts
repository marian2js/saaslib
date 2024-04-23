import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type BaseUserDocument = HydratedDocument<BaseUser>

export enum BaseUserRole {
  Admin = 'admin',
}

@Schema()
export class BaseUser {
  _id: Types.ObjectId

  @Prop({
    required: true,
    index: true,
    unique: true,
    trim: true,
    maxlength: 50,
    transform: (value: string) => value.toLowerCase(),
  })
  email: string

  @Prop({})
  role?: BaseUserRole

  @Prop({})
  name?: string

  @Prop({})
  hashedPassword?: string

  @Prop({
    required: true,
    default: 0,
  })
  passwordAttempt: number

  @Prop({
    required: true,
    default: false,
  })
  isVerified: boolean

  @Prop({
    required: true,
    default: false,
  })
  isBlocked: boolean

  @Prop({})
  avatar?: string
}

export const BaseUserSchema = SchemaFactory.createForClass(BaseUser)
