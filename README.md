# SolarStock Warehouse (TypeScript / Next.js)

Primary app is **`web/`**. Flask prototype is in `/legacy` (optional / reference only).

## Database

| Mode | Backend | When |
|------|---------|------|
| **Hosted (now)** | Supabase Postgres | Vercel + cloud demo |
| **Offline buyoff** | Local Postgres (`web/docker-compose.yml`) | Client PC after buyoff |

Same Prisma schema for both — only `DATABASE_URL` changes. See `web/docs/OFFLINE_MIGRATION.md`.

```bash
cd web
cp .env.example .env   # paste Supabase URI into DATABASE_URL
npm install
npx prisma db push     # use Direct connection (port 5432), not pooler
npm run db:seed
npm run dev            # http://localhost:3000
```

### Demo accounts

| User | Password | Role |
|------|----------|------|
| admin | admin123 | admin |
| manager1 | manager123 | manager |
| operator1 | operator123 | operator |

## Vercel

- Root Directory: `web`
- Env: `DATABASE_URL` (Supabase **Transaction** pooler URI + `?pgbouncer=true`), `AUTH_SECRET`, `COMPANY_NAME`, `COMPANY_ADDRESS`

## Layout

- `web/` — Next.js production app
- `legacy/` — original Flask app (reference)
