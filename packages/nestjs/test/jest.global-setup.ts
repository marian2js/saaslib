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
// }
