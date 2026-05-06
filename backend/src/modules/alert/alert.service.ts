import { AppError } from '../../shared/http/errors.js';
import { wsHub } from '../../shared/ws/hub.js';
import { authRepo } from '../auth/auth.repo.js';
import { touristRepo } from '../tourist/tourist.repo.js';
import { policeRepo } from '../police/police.repo.js';
import { alertRepo } from './alert.repo.js';
import { detectAnomalies } from './alert.geofence.js';
import type { Alert, NewAlert } from '../../shared/db/schema.js';
import type { LocationUpdateInput, SosInput, PreAlertInput } from './alert.schema.js';

type AlertView = {
  id: number;
  touristId: string;
  alertType: string;
  priority: string;
  status: string;
  message: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

function toView(a: Alert): AlertView {
  return {
    id: a.id,
    touristId: a.touristId,
    alertType: a.alertType,
    priority: a.priority,
    status: a.status,
    message: a.message,
    lat: a.latitude,
    lng: a.longitude,
    createdAt: a.createdAt.toISOString(),
  };
}

function broadcastAlert(view: AlertView): void {
  wsHub.toRoom('admin', { type: 'ALERT', payload: view });
  wsHub.toRoom(`tourist:${view.touristId}`, { type: 'ALERT', payload: view });
}

async function resolveNearestStation(lat?: number | null, lng?: number | null): Promise<string | null> {
  if (lat == null || lng == null) return null;
  const station = await policeRepo.findNearestActive(lat, lng);
  return station?.id ?? null;
}

async function createAlert(input: Omit<NewAlert, 'id' | 'createdAt' | 'updatedAt' | 'geom'>): Promise<Alert> {
  const nearestStationId = input.nearestStationId ?? (await resolveNearestStation(input.latitude, input.longitude));
  const alert = await alertRepo.create({ ...input, nearestStationId });
  broadcastAlert(toView(alert));
  return alert;
}

export const alertService = {
  async ingestLocation(touristId: string, input: LocationUpdateInput) {
    const tourist = await authRepo.findById(touristId);
    if (!tourist) throw new AppError('NOT_FOUND', 'Tourist not found');

    const anomalies = await detectAnomalies(tourist, input.lat, input.lng);

    await touristRepo.updateById(touristId, {
      currentLat: input.lat,
      currentLng: input.lng,
      speed: input.speed ?? null,
      heading: input.heading ?? null,
      locationAccuracy: input.accuracy ?? null,
      lastSeen: new Date(),
      safetyScore: anomalies.newSafetyScore,
      lastScoreUpdate: new Date(),
    });

    await alertRepo
      .appendLocationLog({
        touristId,
        latitude: input.lat,
        longitude: input.lng,
        speed: input.speed ?? null,
        heading: input.heading ?? null,
        accuracy: input.accuracy ?? null,
        safetyScoreAtTime: anomalies.newSafetyScore,
      })
      .catch(() => undefined);

    if (anomalies.newSafetyScore !== tourist.safetyScore) {
      wsHub.toRoom(`tourist:${touristId}`, {
        type: 'SCORE_UPDATE',
        payload: {
          touristId,
          safetyScore: anomalies.newSafetyScore,
          timestamp: new Date().toISOString(),
        },
      });
    }

    for (const z of anomalies.newlyEnteredZones) {
      await createAlert({
        touristId,
        alertType: 'RISK_ZONE',
        priority: z.riskLevel === 'CRITICAL' || z.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        message: `Entered risk zone '${z.name}' [${z.riskLevel}]`,
        latitude: input.lat,
        longitude: input.lng,
      });
    }

    if (anomalies.inactivityMinutes !== null) {
      await createAlert({
        touristId,
        alertType: 'INACTIVITY',
        priority: 'MEDIUM',
        status: 'OPEN',
        message: `No location update for ${anomalies.inactivityMinutes} minutes`,
        latitude: input.lat,
        longitude: input.lng,
      });
    }

    return { acknowledged: true, safetyScore: anomalies.newSafetyScore };
  },

  async createSos(touristId: string, input: SosInput) {
    const tourist = await authRepo.findById(touristId);
    if (!tourist) throw new AppError('NOT_FOUND', 'Tourist not found');

    const lat = input.lat ?? tourist.currentLat ?? null;
    const lng = input.lng ?? tourist.currentLng ?? null;

    const alert = await createAlert({
      touristId,
      alertType: 'SOS',
      priority: 'CRITICAL',
      status: 'OPEN',
      message: input.message ?? `TOURIST IN DANGER. Location: ${lat}, ${lng}`,
      media: input.media ?? null,
      latitude: lat,
      longitude: lng,
      escalationLevel: 3,
    });

    return { status: 'SOS Alert initiated. Emergency response notified.', alertId: alert.id };
  },

  async createPreAlert(touristId: string, input: PreAlertInput) {
    const tourist = await authRepo.findById(touristId);
    if (!tourist) throw new AppError('NOT_FOUND', 'Tourist not found');

    const lat = input.lat ?? tourist.currentLat ?? null;
    const lng = input.lng ?? tourist.currentLng ?? null;

    const alert = await createAlert({
      touristId,
      alertType: 'PRE_ALERT',
      priority: 'MEDIUM',
      status: 'PENDING',
      message: 'Silent pre-alert — tourist may need help',
      latitude: lat,
      longitude: lng,
      preAlertTriggered: true,
      escalationLevel: 1,
    });

    return { status: 'Pre-alert registered. Monitoring initiated.', alertId: alert.id };
  },

  async cancelAlert(alertId: number) {
    const alert = await alertRepo.findById(alertId);
    if (!alert) throw new AppError('NOT_FOUND', 'Alert not found');
    if (alert.status === 'RESOLVED' || alert.status === 'CANCELLED') return alert;

    const updated = await alertRepo.update(alertId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });
    if (updated) broadcastAlert(toView(updated));
    return updated;
  },

  async getStatus(alertId: number) {
    const alert = await alertRepo.findById(alertId);
    if (!alert) throw new AppError('NOT_FOUND', 'Alert not found');
    return {
      alertId: alert.id,
      status: alert.status,
      priority: alert.priority,
      escalationLevel: alert.escalationLevel,
      nearestStationId: alert.nearestStationId,
      resolvedBy: alert.resolvedBy,
      resolvedAt: alert.resolvedAt,
      createdAt: alert.createdAt,
    };
  },

  async listActive(page: number, limit: number) {
    const result = await alertRepo.listByStatus({
      statuses: ['OPEN', 'PENDING', 'ACKNOWLEDGED'],
      page,
      limit,
    });
    return {
      items: result.items.map(toView),
      page,
      limit,
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / limit)),
    };
  },

  async listAll(page: number, limit: number) {
    const result = await alertRepo.listAll({ page, limit });
    return {
      items: result.items.map(toView),
      page,
      limit,
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / limit)),
    };
  },

  async listForTourist(touristId: string) {
    const items = await alertRepo.listByTourist(touristId);
    return items.map(toView);
  },

  async updateStatus(alertId: number, newStatus: string, adminId: string) {
    const alert = await alertRepo.findById(alertId);
    if (!alert) throw new AppError('NOT_FOUND', 'Alert not found');

    const patch: Partial<NewAlert> = { status: newStatus };
    if (newStatus === 'RESOLVED' || newStatus === 'DISMISSED') {
      patch.resolvedBy = adminId;
      patch.resolvedAt = new Date();
      patch.responseTimeMs = Date.now() - alert.createdAt.getTime();
    }
    if (newStatus === 'CANCELLED') patch.cancelledAt = new Date();

    const updated = await alertRepo.update(alertId, patch);
    if (updated) broadcastAlert(toView(updated));
    return updated;
  },
};
