import { Controller } from '@nestjs/common'
import { OwneableEntityController } from '../../../owneable'
import { BaseUser } from '../../../user'
import { SecurityUtils } from '../../../utils'
import { ApiKey } from '../models/apikey.model'

@Controller()
export abstract class BaseApiKeyController<E extends ApiKey, U extends BaseUser> extends OwneableEntityController<
  E,
  U
> {
  async beforeCreate(entity: E): Promise<E> {
    return {
      ...entity,
      key: SecurityUtils.generateRandomString(48),
    }
  }

  async beforeUpdate(_existing: E, update: Partial<E>): Promise<Partial<E>> {
    return {
      ...update,
      key: SecurityUtils.generateRandomString(48),
    }
  }
}
