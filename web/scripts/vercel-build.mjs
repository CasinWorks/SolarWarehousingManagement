#!/usr/bin/env node
/** Vercel build: generate Prisma client + Next.js (DB lives on Supabase / local Postgres). */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(">", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (Supabase Postgres connection string).");
  process.exit(1);
}

run("npx prisma generate");
run("npx next build");
