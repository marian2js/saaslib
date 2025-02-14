import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerRequest, ThrottlerStorage } from '@nestjs/throttler'
import { BaseUser } from '../../user'
import { ApiKey } from '../apikey/models/apikey.model'
import { BaseApiKeyService } from '../apikey/services/base-apikey.service'

export type PathThrottlingConfig = {
  limit?: number
  ttl?: number
  unlimited?: boolean
  disabled?: boolean
}

@Injectable()
export class BaseApiThrottlerGuard extends ThrottlerGuard {
  protected pathsConfig: Record<string, PathThrottlingConfig> = {}

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    protected apiKeyService: BaseApiKeyService<ApiKey, BaseUser>,
  ) {
    super(options, storageService, reflector)
  }

  /**
   * Set the default rate limiting configuration for specific paths
   * @param config Record of paths and their rate limiting configuration
   */
  setPathsConfig(config: Record<string, PathThrottlingConfig>) {
    this.pathsConfig = config
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const req = requestProps.context.switchToHttp().getRequest()
    const apiKeyString = this.extractApiKey(req)
    const apiKey = await this.apiKeyService.findOne({ key: apiKeyString })

    if (apiKey) {
      const path = req.route?.path
      const apiKeyPathConfig = path ? apiKey.paths?.[path] : undefined
      const defaultPathConfig = path ? this.pathsConfig[path] : undefined
      const pathConfig = apiKeyPathConfig || defaultPathConfig

      if (defaultPathConfig?.disabled && !apiKeyPathConfig) {
        return false
      }

      // Priority order: API key path config > default path config > API key default config
      const throttling = pathConfig || (await this.apiKeyService.getThrottlingData(apiKey))

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

      return super.handleRequest(requestProps)
    }

    // No API key present or invalid API key, deny access
    return false
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
