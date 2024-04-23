import { BaseUserService } from './base-user.service'

export abstract class BaseUserController {
  constructor(private baseUserService: BaseUserService) {}
}
