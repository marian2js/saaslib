import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'

@Schema()
export class NewsletterSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId

  @Prop({ required: true })
  key: string

  @Prop({ required: true })
  subscribed: boolean

  @Prop({ required: true })
  token: string

  @Prop({ required: true, default: 0 })
  emailsSent: number

  @Prop({ type: Date })
  lastEmailSentAt?: Date
}

export const NewsletterSubscriptionSchema = SchemaFactory.createForClass(NewsletterSubscription)
NewsletterSubscriptionSchema.index({ user: 1, key: 1 }, { unique: true })
