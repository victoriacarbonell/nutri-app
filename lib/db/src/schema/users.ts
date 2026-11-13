import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Hash scrypt con sal, generado en artifacts/api-server/src/lib/auth.ts.
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sesiones de login. El id es el hash SHA-256 del token que va en la cookie,
// así una fuga de la tabla no permite usar las sesiones.
export const sessionsTable = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

// Una fila por llamada a la IA, para limitar el uso diario por usuario.
export const aiRequestsTable = pgTable(
  "ai_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // analyze_image, weekly_summary, monthly_summary
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_requests_user_created_idx").on(t.userId, t.createdAt)],
);

export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
