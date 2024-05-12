import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../../base/base-entity.service'
import { BaseUser } from '../models/base-user.model'

@Injectable()
export class BaseUserService<U extends BaseUser> extends BaseEntityService<U> {
  constructor(@InjectModel(BaseUser.name) private baseUserModel: Model<U>) {
    super(baseUserModel)
  }
}
