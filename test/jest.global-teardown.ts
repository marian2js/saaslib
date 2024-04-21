import { MongoMemoryServerSetup } from './mongodb-memory-server-setup'

module.exports = async () => {
  await (global.__MONGOD__ as MongoMemoryServerSetup).stop()
}
