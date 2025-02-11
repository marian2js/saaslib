import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'

@Schema()
export class BaseMessage {
  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string

  @Prop({ required: true })
  content: string

  @Prop({ type: Types.ObjectId, ref: 'BaseConversation', required: true })
  conversation: Types.ObjectId

  @Prop({ required: true, default: Date.now })
  createdAt: Date
}

export const BaseMessageSchema = SchemaFactory.createForClass(BaseMessage)
