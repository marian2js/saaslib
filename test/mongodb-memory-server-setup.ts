import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

export class MongoMemoryServerSetup {
  private mongod?: MongoMemoryServer

  async start(): Promise<string> {
    this.mongod = await MongoMemoryServer.create()
    const uri = this.mongod.getUri()
    await mongoose.connect(uri)
    return uri
  }

  async stop(): Promise<void> {
    if (this.mongod) {
      await mongoose.disconnect()
      await this.mongod.stop()
    }
  }

  async clearDatabase(): Promise<void> {
    await mongoose.connection.dropDatabase()
  }
}

export const mongoTestServer = new MongoMemoryServerSetup()
