# SolarStock Warehouse (TypeScript / Next.js)

Primary app is **`web/`**. Flask prototype is in `/legacy` (optional / reference only).

## Database — fast temporary SQLite in `web/`

We are **not** using the old Flask `solar_inventory.db`, and **not** setting up a permanent cloud DB yet.

`web/` uses its own **local SQLite** file (`prisma/dev.db`):

- Fast page loads (no remote DB round-trips)
- Temporary / disposable — recreate anytime
- Vercel demo copies that file into `/tmp` at runtime (also temporary)

```bash
cd web
cp .env.example .env
npm install
npm run db:setup    # create web SQLite + seed
npm run dev         # http://localhost:3000
```

Do **not** point `DATABASE_URL` at `../solar_inventory.db` or the Flask DB.

### Demo accounts

| User | Password | Role |
|------|----------|------|
| admin | admin123 | admin |
| manager1 | manager123 | manager |
| operator1 | operator123 | operator |

## Vercel

- Root Directory: `web`
- Env: `AUTH_SECRET`, `COMPANY_NAME`, `COMPANY_ADDRESS`  
  (`DATABASE_URL` is set at build time to the seeded SQLite file)
- Permanent Neon/Postgres can wait until you are ready

## Layout

```
web/       Next.js app + its own SQLite (primary)
legacy/    Old Flask app (reference)
```
