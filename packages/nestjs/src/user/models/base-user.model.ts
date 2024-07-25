import { Prop, Schema } from '@nestjs/mongoose'
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
  blocked: boolean

  @Prop({ experimental: true })
  experimentalBlurMethod?: BlurViewExperimentalProps['experimentalBlurMethod']
}
