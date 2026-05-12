# Ningi — Full Setup Guide
**Server (Express + Socket.io on Render) + Extension (Chrome, no Supabase)**

---

## PART 1 — Deploy the Server on Render

### Step 1: Create a GitHub repo for the server

```bash
cd ningi-server
git init
git add .
git commit -m "initial"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ningi-server.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to **https://render.com** → sign up / sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub account and select the `ningi-server` repo
4. Fill in the settings:
   - **Name:** `ningi-server`
   - **Region:** Singapore (closest to India)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **Advanced** → **Add Environment Variable**:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (click "Generate" or type any long random string, min 32 chars)
6. Click **Create Web Service**

### Step 3: Add a PostgreSQL Database on Render

1. Click **New +** → **PostgreSQL**
2. Fill in:
   - **Name:** `ningi-db`
   - **Database:** `ningi`
   - **User:** `ningi`
   - **Plan:** Free
3. Click **Create Database**
4. Once created, go to your `ningi-server` web service → **Environment**
5. Add environment variable:
   - `DATABASE_URL` = (copy **Internal Database URL** from your Postgres dashboard)
6. Click **Save Changes** → your service will redeploy

> The server auto-creates all tables on first boot. No manual SQL needed.

### Step 4: Verify it works

Visit: `https://ningi-server.onrender.com/health`
You should see: `{"ok":true,"ts":"..."}`

> **Note:** Free Render services sleep after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) to avoid this.

---

## PART 2 — Build and Load the Extension

### Step 1: Configure the API URL

In the `ningi-ext/` folder, create a file called `.env`:
```
VITE_API_URL=https://ningi-server.onrender.com
```
Replace with your actual Render URL (shown on the service dashboard).

For local development (if running server locally):
```
VITE_API_URL=http://localhost:3000
```

### Step 2: Install and Build

```bash
cd ningi-ext
npm install
npm run build
```

This creates a `dist/` folder — your loadable extension.

### Step 3: Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder inside `ningi-ext/`
4. The Ningi extension appears. Pin it to your toolbar.

### Step 4: Open the side panel

Click the Ningi icon → side panel opens on the right side of Chrome.

---

## PART 3 — Share with Your Friend

Send your friend:
- The `ningi-ext/` folder (zip it, without `node_modules/`)
- Tell them the `VITE_API_URL` (your Render URL)

They do:
```bash
cd ningi-ext
# Create .env with your Render URL
npm install
npm run build
# Load dist/ in chrome://extensions
```

Both of you are now hitting the same server and database.

---

## PART 4 — Testing Together

1. Both open the extension and **sign up** (different emails + usernames)
2. Both navigate to the **same URL** in your browsers
   - Example: both open `https://news.ycombinator.com`
3. Select that URL from the extension dropdown
4. Type a message — it appears on the other person's screen in ~100ms

**Test DMs:**
- In global chat, click the other person's avatar/username
- DM view opens — messages are real-time

---

## Local Development

**Run server locally:**
```bash
cd ningi-server
cp .env.example .env
# Edit .env: set DATABASE_URL to your local Postgres or Render external URL
# Set JWT_SECRET to any random string
npm install
npm run dev
```

**Build extension with local server:**
```bash
cd ningi-ext
# .env: VITE_API_URL=http://localhost:3000
npm run dev   # rebuilds on file save
# After each save: go to chrome://extensions and click refresh on Ningi
```

---

## Troubleshooting

**Build error: `TypeError: crx is not a function`**
→ This version uses pure Vite without CRXJS. If you have an old `node_modules/`, delete it and re-run `npm install`.

**"Request failed" on sign in/up**
→ Check your `.env` has the correct `VITE_API_URL`. Visit `YOUR_URL/health` in browser.

**Server sleeping on Render (30s delay)**
→ Free tier sleeps. Either upgrade to Starter plan or use a cron job to ping `/health` every 10 min.

**Messages not appearing in real-time**
→ Both users must select the same URL in the dropdown. The URL must normalize identically.

**Extension doesn't open side panel**
→ Must be on a real webpage (not `chrome://` pages). Click the Ningi icon in toolbar.

---

## Architecture

```
Chrome Extension (ningi-ext)
  ├── Vite + React + Tailwind
  ├── REST API calls  → POST /auth/signup, /signin, GET /messages
  ├── Socket.io       → real-time messages + DMs
  └── chrome.storage  → saves JWT token between sessions

Express Server (ningi-server) on Render
  ├── POST /auth/signup  — bcrypt hash, JWT
  ├── POST /auth/signin  — verify password, JWT
  ├── GET  /auth/me      — validate token
  ├── GET  /messages     — fetch history for URL
  ├── GET  /messages/dm/:id — fetch DM history
  └── Socket.io
        ├── join_room    — user joins URL-keyed room
        ├── send_message — save to DB, broadcast to room
        └── send_dm      — save to DB, emit to receiver's socket

PostgreSQL on Render
  ├── users       (id, username, email, password_hash)
  ├── messages    (id, user_id, url, content, created_at)
  └── dm_messages (id, sender_id, receiver_id, content, created_at)
```
