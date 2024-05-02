import { DynamicModule, Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { EmailService, GoogleStrategy, UserGuard } from '.'
import { NestjsSaasOptions } from './types/nestjs-saas-options'

@Global()
@Module({})
export class NestjsSaasModule {
  static forRoot(options: NestjsSaasOptions): DynamicModule {
    return {
      module: NestjsSaasModule,
      imports: [JwtModule.register(options.jwt)],
      providers: [
        {
          provide: 'NS_OPTIONS',
          useValue: options,
        },
        GoogleStrategy,
        UserGuard,
        EmailService,
      ],
      controllers: [],
      exports: ['NS_OPTIONS', EmailService],
    }
  }
}
