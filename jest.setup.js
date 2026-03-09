// Load environment variables FIRST, before any other imports
const { config } = require('dotenv')
// Load test environment variables
config({ path: '.env.test' })

// Set DATABASE_URL for tests
process.env.DATABASE_URL = 'file:./test.db'

require('@testing-library/jest-dom')
