import { Reflector } from '@nestjs/core'
import { ENV_INTERVAL_KEY, EnvInterval, EnvIntervalOptions } from './env-interval.decorator'

describe('EnvInterval Decorator', () => {
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
  })

  it('should set metadata with provided options', () => {
    class TestClass {
      @EnvInterval({ defaultMs: 1000, envKey: 'TEST_INTERVAL' })
      testMethod() {}
    }

    const options: EnvIntervalOptions = { defaultMs: 1000, envKey: 'TEST_INTERVAL' }
    const metadata = reflector.get(ENV_INTERVAL_KEY, TestClass.prototype.testMethod)
    expect(metadata).toEqual(options)
  })

  it('should set different metadata for different methods', () => {
    class TestClass {
      @EnvInterval({ defaultMs: 1000, envKey: 'TEST_INTERVAL_1' })
      testMethod1() {}

      @EnvInterval({ defaultMs: 2000, envKey: 'TEST_INTERVAL_2' })
      testMethod2() {}
    }

    const metadata1 = reflector.get(ENV_INTERVAL_KEY, TestClass.prototype.testMethod1)
    const metadata2 = reflector.get(ENV_INTERVAL_KEY, TestClass.prototype.testMethod2)

    expect(metadata1).toEqual({ defaultMs: 1000, envKey: 'TEST_INTERVAL_1' })
    expect(metadata2).toEqual({ defaultMs: 2000, envKey: 'TEST_INTERVAL_2' })
  })

  it('should not set metadata for methods without decorator', () => {
    class TestClass {
      methodWithoutDecorator() {}
    }
    const metadata = reflector.get(ENV_INTERVAL_KEY, TestClass.prototype.methodWithoutDecorator)
    expect(metadata).toBeUndefined()
  })
})
