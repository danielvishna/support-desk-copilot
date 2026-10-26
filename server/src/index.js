/**
 * @fileoverview Express entry point for the Support Desk Copilot API. Wires
 * up middleware and mounts feature routers; route logic itself lives under
 * src/routes, AI calls under src/ai, and input validation under
 * src/validation (see CLAUDE.md for the architecture rule this follows).
 */

import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import draftReplyRouter from './routes/draftReply.js'
import triageRouter from './routes/triage.js'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/triage', triageRouter)
app.use('/api/draft-reply', draftReplyRouter)

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
