import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../base/base-entity.service'
import { BaseUser } from './base-user.model'

@Injectable()
export class BaseUserService extends BaseEntityService<BaseUser> {
  constructor(@InjectModel(BaseUser.name) private baseUserModel: Model<BaseUser>) {
    super(baseUserModel)
  }
}
