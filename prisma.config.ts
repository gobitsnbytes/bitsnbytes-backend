// Prisma configuration for Supabase
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables from .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "",
  },
});
