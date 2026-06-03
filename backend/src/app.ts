import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/error-handler'
import { registerRoutes } from './routes'

const app = express()

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
// Raised limit so CSV import payloads (file content sent as JSON) are not rejected
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Register all routes
registerRoutes(app)

// Error handling middleware (must be last)
app.use(errorHandler)

export default app
