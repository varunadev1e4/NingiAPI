import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  username?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers['authorization']
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string
      username: string
    }
    req.userId = payload.userId
    req.username = payload.username
    next()
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' })
  }
}
