import { DynamicModule, Global, Module } from '@nestjs/common'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { GoogleStrategy, UserGuard } from './main'

interface NestjsSaasOptions {
  jwtOptions: JwtModuleOptions
}

@Global()
@Module({})
export class NestjsSaasModule {
  static forRoot(options: NestjsSaasOptions): DynamicModule {
    return {
      module: NestjsSaasModule,
      imports: [JwtModule.register(options.jwtOptions)],
      providers: [
        {
          provide: 'NS_OPTIONS',
          useValue: options,
        },
        GoogleStrategy,
        UserGuard,
      ],
      controllers: [],
      exports: ['NS_OPTIONS'],
    }
  }
}
