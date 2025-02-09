import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { OwneableModel } from '../owneable'

@Schema()
export class BaseMessage {
  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string

  @Prop({ required: true })
  content: string
}

export const BaseMessageSchema = SchemaFactory.createForClass(BaseMessage)

@Schema()
export abstract class BaseConversation<TMessage extends BaseMessage = BaseMessage> extends OwneableModel {
  @Prop()
  title?: string

  @Prop()
  description?: string

  @Prop({ type: [BaseMessageSchema], default: [] })
  messages: TMessage[]

  @Prop({ required: true, default: Date.now })
  lastMessageAt: Date
}
