import { Prop, Schema } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { OwneableModel } from '../owneable'
import { BaseMessage } from './base-message.model'

export enum BaseConversationVisibility {
  Private = 'private',
  Public = 'public',
}

@Schema()
export abstract class BaseConversation<
  TMessage extends BaseMessage = BaseMessage,
  TVisibility extends BaseConversationVisibility = BaseConversationVisibility,
> extends OwneableModel {
  @Prop()
  title?: string

  @Prop({ type: [{ type: Types.ObjectId, ref: 'BaseMessage' }], default: [] })
  messages: Types.ObjectId[] | TMessage[]

  @Prop({ required: true, default: Date.now })
  lastMessageAt: Date

  @Prop({
    required: true,
    default: BaseConversationVisibility.Private,
  })
  visibility: TVisibility
}
