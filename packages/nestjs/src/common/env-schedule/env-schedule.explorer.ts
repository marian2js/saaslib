import { Injectable, OnModuleInit } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ENV_CRON_KEY, ENV_INTERVAL_KEY, EnvCronOptions, EnvIntervalOptions } from './env-schedule.decorators'

@Injectable()
export class EnvScheduleExplorer implements OnModuleInit {
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

  onModuleDestroy() {
    this.clearAllScheduledTasks()
  }

  private processMethod(instance: any, methodKey: string) {
    this.processIntervalDecorator(instance, methodKey)
    this.processCronDecorator(instance, methodKey)
  }

  private processIntervalDecorator(instance: any, methodKey: string) {
    const intervalOptions = this.reflector.get<EnvIntervalOptions>(ENV_INTERVAL_KEY, instance[methodKey])
    if (intervalOptions) {
      const envValue = process.env[intervalOptions.envKey]
      if (envValue) {
        let intervalMs = 0
        if (envValue.toLowerCase() === 'true') {
          intervalMs = intervalOptions.defaultMs
        } else {
          const parsedValue = parseInt(envValue, 10)
          if (!isNaN(parsedValue) && parsedValue > 0) {
            intervalMs = parsedValue
          }
        }
        if (intervalMs > 0) {
          const intervalId = setInterval(() => {
            instance[methodKey].call(instance)
          }, intervalMs)
          this.schedulerRegistry.addInterval(`${instance.constructor.name}.${methodKey}`, intervalId)
        }
      }
    }
  }

  private processCronDecorator(instance: any, methodKey: string) {
    const cronOptions = this.reflector.get<EnvCronOptions>(ENV_CRON_KEY, instance[methodKey])
    if (cronOptions) {
      const envValue = process.env[cronOptions.envKey]
      if (envValue && envValue.toLowerCase() === 'true') {
        const job = new CronJob(cronOptions.cronExpression, () => {
          instance[methodKey].call(instance)
        })
        this.schedulerRegistry.addCronJob(`${instance.constructor.name}.${methodKey}`, job)
        job.start()
      }
    }
  }

  clearAllScheduledTasks() {
    for (const interval of this.schedulerRegistry.getIntervals()) {
      this.schedulerRegistry.deleteInterval(interval)
    }
    for (const [jobName] of this.schedulerRegistry.getCronJobs()) {
      this.schedulerRegistry.deleteCronJob(jobName)
    }
  }
}
