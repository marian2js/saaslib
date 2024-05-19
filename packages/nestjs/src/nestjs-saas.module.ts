import { DynamicModule, Global, MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import * as cookieParser from 'cookie-parser'
import { EmailService, GoogleStrategy, HttpExceptionFilter, UserGuard } from '.'
import { NestjsSaasOptions } from './types/nestjs-saas-options'
import { UserProvider, UserProviderSchema } from './user/models/user-provider.model'
import { UserProviderService } from './user/services/user-provider.service'

@Global()
@Module({})
export class NestjsSaasModule {
  static forRoot(options: NestjsSaasOptions): DynamicModule {
    return {
      module: NestjsSaasModule,
      imports: [
        JwtModule.register(options.jwt),
        MongooseModule.forFeature([{ name: UserProvider.name, schema: UserProviderSchema }]),
      ],
      providers: [
        {
          provide: 'NS_OPTIONS',
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
        UserGuard,
        EmailService,
        UserProviderService,
      ],
      controllers: [],
      exports: ['NS_OPTIONS', EmailService, UserProviderService],
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*')
  }
}
