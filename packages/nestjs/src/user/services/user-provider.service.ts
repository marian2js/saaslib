import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../../base/base-entity.service'
import { UserSSOProfile } from '../auth/types/auth.types'
import { BaseUser } from '../models'
import { UserProvider } from '../models/user-provider.model'

@Injectable()
export class UserProviderService extends BaseEntityService<UserProvider> {
  constructor(@InjectModel(UserProvider.name) private userProviderModel: Model<UserProvider>) {
    super(userProviderModel)
  }

  async createFromSSO(user: BaseUser, profile: UserSSOProfile): Promise<UserProvider> {
    return await this.create({
      userId: user._id,
      provider: profile.provider,
      providerId: profile.id,
      lastLogin: new Date(),
    })
  }

  async createOrUpdateFromSSO(user: BaseUser, profile: UserSSOProfile): Promise<UserProvider> {
    const provider = await this.findOne({ provider: profile.provider, providerId: profile.id })
    if (provider) {
      provider.lastLogin = new Date()
      return await provider.save()
    }
    return await this.createFromSSO(user, profile)
  }
}
