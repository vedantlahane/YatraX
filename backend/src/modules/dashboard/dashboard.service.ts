import { db } from '../../shared/db/client.js';
import { tourists, alerts, policeDepartments, riskZones, travelAdvisories } from '../../shared/db/schema.js';
import { eq, inArray, desc, and, gte, or, isNull, sql } from 'drizzle-orm';
import { AppError } from '../../shared/http/errors.js';
import type { Tourist, Alert, PoliceDepartment, RiskZone } from '../../shared/db/schema.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safetyStatus(score: number, hasActiveSos: boolean): 'sos' | 'warning' | 'safe' {
  if (hasActiveSos) return 'sos';
  if (score < 70) return 'warning';
  return 'safe';
}

function alertPriority(a: Alert): string {
  const t = a.alertType.toUpperCase();
  if (t === 'SOS') return 'critical';
  if (t === 'RISK_ZONE' || t === 'DEVIATION' || t === 'INACTIVITY') return 'high';
  return 'info';
}

function isActive(status: string) {
  return !['RESOLVED', 'DISMISSED', 'CANCELLED'].includes(status.toUpperCase());
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const dashboardService = {
  async adminDashboard() {
    const [allAlerts, allTourists, allPolice] = await Promise.all([
      db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(200),
      db.select().from(tourists),
      db.select().from(policeDepartments),
    ]);

    const touristMap = new Map(allTourists.map((t) => [t.id, t]));
    const alertsByTourist = new Map<string, Alert[]>();
    for (const a of allAlerts) {
      if (!a.touristId) continue;
      const bucket = alertsByTourist.get(a.touristId) ?? [];
      bucket.push(a);
      alertsByTourist.set(a.touristId, bucket);
    }

    const alertViews = allAlerts.slice(0, 50).map((a) => {
      const tourist = touristMap.get(a.touristId);
      return {
        id: a.id,
        touristId: a.touristId,
        touristName: tourist?.name ?? 'Unknown',
        alertType: a.alertType,
        priority: alertPriority(a),
        status: a.status,
        description: a.message ?? a.alertType,
        lat: a.latitude,
        lng: a.longitude,
        timestamp: a.createdAt.toISOString(),
      };
    });

    const activeAlertViews = alertViews.filter((a) => isActive(a.status));
    const criticalCount = activeAlertViews.filter((a) => a.priority === 'critical').length;

    const resolvedWithTime = allAlerts.filter(
      (a) => !isActive(a.status) && a.responseTimeMs != null,
    );
    const avgResponseMs =
      resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((s, a) => s + (a.responseTimeMs ?? 0), 0) / resolvedWithTime.length
        : 0;

    const touristSummaries = allTourists.map((t) => {
      const touristAlerts = alertsByTourist.get(t.id) ?? [];
      const hasSos = touristAlerts.some((a) => a.alertType === 'SOS' && isActive(a.status));
      return {
        id: t.id,
        name: t.name,
        status: safetyStatus(t.safetyScore, hasSos),
        safetyScore: t.safetyScore,
        lastPing: t.lastSeen?.toISOString() ?? null,
        lat: t.currentLat,
        lng: t.currentLng,
        lastKnownArea:
          t.currentLat != null && t.currentLng != null
            ? `${t.currentLat.toFixed(4)}, ${t.currentLng.toFixed(4)}`
            : 'Unknown',
      };
    });

    const responseUnits = allPolice.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.isActive ? 'available' : 'offline',
      type: d.stationType,
      city: d.city,
      district: d.district,
      state: d.state,
      lat: d.latitude,
      lng: d.longitude,
      etaMinutes: d.isActive ? 6 : 15,
      contactNumber: d.contactNumber,
    }));

    return {
      stats: {
        criticalAlerts: criticalCount,
        activeAlerts: activeAlertViews.length,
        totalTourists: allTourists.length,
        activeTouristCount: allTourists.filter((t) => t.isActive).length,
        monitoredTourists: touristSummaries.filter((s) => s.status !== 'safe').length,
        avgResponseTimeMs: Math.round(avgResponseMs),
      },
      alerts: alertViews,
      tourists: touristSummaries,
      responseUnits,
    };
  },

  async touristDashboard(touristId: string) {
    const [tourist] = await db.select().from(tourists).where(eq(tourists.id, touristId));
    if (!tourist) throw new AppError('NOT_FOUND', 'Tourist not found');

    const now = new Date();
    const [touristAlerts, activeZones, activeAdvisories] = await Promise.all([
      db.select().from(alerts).where(eq(alerts.touristId, touristId)).orderBy(desc(alerts.createdAt)).limit(50),
      db.select().from(riskZones).where(eq(riskZones.active, true)),
      db
        .select()
        .from(travelAdvisories)
        .where(
          and(
            eq(travelAdvisories.active, true),
            or(isNull(travelAdvisories.expiresAt), gte(travelAdvisories.expiresAt, now)),
          ),
        )
        .orderBy(desc(travelAdvisories.createdAt))
        .limit(10),
    ]);

    const alertViews = touristAlerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      priority: alertPriority(a),
      status: a.status,
      message: a.message,
      timestamp: a.createdAt.toISOString(),
    }));

    const hasSos = touristAlerts.some((a) => a.alertType === 'SOS' && isActive(a.status));

    return {
      profile: {
        id: tourist.id,
        name: tourist.name,
        email: tourist.email,
        phone: tourist.phone,
        passportNumber: tourist.passportNumber,
        dateOfBirth: tourist.dateOfBirth,
        address: tourist.address,
        gender: tourist.gender,
        nationality: tourist.nationality,
        emergencyContact: tourist.emergencyContact,
        bloodType: tourist.bloodType,
        allergies: tourist.allergies,
        medicalConditions: tourist.medicalConditions,
        idHash: tourist.idHash,
        idExpiry: tourist.idExpiry?.toISOString() ?? null,
      },
      safetyScore: tourist.safetyScore,
      status: safetyStatus(tourist.safetyScore, hasSos),
      lastLocation: {
        lat: tourist.currentLat,
        lng: tourist.currentLng,
        lastSeen: tourist.lastSeen?.toISOString() ?? null,
      },
      openAlerts: alertViews.filter((a) => isActive(a.status)).length,
      alerts: alertViews,
      riskZones: activeZones.map((z) => ({
        id: z.id,
        name: z.name,
        description: z.description,
        centerLat: z.centerLat,
        centerLng: z.centerLng,
        radiusMeters: z.radiusMeters,
        riskLevel: z.riskLevel,
        active: z.active,
      })),
      advisories: activeAdvisories.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        affectedArea: a.affectedArea,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
};
