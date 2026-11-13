import { defineConfig } from "drizzle-kit";
import path from "path";

// drizzle-kit no carga el .env por sí solo: leemos el de la raíz si existe.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {
  // Sin .env: se usan las variables del entorno (p. ej. en el hosting).
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida. Copia .env.example a .env en la raíz.");
}

export default defineConfig({
  // Rutas relativas al paquete: drizzle-kit las trata como glob y en Windows
  // las barras invertidas de path.join rompen la búsqueda.
  schema: "./src/schema/index.ts",
  // Las migraciones SQL se versionan en git: `pnpm db:generate` las crea a
  // partir del esquema y `pnpm db:migrate` las aplica.
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
