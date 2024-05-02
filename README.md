# Nestjs SaaS Library

## Installation

```bash
$ yarn add nestjs-saas @nestjs/jwt @nestjs/config @nestjs/mongoose
$ npx nestjs-saas init
```

## Configuration

The required config variables were appended to your `.env` file. You can change the values as needed.

## Import

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { NestjsSaasModule } from 'nestjs-saas'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthController } from './user/auth/auth.controller'
import { AuthService } from './user/auth/auth.service'
import { User, UserSchema } from './user/user.model'
import { UserService } from './user/user.service'
import { UserController } from './user/users.controller'

const jwtOptions: JwtModuleOptions = {
  global: true,
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '5 minutes' },
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register(jwtOptions),
    NestjsSaasModule.forRoot({
      jwt: jwtOptions,
      email: {
        from: 'hi@example.com',
        templates: {},
      },
    }),
  ],
  controllers: [AppController, AuthController, UserController],
  providers: [AppService, AuthService, UserService],
})
export class AppModule {}
```

Enable global validation pipe in `main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({}))
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
```