"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
function setupSocket(io) {
    // Authenticate every socket connection with JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('No token provided'));
        try {
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.data.userId = payload.userId;
            socket.data.username = payload.username;
            next();
        }
        catch {
            next(new Error('Invalid or expired token'));
        }
    });
    io.on('connection', (socket) => {
        const { userId, username } = socket.data;
        console.log(`[socket] connected: ${username} (${socket.id})`);
        // Each user joins their personal room for receiving DMs
        socket.join(`user:${userId}`);
        // ── JOIN ROOM ──────────────────────────────────────────────
        // Client emits when they switch to a URL
        socket.on('join_room', ({ url }) => {
            // Leave all URL rooms (keep user: room)
            socket.rooms.forEach(room => {
                if (room !== socket.id && !room.startsWith('user:')) {
                    socket.leave(room);
                }
            });
            socket.join(`room:${url}`);
            console.log(`[socket] ${username} joined room:${url}`);
        });
        // ── SEND GLOBAL MESSAGE ────────────────────────────────────
        socket.on('send_message', async ({ url, content }) => {
            if (!url || !content?.trim())
                return;
            try {
                const { rows } = await db_1.db.query(`INSERT INTO messages (user_id, url, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, url, created_at`, [userId, url, content.trim()]);
                const msg = {
                    ...rows[0],
                    user: { id: userId, username },
                };
                // Broadcast to everyone in the room (including sender)
                io.to(`room:${url}`).emit('new_message', msg);
            }
            catch (err) {
                console.error('[socket] send_message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // ── SEND DM ────────────────────────────────────────────────
        socket.on('send_dm', async ({ receiverId, content }) => {
            if (!receiverId || !content?.trim())
                return;
            try {
                const { rows } = await db_1.db.query(`INSERT INTO dm_messages (sender_id, receiver_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, sender_id, receiver_id, content, created_at`, [userId, receiverId, content.trim()]);
                const msg = {
                    ...rows[0],
                    sender: { id: userId, username },
                };
                // Send to receiver's room
                io.to(`user:${receiverId}`).emit('new_dm', msg);
                // Echo back to sender so their UI updates
                socket.emit('new_dm', msg);
            }
            catch (err) {
                console.error('[socket] send_dm error:', err);
                socket.emit('error', { message: 'Failed to send DM' });
            }
        });
        socket.on('disconnect', () => {
            console.log(`[socket] disconnected: ${username}`);
        });
    });
}
