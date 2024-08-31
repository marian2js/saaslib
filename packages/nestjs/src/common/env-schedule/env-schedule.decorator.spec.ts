import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Test, TestingModule } from '@nestjs/testing'
import { EnvScheduleExplorer } from './env-schedule.explorer'

describe('EnvScheduleExplorer', () => {
  let explorer: EnvScheduleExplorer
  let discoveryService: DiscoveryService
  let metadataScanner: MetadataScanner
  let reflector: Reflector

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvScheduleExplorer,
        {
          provide: DiscoveryService,
          useValue: {
            getProviders: jest.fn(),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            getAllMethodNames: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addInterval: jest.fn(),
            addCronJob: jest.fn(),
            getIntervals: jest.fn().mockReturnValue([]),
            getCronJobs: jest.fn().mockReturnValue([]),
            deleteInterval: jest.fn(),
            deleteCronJob: jest.fn(),
          },
        },
      ],
    }).compile()

    explorer = module.get<EnvScheduleExplorer>(EnvScheduleExplorer)
    discoveryService = module.get<DiscoveryService>(DiscoveryService)
    metadataScanner = module.get<MetadataScanner>(MetadataScanner)
    reflector = module.get<Reflector>(Reflector)
  })

  it('should be defined', () => {
    expect(explorer).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should process all providers and their methods', () => {
      const mockProvider = {
        instance: {
          method1: jest.fn(),
          method2: jest.fn(),
        },
      }
      ;(discoveryService.getProviders as jest.Mock).mockReturnValue([mockProvider])
      ;(metadataScanner.getAllMethodNames as jest.Mock).mockReturnValue(['method1', 'method2'])

      explorer.onModuleInit()

      expect(discoveryService.getProviders).toHaveBeenCalled()
      expect(metadataScanner.getAllMethodNames).toHaveBeenCalled()
      expect(reflector.get).toHaveBeenCalledTimes(4) // 2 methods * 2 decorator types
    })
  })
})
