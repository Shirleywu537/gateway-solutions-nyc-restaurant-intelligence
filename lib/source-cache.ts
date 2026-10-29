import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { sourceCache } from '@/db/schema';

// A read-through cache only. Clients cannot choose upstream URLs or submit data.
// Writes are performed internally from validated, fixed public data sources.
export async function readSource<T>(key: string, fetchSource: () => Promise<T>, maxAge = 60 * 60 * 1000) {
  const db = getDb();
  const [saved] = await db.select().from(sourceCache).where(eq(sourceCache.key, key)).limit(1);
  const now = new Date();
  const fresh = saved && now.getTime() - Date.parse(saved.fetchedAt) < maxAge;
  const retryPaused = saved?.error && now.getTime() - Date.parse(saved.lastAttemptAt) < 5 * 60 * 1000;
  if (fresh || retryPaused) return { data: JSON.parse(saved.payload) as T, fetchedAt: saved.fetchedAt, stale: !!saved.error, error: saved.error, lastAttemptAt: saved.lastAttemptAt };
  try {
    const data = await fetchSource();
    const fetchedAt = new Date().toISOString();
    await db.insert(sourceCache).values({key, payload: JSON.stringify(data), fetchedAt, lastAttemptAt: fetchedAt, error: null}).onConflictDoUpdate({target: sourceCache.key, set: {payload: JSON.stringify(data), fetchedAt, lastAttemptAt: fetchedAt, error: null}});
    return { data, fetchedAt, stale: false, error: null, lastAttemptAt: fetchedAt };
  } catch {
    if (!saved) throw new Error('The official source is temporarily unavailable. Please try again shortly.');
    const error = 'The latest source check failed. Showing the last successful snapshot.';
    await db.update(sourceCache).set({lastAttemptAt: now.toISOString(), error}).where(eq(sourceCache.key, key));
    return {data: JSON.parse(saved.payload) as T, fetchedAt: saved.fetchedAt, stale: true, error, lastAttemptAt: now.toISOString()};
  }
}
