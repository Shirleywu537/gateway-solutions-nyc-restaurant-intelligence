import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const sourceCache = sqliteTable('source_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  lastAttemptAt: text('last_attempt_at').notNull(),
  error: text('error'),
});
