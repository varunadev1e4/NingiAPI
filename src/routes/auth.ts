import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, username } = req.body

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password and username are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
    return res.status(400).json({ error: 'Username: 3–20 chars, letters/numbers/underscores only' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email.toLowerCase(), username.toLowerCase(), passwordHash]
    )
    const user = rows[0]
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    )
    return res.status(201).json({ token, user })
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.detail?.includes('email') ? 'Email' : 'Username'
      return res.status(409).json({ error: `${field} already taken` })
    }
    console.error('Signup error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/signin
router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const { rows } = await db.query(
      'SELECT id, email, username, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const { password_hash: _ph, ...safeUser } = user
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    )
    return res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Signin error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
      [req.userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    return res.json({ user: rows[0] })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
