import { mongoTestServer } from './mongodb-memory-server-setup'

module.exports = async () => {
  process.env.GOOGLE_CLIENT_ID = 'test'
  process.env.GOOGLE_CLIENT_SECRET = 'test'
  process.env.LINKEDIN_CLIENT_ID = 'test'
  process.env.LINKEDIN_CLIENT_SECRET = 'test'
  process.env.JWT_SECRET = 'test'

  global.__MONGOD__ = mongoTestServer
  const uri = await mongoTestServer.start()
  global.__MONGO_URI__ = uri
}

// import { MongoMemoryServer } from 'mongodb-memory-server'

// module.exports = async () => {
//   // Create an instance of MongoMemoryServer
//   const mongoServer = new MongoMemoryServer()

//   // Start the server
//   await mongoServer.start()

//   // Store URI globally to be used in tests
//   global.__MONGO_URI__ = mongoServer.getUri()

//   // Optionally, you can also store the server instance if needed later
//   global.__MONGO_SERVER_INSTANCE__ = mongoServer
// }
