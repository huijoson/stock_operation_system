import path from 'path'
import dotenv from 'dotenv'

// Load root .env before any module reads process.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import app from './app'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
