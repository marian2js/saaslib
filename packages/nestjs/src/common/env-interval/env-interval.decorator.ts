import { SetMetadata } from '@nestjs/common'

export const ENV_INTERVAL_KEY = 'ENV_INTERVAL'

export interface EnvIntervalOptions {
  /**
   * Default interval in milliseconds.
   */
  defaultMs: number

  /**
   * Environment variable key to override the default interval.
   * If the environment variable is set to a number, it will be used as the interval in milliseconds.
   * If set to 'true', the defaultMs value will be used.
   * If not set or set to any other value, no interval will be created.
   */
  envKey: string
}

/**
 * Decorator that creates an interval based on an environment variable.
 * @param options - Configuration options for the interval
 * @returns MethodDecorator
 */
export function EnvInterval(options: EnvIntervalOptions): MethodDecorator {
  return SetMetadata(ENV_INTERVAL_KEY, options)
}
