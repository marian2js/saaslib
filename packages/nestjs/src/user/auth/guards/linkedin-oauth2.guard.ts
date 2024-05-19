import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class LinkedInOauth2Guard extends AuthGuard('linkedin') {}
