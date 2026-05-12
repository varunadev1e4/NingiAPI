import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { initDB } from './db'
import authRoutes from './routes/auth'
import messageRoutes from './routes/messages'
import { setupSocket } from './socket'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json())

// ── Routes ─────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))
app.use('/auth', authRoutes)
app.use('/messages', messageRoutes)

// ── Socket.io ──────────────────────────────────────────────────
setupSocket(io)

// ── Start ──────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000

async function start() {
  await initDB()
  httpServer.listen(PORT, () => {
    console.log(`✓ Ningi server running on port ${PORT}`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
