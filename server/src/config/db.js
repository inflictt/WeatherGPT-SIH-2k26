import mongoose from 'mongoose'
import { env } from './env.js'
import { log } from '../utils/logger.js'

export async function connectDb() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 })
  log.info('mongo connected', { db: mongoose.connection.name })
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
