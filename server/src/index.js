import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import triageRouter from './routes/triage.js'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/triage', triageRouter)

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
