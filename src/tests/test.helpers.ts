import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { NestjsSaasModule } from 'src/nestjs-saas.module'
import { BaseUser, BaseUserSchema } from 'src/user'

export const testModuleImports = [
  JwtModule.register({ secretOrPrivateKey: 'test' }),
  NestjsSaasModule.forRoot({
    jwt: { secretOrPrivateKey: 'test' },
    email: { from: 'test@example.com', templates: {} },
  }),
  MongooseModule.forRoot(global.__MONGO_URI__),
  MongooseModule.forFeature([{ name: BaseUser.name, schema: BaseUserSchema }]),
]
