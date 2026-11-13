import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

// Mientras no hay autenticación (punto 4), todos los datos pertenecen a este
// usuario. El API ya filtra todo por user_id, así que añadir login será
// cambiar de dónde sale el id.
export const DEFAULT_USER_ID = 1;

export async function ensureDefaultUser(): Promise<void> {
  await db.insert(usersTable).values({ id: DEFAULT_USER_ID }).onConflictDoNothing();
  // Insertar con id explícito no avanza la secuencia; la alineamos para que
  // los usuarios que se creen después no choquen con el 1.
  await db.execute(sql`select setval('users_id_seq', greatest((select max(id) from users), 1))`);
}
