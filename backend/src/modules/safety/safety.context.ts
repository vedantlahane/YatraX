import { sql } from 'drizzle-orm';
import { riskZoneRepo } from '../risk-zone/risk-zone.repo.js';
import { policeRepo } from '../police/police.repo.js';
import { hospitalRepo } from '../hospital/hospital.repo.js';
import { alertRepo } from '../alert/alert.repo.js';
import { estimateDriveSeconds } from './safety.phase1.js';
import type { RiskZoneLevel } from './safety.phase1.js';

const ZONE_RADIUS_KM = 2;
const ALERT_RADIUS_KM = 3;

export interface SafetyContext {
  inRiskZone: boolean;
  riskZoneLevel: RiskZoneLevel | null;
  activeAlertsNearby: number;
  historicalIncidents30d: number;
  policeETASeconds: number;
  hospitalETASeconds: number;
}

async function nearestHospitalDistance(lat: number, lng: number): Promise<number | null> {
  const nearest = await hospitalRepo.findNearestActive(lat, lng).catch(() => undefined);
  return nearest ? nearest.distanceMeters : null;
}

const LEVEL_ORDER: Record<RiskZoneLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export async function gatherContext(lat: number, lng: number): Promise<SafetyContext> {
  const [zonesNearby, nearestPolice, hospitalDist, activeAlerts] = await Promise.all([
    riskZoneRepo.nearby({ lat, lng, radiusKm: ZONE_RADIUS_KM }).catch(() => []),
    policeRepo.findNearestActive(lat, lng).catch(() => undefined),
    nearestHospitalDistance(lat, lng).catch(() => null),
    alertRepo.listActiveNear(lat, lng, ALERT_RADIUS_KM * 1000).catch(() => []),
  ]);

  let worstZone: RiskZoneLevel | null = null;
  for (const z of zonesNearby) {
    const lvl = z.riskLevel as RiskZoneLevel;
    if (!worstZone || LEVEL_ORDER[lvl] > LEVEL_ORDER[worstZone]) worstZone = lvl;
  }

  return {
    inRiskZone: zonesNearby.length > 0,
    riskZoneLevel: worstZone,
    activeAlertsNearby: activeAlerts.length,
    historicalIncidents30d: 0,
    policeETASeconds: nearestPolice ? estimateDriveSeconds(nearestPolice.distanceMeters) : 30 * 60,
    hospitalETASeconds: hospitalDist != null ? estimateDriveSeconds(hospitalDist) : 60 * 60,
  };
}
