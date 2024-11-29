import { Prop, Schema } from '@nestjs/mongoose'

@Schema({ _id: false })
export class UserSubscription {
  @Prop({ required: true })
  product: string

  @Prop({ required: true })
  periodEnd: Date

  @Prop({ required: true })
  stripeSubscriptionId: string

  @Prop()
  nextProduct?: string
}
