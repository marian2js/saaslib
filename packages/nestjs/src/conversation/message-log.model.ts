import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { BaseUser } from '../user/models/base-user.model'

@Schema()
export class MessageLog {
  @Prop({ type: Types.ObjectId, ref: BaseUser.name, required: true })
  owner: Types.ObjectId
}

export const MessageLogSchema = SchemaFactory.createForClass(MessageLog)
