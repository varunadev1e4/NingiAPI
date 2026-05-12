import { Router, Response } from 'express'
import { db } from '../db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /messages?url=...
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const url = req.query['url'] as string | undefined
  if (!url) {
    return res.status(400).json({ error: 'url query param required' })
  }
  try {
    const { rows } = await db.query(
      `SELECT m.id, m.content, m.url, m.created_at,
              json_build_object('id', u.id, 'username', u.username) AS "user"
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.url = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [url]
    )
    return res.json({ messages: rows })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /messages/dm/:partnerId
router.get('/dm/:partnerId', requireAuth, async (req: AuthRequest, res: Response) => {
  const partnerId = req.params['partnerId'] as string
  try {
    const { rows } = await db.query(
      `SELECT dm.id, dm.content, dm.sender_id, dm.receiver_id, dm.created_at,
              json_build_object('id', u.id, 'username', u.username) AS sender
       FROM dm_messages dm
       JOIN users u ON u.id = dm.sender_id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at ASC
       LIMIT 50`,
      [req.userId, partnerId]
    )
    return res.json({ messages: rows })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
