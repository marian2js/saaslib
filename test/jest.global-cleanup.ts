import { MongoMemoryServerSetup } from './mongodb-memory-server-setup'

afterEach(async () => {
  const instance = global.__MONGOD__ as MongoMemoryServerSetup
  if (instance) {
    await instance.clearDatabase()
  }
})
