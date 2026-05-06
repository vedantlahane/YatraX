import { riskZoneRepo } from '../risk-zone/risk-zone.repo.js';
import type { Tourist } from '../../shared/db/schema.js';

const INACTIVITY_THRESHOLD_MIN = 30;

export interface ZoneEntryEvent {
  zoneId: number;
  name: string;
  riskLevel: string;
  penalty: number;
}

export interface AnomalyResult {
  newlyEnteredZones: ZoneEntryEvent[];
  inactivityMinutes: number | null;
  newSafetyScore: number;
}

const touristActiveZones = new Map<string, Set<number>>();

function penaltyFor(level: string): number {
  switch (level) {
    case 'CRITICAL':
      return 25;
    case 'HIGH':
      return 18;
    case 'MEDIUM':
      return 10;
    case 'LOW':
      return 5;
    default:
      return 8;
  }
}

export async function detectAnomalies(
  tourist: Tourist,
  lat: number,
  lng: number,
): Promise<AnomalyResult> {
  let inactivityMinutes: number | null = null;
  if (tourist.lastSeen) {
    const minutes = (Date.now() - tourist.lastSeen.getTime()) / 60_000;
    if (minutes > INACTIVITY_THRESHOLD_MIN) inactivityMinutes = Math.floor(minutes);
  }

  const nearby = await riskZoneRepo.nearby({ lat, lng, radiusKm: 0.001 });
  const currentlyInside = new Set(nearby.map((z) => z.id));

  const previous = touristActiveZones.get(tourist.id) ?? new Set<number>();
  const newlyEntered: ZoneEntryEvent[] = [];

  for (const z of nearby) {
    if (!previous.has(z.id)) {
      newlyEntered.push({
        zoneId: z.id,
        name: z.name,
        riskLevel: z.riskLevel,
        penalty: penaltyFor(z.riskLevel),
      });
    }
  }

  if (currentlyInside.size > 0) touristActiveZones.set(tourist.id, currentlyInside);
  else touristActiveZones.delete(tourist.id);

  let score = tourist.safetyScore;
  for (const z of newlyEntered) score -= z.penalty;
  if (inactivityMinutes !== null) score -= inactivityMinutes > 60 ? 15 : 5;
  score = Math.max(0, Math.min(100, score));

  return { newlyEnteredZones: newlyEntered, inactivityMinutes, newSafetyScore: score };
}

export function clearTouristZoneState(touristId: string): void {
  touristActiveZones.delete(touristId);
}
