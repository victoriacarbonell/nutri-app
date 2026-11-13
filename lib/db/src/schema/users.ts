import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

// Por ahora solo identifica al dueño de los datos. La autenticación (punto 4)
// añadirá aquí el email y la contraseña.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
