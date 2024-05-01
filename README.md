# Nestjs SaaS Library

## Installation

```bash
$ yarn add nestjs-saas @nestjs/jwt @nestjs/config
$ npx nestjs-saas init
```

## Configuration

The required config variables were appended to your `.env` file. You can change the values as needed.

## Import

```typescript
import { Module } from '@nestjs/common'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { NestjsSaasModule } from 'nestjs-saas'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'

const jwtOptions: JwtModuleOptions = {
  global: true,
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '5 minutes' },
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.register(jwtOptions),
    NestjsSaasModule.forRoot({
      jwt: jwtOptions,
      email: {
        from: 'hi@example.com',
        templates: {},
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```