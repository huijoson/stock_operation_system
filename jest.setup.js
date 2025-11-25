// Load environment variables FIRST, before any other imports
import { config } from 'dotenv'
// Load test environment variables
config({ path: '.env.test' })

// Set DATABASE_URL for tests
process.env.DATABASE_URL = 'file:./test.db'

import '@testing-library/jest-dom'
