/**
 * Cron jobs — started once after server boot.
 *
 * 1. Score recompute (every 5 min): recalculates safety scores for all
 *    active tourists based on risk zone proximity + inactivity penalty,
 *    then pushes SCORE_UPDATE via WebSocket.
 *
 * 2. Expired zone cleanup (every 15 min): marks overdue risk zones inactive
 *    and broadcasts ZONE_UPDATE to the admin room.
 */

import cron from 'node-cron';
import { eq, and, lt, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tourists, riskZones } from '../db/schema.js';
import { wsHub } from '../ws/hub.js';
import { logger } from '../logger/index.js';

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── 1. Score Recompute ───────────────────────────────────────────────────────

async function runScoreRecompute() {
  try {
    const [allTourists, activeZones] = await Promise.all([
      db.select().from(tourists).where(eq(tourists.isActive, true)),
      db.select().from(riskZones).where(eq(riskZones.active, true)),
    ]);

    if (allTourists.length === 0) return;

    const now = Date.now();

    for (const tourist of allTourists) {
      if (tourist.currentLat == null || tourist.currentLng == null) continue;

      let score = 100;

      // Zone penalty
      for (const zone of activeZones) {
        if (zone.centerLat == null || zone.centerLng == null || zone.radiusMeters == null) continue;
        const dist = haversineMetres(tourist.currentLat, tourist.currentLng, zone.centerLat, zone.centerLng);
        if (dist <= zone.radiusMeters) {
          const penalty =
            zone.riskLevel === 'CRITICAL' ? 25
            : zone.riskLevel === 'HIGH' ? 18
            : zone.riskLevel === 'MEDIUM' ? 10
            : 5;
          score -= penalty;
        }
      }

      // Inactivity penalty
      if (tourist.lastSeen) {
        const minsAgo = (now - tourist.lastSeen.getTime()) / 60_000;
        if (minsAgo > 60) score -= 15;
        else if (minsAgo > 30) score -= 5;
      }

      score = Math.max(0, Math.min(100, score));

      if (score !== tourist.safetyScore) {
        await db
          .update(tourists)
          .set({ safetyScore: score, lastScoreUpdate: new Date() })
          .where(eq(tourists.id, tourist.id));

        wsHub.toRoom(`tourist:${tourist.id}`, {
          type: 'SCORE_UPDATE',
          payload: { touristId: tourist.id, safetyScore: score, timestamp: new Date().toISOString() },
        });
      }
    }
  } catch (err) {
    logger.error({ err }, 'score recompute cron failed');
  }
}

// ─── 2. Expired Zone Cleanup ──────────────────────────────────────────────────

async function runExpiredZoneCleanup() {
  try {
    const now = new Date();
    const expired = await db
      .select({ id: riskZones.id })
      .from(riskZones)
      .where(and(eq(riskZones.active, true), isNotNull(riskZones.expiresAt), lt(riskZones.expiresAt, now)));

    if (expired.length === 0) return;

    const ids = expired.map((r) => r.id);
    await db.update(riskZones).set({ active: false }).where(inArray(riskZones.id, ids));

    logger.info({ count: ids.length }, 'expired risk zones deactivated');

    wsHub.toRoom('admin', {
      type: 'ZONE_UPDATE',
      payload: { event: 'zones_expired', count: ids.length },
    });
  } catch (err) {
    logger.error({ err }, 'expired zone cleanup cron failed');
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

export function startCronJobs() {
  cron.schedule('*/5 * * * *', runScoreRecompute);
  cron.schedule('*/15 * * * *', runExpiredZoneCleanup);
  logger.info('cron jobs started: score-recompute(5m), zone-cleanup(15m)');
}
