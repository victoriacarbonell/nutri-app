import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaultUser } from "./lib/users";

// 8080 por defecto para desarrollo local; en producción lo fija el hosting.
const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  // Las migraciones (pnpm db:migrate) crean las tablas; aquí solo nos
  // aseguramos de que existe el usuario al que pertenecen los datos.
  await ensureDefaultUser();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
