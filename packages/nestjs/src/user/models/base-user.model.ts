import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import { UserSubscription } from '../../subscriptions/models/user-subscription.model'

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
  avatar?: string

  @Prop({})
  hashedPassword?: string

  @Prop({})
  refreshTokenHash?: string

  @Prop({})
  passwordAttempts?: number

  @Prop({})
  emailVerified: boolean

  @Prop({})
  emailVerificationCode?: string

  @Prop({})
  passwordResetCode?: string

  @Prop({})
  passwordResetAttempts?: number

  @Prop({})
  firstPasswordResetAttempt?: Date

  @Prop({})
  blocked?: boolean

  @Prop({})
  stripeCustomerId?: string

  @Prop({
    type: Map,
    of: SchemaFactory.createForClass(UserSubscription),
    default: new Map(),
  })
  subscriptions: Map<string, UserSubscription>

  @Prop()
  failedPaymentEmailSentAt?: Date
}
