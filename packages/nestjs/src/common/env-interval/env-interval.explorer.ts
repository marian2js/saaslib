import { Injectable, OnModuleInit } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ENV_INTERVAL_KEY, EnvIntervalOptions } from './env-interval.decorator'

@Injectable()
export class EnvIntervalExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders()

    providers.forEach((wrapper) => {
      const { instance } = wrapper
      if (instance && Object.getPrototypeOf(instance)) {
        const prototype = Object.getPrototypeOf(instance)
        this.metadataScanner.getAllMethodNames(prototype).forEach((methodKey) => {
          this.processMethod(instance, methodKey)
        })
      }
    })
  }

  private processMethod(instance: any, methodKey: string) {
    const options = this.reflector.get<EnvIntervalOptions>(ENV_INTERVAL_KEY, instance[methodKey])
    if (options) {
      const envValue = process.env[options.envKey]
      let intervalInMs = 0

      if (envValue) {
        if (envValue.toLowerCase() === 'true') {
          intervalInMs = options.defaultMs
        } else {
          const customInterval = parseInt(envValue, 10)
          if (!isNaN(customInterval) && customInterval > 0) {
            intervalInMs = customInterval
          }
        }

        if (!intervalInMs) {
          return
        }

        const intervalId = setInterval(() => {
          instance[methodKey].call(instance)
        }, intervalInMs)
        this.schedulerRegistry.addInterval(`${instance.constructor.name}.${methodKey}`, intervalId)
      }
    }
  }
}
