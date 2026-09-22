import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Default to fast local SQLite; override with DATABASE_URL when needed
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
