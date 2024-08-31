import { DynamicModule, Global, MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_PIPE, DiscoveryModule } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import * as cookieParser from 'cookie-parser'
import { EmailService, GoogleStrategy, HttpExceptionFilter, UserGuard } from '.'
import { EnvIntervalExplorer } from './common/env-interval/env-interval.explorer'
import { SaaslibOptions } from './types/saaslib-options'
import { LinkedInStrategy } from './user/auth/strategies/linkedin.strategy'
import { UserProvider, UserProviderSchema } from './user/models/user-provider.model'
import { UserProviderService } from './user/services/user-provider.service'
import { StorageService } from './utils/storage/storage.service'

@Global()
@Module({})
export class SaaslibModule {
  static forRoot(options: SaaslibOptions): DynamicModule {
    return {
      module: SaaslibModule,
      imports: [
        JwtModule.register(options.jwt),
        MongooseModule.forFeature([{ name: UserProvider.name, schema: UserProviderSchema }]),

        ScheduleModule.forRoot(),
        DiscoveryModule,
      ],
      providers: [
        {
          provide: 'SL_OPTIONS',
          useValue: options,
        },
        {
          provide: APP_PIPE,
          useClass: ValidationPipe,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
        UserGuard,
        EmailService,
        UserProviderService,
        StorageService,

        // Auth Strategies
        ...(process.env.GOOGLE_CLIENT_ID ? [GoogleStrategy] : []),
        ...(process.env.LINKEDIN_CLIENT_ID ? [LinkedInStrategy] : []),

        // Utils
        EnvIntervalExplorer,
      ],
      controllers: [],
      exports: ['SL_OPTIONS', EmailService, UserProviderService, StorageService],
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*')
  }
}
