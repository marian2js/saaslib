import { Injectable } from '@nestjs/common'
import { DiscoveryService } from '@nestjs/core'
import { PATH_METADATA } from '@nestjs/common/constants'
import { OwneableEntityController } from '../../owneable/controllers/owneable-entity.controller'

@Injectable()
export class AdminCollectionsService {
  constructor(private discoveryService: DiscoveryService) {}

  getCollections(): Array<{ key: string; label?: string }> {
    const controllers = this.discoveryService.getControllers()
    const collections: Array<{ key: string; label?: string }> = []

    for (const wrapper of controllers) {
      const instance = wrapper.instance as any
      if (!instance) continue
      if (!(instance instanceof OwneableEntityController)) continue

      const metatype = wrapper.metatype
      if (!metatype) continue
      const path = Reflect.getMetadata(PATH_METADATA, metatype)
      const key = Array.isArray(path) ? path[0] : path
      if (!key || typeof key !== 'string') continue

      collections.push({ key, label: this.humanize(key) })
    }

    return collections.sort((a, b) => a.key.localeCompare(b.key))
  }

  private humanize(value: string): string {
    return value
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  }
}
