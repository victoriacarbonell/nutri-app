import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Salted scrypt hash, generated in artifacts/api-server/src/lib/auth.ts.
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Login sessions. The id is the SHA-256 hash of the token in the cookie, so a
// leak of the table doesn't let anyone use the sessions.
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

// One row per AI call, to enforce the daily usage limit per user.
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
