import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseUser } from 'src/user'
import { BaseEntityService } from '../base'
import { MessageLog } from './message-log.model'

@Injectable()
export class MessageLogService extends BaseEntityService<MessageLog> {
  constructor(
    @InjectModel(MessageLog.name)
    messageLogModel: Model<MessageLog>,
  ) {
    super(messageLogModel)
  }

  createMessageLog(user: BaseUser) {
    return this.create({ owner: user._id })
  }
}
