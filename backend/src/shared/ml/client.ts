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

class MlClient {
  async evaluate(req: SafetyEvaluateRequest): Promise<SafetyEvaluateResponse | null> {
    const ctrl = AbortSignal.timeout(env.ML_API_TIMEOUT_MS);
    try {
      const res = await fetch(`${env.ML_API_URL}/safety/evaluate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl,
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, 'ML evaluate non-ok');
        return null;
      }
      return (await res.json()) as SafetyEvaluateResponse;
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'ML evaluate failed; falling back');
      return null;
    }
  }
}

export const mlClient = new MlClient();