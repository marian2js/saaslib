import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { BaseUser } from '../user/models/base-user.model'

export type MessageLogDocument = MessageLog & Document

@Schema()
export class MessageLog {
  _id: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: BaseUser.name, required: true })
  owner: Types.ObjectId
}

export const MessageLogSchema = SchemaFactory.createForClass(MessageLog)
