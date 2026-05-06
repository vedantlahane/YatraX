import { redis } from '../../shared/cache/redis.js';
import { mlClient } from '../../shared/ml/client.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/logger/index.js';
import { gatherContext } from './safety.context.js';
import {
  calculatePhase1Score,
  computeMinutesToSunset,
  type NetworkType,
  type Phase1Factor,
  type Phase1Input,
} from './safety.phase1.js';
import type { SafetyCheckQuery } from './safety.schema.js';

const VALID_NETWORK = new Set<NetworkType>(['wifi', '4g', '3g', '2g', 'none']);

function mapTrend(trend: Phase1Factor['trend']): 'up' | 'down' | 'stable' {
  return trend === 'improving' ? 'up' : trend === 'declining' ? 'down' : 'stable';
}

function snapToCell(lat: number, lon: number): string {
  return `${lat.toFixed(2)}:${lon.toFixed(2)}`;
}

export const safetyService = {
  async check(input: SafetyCheckQuery) {
    const now = new Date();
    const currentHour = input.hour ?? now.getUTCHours();
    const networkType: NetworkType = VALID_NETWORK.has(input.networkType as NetworkType)
      ? (input.networkType as NetworkType)
      : '4g';
    const weatherSeverity = input.weatherSeverity ?? 0;
    const airQualityIndex = input.aqi ?? 50;

    const cacheKey = [
      'safety',
      snapToCell(input.lat, input.lon),
      currentHour,
      networkType,
      Math.round(weatherSeverity / 10),
      Math.round(airQualityIndex / 50),
    ].join(':');

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        return { ...JSON.parse(cached), cached: true };
      } catch {
        /* fall through */
      }
    }

    const ctx = await gatherContext(input.lat, input.lon);

    const phase1Input: Phase1Input = {
      currentHour,
      dayOfWeek: now.getUTCDay(),
      month: now.getUTCMonth() + 1,
      minutesToSunset: computeMinutesToSunset(input.lat, input.lon, now),

      nearbyPlaceCount: 10,
      safetyPlaceCount: 2,
      riskyPlaceCount: 1,
      openBusinessCount: 5,

      policeETASeconds: ctx.policeETASeconds,
      hospitalETASeconds: ctx.hospitalETASeconds,

      inRiskZone: ctx.inRiskZone,
      riskZoneLevel: ctx.riskZoneLevel,
      activeAlertsNearby: ctx.activeAlertsNearby,
      historicalIncidents30d: ctx.historicalIncidents30d,

      networkType,
      weatherSeverity,
      airQualityIndex,
    };
    const phase1 = calculatePhase1Score(phase1Input);

    let scoringSource: 'ml_v2' | 'phase1_fallback' = 'phase1_fallback';
    let overallScore = phase1.overall;
    let status = phase1.status;
    let cappedBy = phase1.cappedBy;
    let recommendation = phase1.recommendation;
    let modelVersion: string | null = null;
    let forecast: Array<{ horizonHours: number; safetyScore: number; status: string }> = [];
    let anomaly: { detected: boolean; severity?: string } | null = null;

    let factors = phase1.factors.map((f) => ({
      label: f.label,
      score: f.score,
      trend: mapTrend(f.trend),
      detail: f.detail,
    }));

    if (env.ML_API_URL) {
      const ml = await mlClient.evaluate({
        lat: input.lat,
        lon: input.lon,
        timestamp: now.toISOString(),
        deviceContext: {
          networkType,
          ...(input.batteryPct !== undefined ? { batteryPct: input.batteryPct } : {}),
        },
        liveSignals: {
          ...(input.weatherSeverity !== undefined ? { weatherSeverity: input.weatherSeverity } : {}),
          ...(input.aqi !== undefined ? { aqi: input.aqi } : {}),
          activeAlertsNearby: [],
          historicalIncidents30d: ctx.historicalIncidents30d,
        },
      });

      if (ml) {
        scoringSource = 'ml_v2';
        overallScore = Math.round(ml.safetyScore);
        status = ml.status;
        recommendation = ml.recommendation;
        modelVersion = ml.modelVersion;
        forecast = ml.forecast.map((f) => ({
          horizonHours: f.horizonHours,
          safetyScore: Math.round(f.safetyScore),
          status: f.status,
        }));
        anomaly = ml.anomaly;
        if (ml.factors.length > 0) {
          factors = ml.factors.map((f) => ({
            label: f.label,
            score: Math.round(f.score),
            trend: 'stable' as const,
            detail: f.detail,
          }));
        }
      } else {
        logger.debug('ML unavailable; using Phase 1 fallback');
      }
    }

    const dangerScore = Number(((100 - overallScore) / 100).toFixed(4));
    const riskLabel: 'Low Risk' | 'Caution' | 'High Danger' =
      status === 'safe' ? 'Low Risk' : status === 'caution' ? 'Caution' : 'High Danger';

    const result = {
      overallScore,
      dangerScore,
      status,
      riskLabel,
      cappedBy,
      recommendation,
      isNearAdminZone: ctx.inRiskZone,
      factors,
      forecast,
      anomaly,
      scoringSource,
      mlApiConfigured: Boolean(env.ML_API_URL),
      mlApiUsed: scoringSource === 'ml_v2',
      modelVersion,
    };

    await redis.setex(cacheKey, 60, JSON.stringify(result)).catch(() => undefined);

    return { ...result, cached: false };
  },
};
