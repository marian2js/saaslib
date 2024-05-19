import { DynamicModule, Global, MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import * as cookieParser from 'cookie-parser'
import { EmailService, GoogleStrategy, HttpExceptionFilter, UserGuard } from '.'
import { SaaslibOptions } from './types/saaslib-options'
import { LinkedInStrategy } from './user/auth/strategies/linkedin.strategy'
import { UserProvider, UserProviderSchema } from './user/models/user-provider.model'
import { UserProviderService } from './user/services/user-provider.service'

@Global()
@Module({})
export class SaaslibModule {
  static forRoot(options: SaaslibOptions): DynamicModule {
    return {
      module: SaaslibModule,
      imports: [
        JwtModule.register(options.jwt),
        MongooseModule.forFeature([{ name: UserProvider.name, schema: UserProviderSchema }]),
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
        GoogleStrategy,
        LinkedInStrategy,
        UserGuard,
        EmailService,
        UserProviderService,
      ],
      controllers: [],
      exports: ['SL_OPTIONS', EmailService, UserProviderService],
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*')
  }
}
