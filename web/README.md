# SolarStock Web — hosted (Supabase) + offline buyoff (local Postgres)

## Stack
- Next.js 15 + Auth.js + Prisma
- **Now (hosted):** Supabase Postgres via `DATABASE_URL`
- **Later (offline buyoff):** same app + same schema on local Postgres (`docker compose`)

## Environment

Copy `.env.example` → `.env`:

```bash
# Supabase: Project Settings → Database → Connection string (URI)
# Use the "Transaction" pooler (port 6543) on Vercel; direct (5432) for migrations/seed.
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

AUTH_SECRET="generate-a-long-random-string"
AUTH_TRUST_HOST=true
COMPANY_NAME="SolarStock Warehouse"
COMPANY_ADDRESS="Your warehouse address"
```

For one-time schema push / seed against Supabase, prefer the **direct** connection (port `5432`) so Prisma migrations work with pgbouncer disabled.

## Setup (hosted / local against Supabase)

```bash
cd web
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Demo logins after seed:
- `admin` / `admin123`
- `manager1` / `manager123`
- `operator1` / `operator123`

## Offline buyoff (client PC)

Same codebase — only `DATABASE_URL` changes:

```bash
cd web
docker compose up -d
cp .env.offline.example .env   # points at localhost:5432
npm install
npm run db:setup               # push schema + seed
npm run build && npm start     # or npm run dev
```

### Cutover checklist (Supabase → local PC)
1. Export data from Supabase (optional): `npx prisma db pull` is schema-only; use `pg_dump` for rows.
2. On the PC: start Docker Postgres, set `.env` to local URL.
3. `npx prisma db push` then restore dump, **or** `npm run db:setup` for a fresh demo DB.
4. Point the app at local URL; no cloud dependency after that.

## Vercel
Root directory: `web`. `DATABASE_URL` must be the Supabase connection string (pooler recommended for serverless).
