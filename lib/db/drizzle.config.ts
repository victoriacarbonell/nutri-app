import { defineConfig } from "drizzle-kit";
import path from "path";

// drizzle-kit doesn't load .env by itself: read the root one if it exists.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {
  // No .env: use the environment variables (e.g. on the host).
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env in the repo root.");
}

export default defineConfig({
  // Paths relative to the package: drizzle-kit treats them as globs, and on
  // Windows the backslashes from path.join break the lookup.
  schema: "./src/schema/index.ts",
  // SQL migrations are versioned in git: `pnpm db:generate` creates them from
  // the schema and `pnpm db:migrate` applies them.
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
