import { Prop, Schema } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { OwneableModel } from '../owneable'

@Schema()
export class BaseSharedConversation extends OwneableModel {
  @Prop({ required: true })
  title: string

  @Prop({ required: true, unique: true })
  slug: string

  @Prop({ type: Types.ObjectId, ref: 'BaseConversation', required: true })
  original: Types.ObjectId
}
