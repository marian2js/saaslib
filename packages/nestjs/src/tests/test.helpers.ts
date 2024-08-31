import { DiscoveryModule } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { SaaslibModule } from 'src/saaslib.module'
import { BaseUser } from 'src/user'

export const BaseUserSchema = SchemaFactory.createForClass(BaseUser)

export const testModuleImports = [
  JwtModule.register({ secretOrPrivateKey: 'test' }),
  SaaslibModule.forRoot({
    jwt: { secretOrPrivateKey: 'test' },
    email: { from: 'test@example.com', templates: {} },
  }),
  MongooseModule.forRoot(global.__MONGO_URI__),
  MongooseModule.forFeature([{ name: BaseUser.name, schema: BaseUserSchema }]),
  ScheduleModule.forRoot(),
  DiscoveryModule,
]
