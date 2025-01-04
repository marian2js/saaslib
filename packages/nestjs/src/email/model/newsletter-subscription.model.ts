import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'

@Schema({ _id: false })
export class NewsletterSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId

  @Prop({ required: true })
  key: string

  @Prop({ required: true })
  subscribed: boolean

  @Prop({ required: true })
  token: string
}

export const NewsletterSubscriptionSchema = SchemaFactory.createForClass(NewsletterSubscription)
NewsletterSubscriptionSchema.index({ user: 1, key: 1 }, { unique: true })
