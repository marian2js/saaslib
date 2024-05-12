import { Prop } from '@nestjs/mongoose'
import { Types } from 'mongoose'

export abstract class OwneableModel {
  _id?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId
}
