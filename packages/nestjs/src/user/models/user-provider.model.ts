import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type UserProviderDocument = HydratedDocument<UserProvider>

@Schema()
export class UserProvider {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId

  @Prop({ required: true })
  provider: string

  @Prop({ required: true, unique: true })
  providerId: string

  @Prop()
  lastLogin: Date
}

export const UserProviderSchema = SchemaFactory.createForClass(UserProvider)

UserProviderSchema.index({ userId: 1, providerName: 1 }, { unique: true })
