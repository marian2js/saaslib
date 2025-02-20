import { Prop, Schema } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { OwneableModel } from '../owneable'

@Schema()
export abstract class BaseMessage<T = string> extends OwneableModel {
  @Prop({ type: Types.ObjectId, ref: 'BaseConversation', required: true })
  conversation: Types.ObjectId

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string

  @Prop({ type: Number, enum: [1, 0, -1] })
  feedback: 1 | 0 | -1

  abstract content: T
}
