import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OwneableEntityService } from '../../../owneable/services/owneable-entity.service'
import { BaseUser } from '../../../user/models/base-user.model'
import { ApiKey } from '../models/apikey.model'

@Injectable()
export abstract class BaseApiKeyService<E extends ApiKey, U extends BaseUser> extends OwneableEntityService<E, U> {
  protected localCacheSeconds: number = 60 * 60 * 24

  constructor(@InjectModel(ApiKey.name) apiKeyModel: Model<E>) {
    super(apiKeyModel)
  }

  getApiObject(entity: E, _owner: U) {
    return {
      id: entity._id,
      key: entity.key,
    }
  }

  getThrottlingData(apiKey: E): Partial<E> | Promise<Partial<E>> {
    if (apiKey.unlimited) {
      return { unlimited: true } as Partial<E>
    }
    const props: Partial<E> = {}
    if (typeof apiKey.limit === 'number') {
      props.limit = apiKey.limit
    }
    if (typeof apiKey.ttl === 'number') {
      props.ttl = apiKey.ttl
    }
    return props
  }
}
