import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { OwneableModel } from '../owneable'

@Schema()
export class BaseMessage extends OwneableModel {
  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string

  @Prop({ required: true })
  content: string

  @Prop({ type: Types.ObjectId, ref: 'BaseConversation', required: true })
  conversation: Types.ObjectId
}

export const BaseMessageSchema = SchemaFactory.createForClass(BaseMessage)
