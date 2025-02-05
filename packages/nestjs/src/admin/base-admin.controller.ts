import { UseGuards } from '@nestjs/common'
import { AdminRoleGuard } from './guards/admin-role.guard'

@UseGuards(AdminRoleGuard)
export class BaseAdminController {
  constructor() {}
}
