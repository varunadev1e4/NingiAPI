"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDB = initDB;
const pg_1 = require("pg");
exports.db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
});
exports.db.on('error', (err) => {
    console.error('[db] unexpected pool error:', err);
});
async function initDB() {
    let client;
    try {
        client = await exports.db.connect();
        console.log('[db] connected successfully');
    }
    catch (err) {
        console.error('[db] connection failed:', err);
        console.error('[db] DATABASE_URL was:', process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@'));
        throw err;
    }
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        url TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS messages_url_idx ON messages(url);
      CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

      CREATE TABLE IF NOT EXISTS dm_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS dm_sender_idx ON dm_messages(sender_id);
      CREATE INDEX IF NOT EXISTS dm_receiver_idx ON dm_messages(receiver_id);
    `);
        console.log('[db] schema ready');
    }
    catch (err) {
        console.error('[db] schema creation failed:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
