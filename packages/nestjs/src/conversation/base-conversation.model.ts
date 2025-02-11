import { Prop, Schema } from '@nestjs/mongoose'
import { OwneableModel } from '../owneable'

export enum BaseConversationVisibility {
  Private = 'private',
  Public = 'public',
}

@Schema()
export abstract class BaseConversation extends OwneableModel {
  @Prop()
  title?: string

  @Prop({ required: true, default: Date.now })
  lastMessageAt: Date

  @Prop({
    required: true,
    default: BaseConversationVisibility.Private,
  })
  visibility: BaseConversationVisibility
}
