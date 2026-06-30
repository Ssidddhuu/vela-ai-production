# Vela AI

A full-stack AI chat application powered by Groq.

## Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express + TypeScript + Prisma
- **Database**: PostgreSQL (production) / SQLite (dev)
- **AI**: Groq (llama-3.3-70b-versatile)

## Local Development

### 1. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Setup server .env
```bash
cp server/.env.example server/.env
# Fill in your values
```

### 3. Run database migrations
```bash
cd server
npx prisma migrate dev
```

### 4. Start both servers
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2  
cd client && npm run dev
```

## Deployment

### Backend → Railway
1. Go to railway.app → New Project → Deploy from GitHub
2. Select this repo, set root directory to `server`
3. Add environment variables (see server/.env.example)
4. Railway auto-deploys on every push

### Frontend → Vercel
1. Go to vercel.com → New Project → Import from GitHub
2. Select this repo, set root directory to `client`
3. Add `VITE_API_URL=https://your-railway-url.up.railway.app`
4. Vercel auto-deploys on every push

### Domain (vela.ai)
1. In Vercel → Settings → Domains → Add `vela.ai`
2. Add the DNS records Vercel shows you to your domain registrar
