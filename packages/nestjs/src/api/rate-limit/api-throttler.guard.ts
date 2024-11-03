import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerRequest, ThrottlerStorage } from '@nestjs/throttler'
import { ApiKeyService } from '../apikey/services/apikey.service'

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    protected apiKeyService: ApiKeyService,
  ) {
    super(options, storageService, reflector)
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const req = requestProps.context.switchToHttp().getRequest()
    const apiKeyString = this.extractApiKey(req)
    const apiKey = await this.apiKeyService.findOne({ key: apiKeyString })

    if (apiKey) {
      if (apiKey.unlimited) {
        return true
      }
      if (typeof apiKey.limit === 'number') {
        requestProps.limit = apiKey.limit
      }
      if (typeof apiKey.ttl === 'number') {
        requestProps.ttl = apiKey.ttl
      }
    }

    return super.handleRequest(requestProps)
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const apiKey = this.extractApiKey(req)
    return apiKey || req.ip
  }

  protected extractApiKey(req: Record<string, any>): string | null {
    // Check authorization header first
    const authHeader = req.headers['authorization']
    if (authHeader) {
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
