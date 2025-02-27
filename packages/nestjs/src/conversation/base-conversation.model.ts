import { Prop, Schema } from '@nestjs/mongoose'
import { OwneableModel } from '../owneable'

@Schema()
export abstract class BaseConversation extends OwneableModel {
  @Prop()
  title?: string

  @Prop({ required: true, default: Date.now })
  lastMessageAt: Date
}
