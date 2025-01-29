import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerRequest, ThrottlerStorage } from '@nestjs/throttler'
import { BaseUser } from '../../user'
import { ApiKey } from '../apikey/models/apikey.model'
import { BaseApiKeyService } from '../apikey/services/base-apikey.service'

@Injectable()
export class BaseApiThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    protected apiKeyService: BaseApiKeyService<ApiKey, BaseUser>,
  ) {
    super(options, storageService, reflector)
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const req = requestProps.context.switchToHttp().getRequest()
    const apiKeyString = this.extractApiKey(req)
    const apiKey = await this.apiKeyService.findOne({ key: apiKeyString })

    if (apiKey) {
      const throttling = await this.apiKeyService.getThrottlingData(apiKey)
      if (throttling.unlimited) {
        return true
      }
      if (typeof throttling.limit === 'number') {
        requestProps.limit = throttling.limit
        requestProps.throttler.limit = throttling.limit
      }
      if (typeof throttling.ttl === 'number') {
        requestProps.ttl = throttling.ttl
        requestProps.throttler.ttl = throttling.ttl
      }
      requestProps.throttler.name = apiKey.owner.toString()
    } else if (apiKeyString) {
      return false
    }

    return super.handleRequest(requestProps)
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const apiKey = this.extractApiKey(req)
    return apiKey || req.ip
  }

  protected extractApiKey(req: Record<string, any>): string | null {
    // x-api-key has max priority
    const apiKeyHeader = req.headers['x-api-key']
    if (apiKeyHeader) {
      return apiKeyHeader
    }

    const authHeader = req.headers['authorization']
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1]
      }
      return authHeader
    }

    // Check query parameter
    const queryApiKey = req.query?.apikey
    if (queryApiKey) {
      return queryApiKey
    }

    return null
  }
}
