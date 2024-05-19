import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { SaaslibModule } from 'src/saaslib.module'
import { BaseUser, BaseUserSchema } from 'src/user'

export const testModuleImports = [
  JwtModule.register({ secretOrPrivateKey: 'test' }),
  SaaslibModule.forRoot({
    jwt: { secretOrPrivateKey: 'test' },
    email: { from: 'test@example.com', templates: {} },
  }),
  MongooseModule.forRoot(global.__MONGO_URI__),
  MongooseModule.forFeature([{ name: BaseUser.name, schema: BaseUserSchema }]),
]
