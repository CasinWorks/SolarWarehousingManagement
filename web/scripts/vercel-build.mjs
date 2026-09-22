#!/usr/bin/env node
/** Build web/ for Vercel using a fast temporary SQLite DB (not Flask .db, not Neon). */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {
  ...process.env,
  // Always use local SQLite for this temporary web build (ignore any leftover Postgres URL)
  DATABASE_URL: "file:./dev.db",
};

function run(cmd) {
  console.log(">", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env });
}

run("npx prisma generate");
run("npx prisma db push");
run("npx tsx prisma/seed.ts");

const src = path.join(root, "prisma", "dev.db");
const dest = path.join(root, "prisma", "deploy.db");
if (!fs.existsSync(src)) {
  console.error("Missing prisma/dev.db after seed");
  process.exit(1);
}
fs.copyFileSync(src, dest);
console.log("Copied prisma/dev.db → prisma/deploy.db");

run("npx next build");
