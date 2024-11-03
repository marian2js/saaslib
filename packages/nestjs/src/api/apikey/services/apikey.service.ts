import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../../../base'
import { ApiKey } from '../models/apikey.model'

@Injectable()
export class ApiKeyService extends BaseEntityService<ApiKey> {
  protected localCacheSeconds: number = 60 * 60 * 24

  constructor(@InjectModel(ApiKey.name) apiKeyModel: Model<ApiKey>) {
    super(apiKeyModel)
  }
}
