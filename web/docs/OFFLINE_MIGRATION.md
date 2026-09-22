# Offline migration (Supabase → local PC)
#
# After buyoff, the client runs SolarStock on a PC with no cloud DB.
# Schema is identical (PostgreSQL); only DATABASE_URL changes.

## A. Fresh local install (demo / empty warehouse)
1. Install Docker Desktop + Node 20+.
2. cd web && docker compose up -d
3. cp .env.offline.example .env
4. npm install && npm run db:setup
5. npm run build && npm start
6. Open http://localhost:3000 — login admin / admin123

## B. Move live Supabase data to the PC
1. From a machine with Supabase access:
   pg_dump "$SUPABASE_DIRECT_URL" --no-owner --no-acl -F c -f solarstock.dump
2. On the PC:
   docker compose up -d
   pg_restore -d "postgresql://solarstock:solarstock@127.0.0.1:5433/solarstock" --no-owner --clean solarstock.dump
3. cp .env.offline.example .env
4. npm install && npx prisma generate && npm run build && npm start

## Notes
- Keep using PostgreSQL offline (not SQLite) so Prisma schema stays one file.
- Remove Vercel / Supabase env vars from the PC .env; local URL only.
- Optional: disable outbound network after cutover for a fully offline site.
