//backend/src/shared/ml/client.ts

import { env } from '../config/env.js';
import { logger } from '../logger/index.js';

export interface SafetyEvaluateRequest {
  lat: number;
  lon: number;
  touristId?: string;
  timestamp: string;
  deviceContext: { networkType: string; batteryPct?: number };
  liveSignals: {
    weatherSeverity?: number;
    aqi?: number;
    activeAlertsNearby: Array<{ lat: number; lon: number; type: string; hoursSince: number }>;
    historicalIncidents30d: number;
  };
}

export interface SafetyEvaluateResponse {
  safetyScore: number;
  status: 'safe' | 'caution' | 'danger';
  recommendation: string;
  factors: Array<{ label: string; score: number; detail: string }>;
  forecast: Array<{ horizonHours: number; safetyScore: number; status: string }>;
  anomaly: { detected: boolean; severity?: string } | null;
  modelVersion: string;
}

type MlRaw = Record<string, unknown>;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
};

const toString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

function normalizeMlResponse(raw: unknown): SafetyEvaluateResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid ML response');
  }

  const obj = raw as MlRaw;
  const safetyScore = toNumber(obj.safetyScore ?? obj.safety_score);
  if (!Number.isFinite(safetyScore)) {
    throw new Error('ML response missing safety score');
  }

  const status = toString(obj.status) ?? 'safe';
  const recommendation = toString(obj.recommendation) ?? '';
  const modelVersion = toString(obj.modelVersion ?? obj.model_version) ?? 'unknown';

  const factors = Array.isArray(obj.factors)
    ? obj.factors
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const f = item as MlRaw;
          const label = toString(f.label) ?? 'Unknown';
          const score = toNumber(f.score);
          const detail = toString(f.detail) ?? '';
          return Number.isFinite(score) ? { label, score, detail } : null;
        })
        .filter((item): item is { label: string; score: number; detail: string } => Boolean(item))
    : [];

  const forecast = Array.isArray(obj.forecast)
    ? obj.forecast
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const f = item as MlRaw;
          const horizonHours = toNumber(f.horizonHours ?? f.horizon_hours);
          const safety = toNumber(f.safetyScore ?? f.safety_score);
          const fStatus = toString(f.status) ?? 'safe';
          if (!Number.isFinite(horizonHours) || !Number.isFinite(safety)) return null;
          return { horizonHours, safetyScore: safety, status: fStatus };
        })
        .filter((item): item is { horizonHours: number; safetyScore: number; status: string } => Boolean(item))
    : [];

  let anomaly: SafetyEvaluateResponse['anomaly'] = null;
  if (obj.anomaly && typeof obj.anomaly === 'object') {
    const a = obj.anomaly as MlRaw;
    const detected = Boolean(a.detected);
    const severity = toString(a.severity) ?? undefined;
    anomaly = { detected, ...(severity ? { severity } : {}) };
  }

  return {
    safetyScore,
    status: status as SafetyEvaluateResponse['status'],
    recommendation,
    factors,
    forecast,
    anomaly,
    modelVersion,
  };
}

class MlClient {
  async evaluate(req: SafetyEvaluateRequest): Promise<SafetyEvaluateResponse | null> {
    const ctrl = AbortSignal.timeout(env.ML_API_TIMEOUT_MS);
    try {
      const ts = new Date(req.timestamp);
      const safeTs = Number.isNaN(ts.getTime()) ? new Date() : ts;

      // The ML service expects a flat 'features' dictionary
      const mlReq = {
        features: {
          latitude: req.lat,
          longitude: req.lon,
          timestamp: req.timestamp,
          hour: safeTs.getUTCHours(),
          day_of_week: safeTs.getUTCDay(),
          month: safeTs.getUTCMonth() + 1,
          network_type: req.deviceContext.networkType,
          battery_pct: req.deviceContext.batteryPct,
          weather_severity: req.liveSignals.weatherSeverity,
          aqi: req.liveSignals.aqi,
          active_alerts_nearby: req.liveSignals.activeAlertsNearby?.length ?? 0,
          historical_incidents_30d: req.liveSignals.historicalIncidents30d,
        },
        forecast_hours: [1, 3, 6]
      };

      const res = await fetch(`${env.ML_API_URL}/safety/evaluate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mlReq),
        signal: ctrl,
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, 'ML evaluate non-ok');
        return null;
      }
      const raw = await res.json();
      return normalizeMlResponse(raw);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'ML evaluate failed; falling back');
      return null;
    }
  }
}

export const mlClient = new MlClient();