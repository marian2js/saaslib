import { BaseUser } from '../base-user.model'
import { BaseUserService } from '../base-user.service'

export interface SocialAuthUser {
  email: string
  firstName: string
  lastName: string
  picture: string
}

export class BaseAuthService {
  constructor(private baseUserService: BaseUserService) {}

  async completeSocialAuth(user: SocialAuthUser): Promise<BaseUser> {
    const existingUser = await this.baseUserService.findOne({ email: user.email })
    if (existingUser) {
      return existingUser
    }
    const newUser = await this.baseUserService.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      // TODO save picture
      avatar: user.picture,
    })
    return newUser
  }
}
