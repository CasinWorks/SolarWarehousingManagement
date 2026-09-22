# SolarStock Warehouse (TypeScript / Next.js)

On-premise-capable warehouse inventory app, rebuilt for **Vercel** with Next.js + TypeScript.

Flask prototype lives in `/legacy` for reference.

## Features

- Role-based login (`admin` / `manager` / `operator`)
- Dashboard, bay utilisation, low-stock alerts
- **Scan In / Scan Out** with phone camera barcode scanning + HID/USB fallback
- Immediate stock in/out grouped under `RCV-####` / `DR-####`
- Inventory monitor + movement log
- Catalog (components, bays, suppliers)
- Printable Delivery Receipt PDF
- Branding: SolarStock product · PFS + Powered by CasinWorks in footer

## Local run

```bash
cd web
cp .env.example .env   # if needed
npm install
npm run db:setup       # create SQLite DB + demo data
npm run dev            # http://localhost:3000
```

### Demo accounts

| User | Password | Role |
|------|----------|------|
| admin | admin123 | admin |
| manager1 | manager123 | manager |
| operator1 | operator123 | operator |

## Deploy on Vercel

SQLite does **not** persist on Vercel. Use Postgres:

1. Create a free DB on [Neon](https://neon.tech) (or Vercel Postgres / Supabase).
2. In `prisma/schema.prisma`, change:
   ```
   provider = "postgresql"
   ```
3. In Vercel project settings:
   - **Root Directory:** `web`
   - Env vars: `DATABASE_URL`, `AUTH_SECRET`, `COMPANY_NAME`, `COMPANY_ADDRESS`
4. Deploy. Then run seed once (local against prod URL, or Vercel CLI):
   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Security upgrades vs Flask prototype

- Auth.js JWT sessions + httpOnly cookies
- bcrypt password hashing
- Zod validation on scan mutations
- Role checks on server actions / admin routes
- Secrets via environment variables (no hardcoded production keys)

## Project layout

```
web/
  prisma/           # schema + seed
  src/app/          # App Router pages + API
  src/components/   # UI including ScanWorkstation
  src/lib/          # prisma, stock math, session helpers
legacy/             # original Flask app
```
