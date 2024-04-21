import { MongoMemoryServerSetup } from './mongodb-memory-server-setup'

afterEach(async () => {
  await (global.__MONGOD__ as MongoMemoryServerSetup).clearDatabase()
})
