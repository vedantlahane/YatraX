export type RiskZoneLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NetworkType = 'wifi' | '4g' | '3g' | '2g' | 'none';
export type SafetyStatus = 'safe' | 'caution' | 'danger';

export interface Phase1Input {
  currentHour: number;
  dayOfWeek: number;
  month: number;
  minutesToSunset: number;

  nearbyPlaceCount: number;
  safetyPlaceCount: number;
  riskyPlaceCount: number;
  openBusinessCount: number;

  policeETASeconds: number;
  hospitalETASeconds: number;

  inRiskZone: boolean;
  riskZoneLevel: RiskZoneLevel | null;
  activeAlertsNearby: number;
  historicalIncidents30d: number;

  networkType: NetworkType;
  weatherSeverity: number;
  airQualityIndex: number;
}

export interface Phase1Factor {
  id: string;
  label: string;
  score: number;
  weight: number;
  trend: 'improving' | 'declining' | 'stable';
  detail: string;
}

export interface Phase1Result {
  overall: number;
  status: SafetyStatus;
  factors: Phase1Factor[];
  cappedBy: string | null;
  recommendation: string;
}

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function computeMinutesToSunset(lat: number, lon: number, now: Date): number {
  const doy = dayOfYear(now);
  const declDeg = 23.45 * Math.sin((2 * Math.PI / 365) * (doy - 81));
  const declRad = (declDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const cosH = -Math.tan(latRad) * Math.tan(declRad);

  if (cosH < -1) return 24 * 60;
  if (cosH > 1) return -60;

  const sunsetHourAngleDeg = (Math.acos(cosH) * 180) / Math.PI;
  const sunsetSolarHour = 12 + sunsetHourAngleDeg / 15;

  const B = (2 * Math.PI / 365) * (doy - 81);
  const eotMinutes = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const lonOffsetHours = lon / 15;
  const sunsetUTCHour = sunsetSolarHour - lonOffsetHours - eotMinutes / 60;
  const nowUTCHour = now.getUTCHours() + now.getUTCMinutes() / 60;

  return Math.round((sunsetUTCHour - nowUTCHour) * 60);
}

export function estimateDriveSeconds(distanceMeters: number): number {
  const avgSpeedMs = (30 * 1000) / 3600;
  const routeFactor = 1.35;
  return Math.round((distanceMeters * routeFactor) / avgSpeedMs);
}

export function calculatePhase1Score(input: Phase1Input): Phase1Result {
  const factors: Phase1Factor[] = [];
  const h = input.currentHour;

  let timeScore: number;
  if (h >= 8 && h < 18) timeScore = 95;
  else if (h >= 18 && h < 20) timeScore = 75;
  else if (h >= 20 && h < 22) timeScore = 50;
  else if (h >= 22 || h < 2) timeScore = 25;
  else if (h >= 2 && h < 5) timeScore = 10;
  else timeScore = 60;

  factors.push({
    id: 'time_of_day',
    label: 'Time of Day',
    score: timeScore,
    weight: 0.1,
    trend: h >= 5 && h < 14 ? 'improving' : h >= 17 ? 'declining' : 'stable',
    detail:
      h >= 22 || h < 5
        ? 'Late night — elevated risk'
        : h >= 8 && h < 18
        ? 'Daytime — lowest risk period'
        : 'Transitional period',
  });

  const isWeekendNight = (input.dayOfWeek === 5 || input.dayOfWeek === 6) && (h >= 21 || h < 4);
  factors.push({
    id: 'day_of_week',
    label: 'Day Pattern',
    score: isWeekendNight ? 40 : 80,
    weight: 0.03,
    trend: 'stable',
    detail: isWeekendNight ? 'Weekend night — higher risk' : 'Normal day pattern',
  });

  const m = input.month;
  let seasonScore: number;
  let seasonDetail: string;
  if (m >= 6 && m <= 9) {
    seasonScore = 35;
    seasonDetail = 'Monsoon — flood/landslide risk';
  } else if (m >= 11 || m <= 2) {
    seasonScore = 65;
    seasonDetail = 'Winter — fog risk';
  } else if (m >= 3 && m <= 5) {
    seasonScore = 55;
    seasonDetail = 'Summer — heat/storm risk';
  } else {
    seasonScore = 80;
    seasonDetail = 'Post-monsoon — favourable';
  }

  factors.push({
    id: 'season',
    label: 'Season',
    score: seasonScore,
    weight: 0.05,
    trend: 'stable',
    detail: seasonDetail,
  });

  let daylightScore: number;
  if (input.minutesToSunset > 180) daylightScore = 95;
  else if (input.minutesToSunset > 60) daylightScore = 75;
  else if (input.minutesToSunset > 15) daylightScore = 45;
  else if (input.minutesToSunset > 0) daylightScore = 25;
  else daylightScore = 15;

  factors.push({
    id: 'daylight',
    label: 'Daylight',
    score: daylightScore,
    weight: 0.05,
    trend: input.minutesToSunset > 0 ? 'declining' : 'stable',
    detail:
      input.minutesToSunset > 0
        ? `${input.minutesToSunset} min of daylight remaining`
        : 'After sunset — limited natural visibility',
  });

  let zoneScore: number;
  if (!input.inRiskZone) zoneScore = 95;
  else
    switch (input.riskZoneLevel) {
      case 'CRITICAL':
        zoneScore = 5;
        break;
      case 'HIGH':
        zoneScore = 10;
        break;
      case 'MEDIUM':
        zoneScore = 40;
        break;
      case 'LOW':
        zoneScore = 65;
        break;
      default:
        zoneScore = 40;
    }

  factors.push({
    id: 'risk_zone',
    label: 'Risk Zone',
    score: zoneScore,
    weight: 0.12,
    trend: 'stable',
    detail: input.inRiskZone
      ? `Inside ${input.riskZoneLevel ?? 'unknown'} risk zone`
      : 'Outside designated risk zones',
  });

  const pMin = input.policeETASeconds / 60;
  const policeScore = pMin < 5 ? 95 : pMin < 10 ? 80 : pMin < 15 ? 60 : pMin < 30 ? 35 : 10;
  factors.push({
    id: 'police_eta',
    label: 'Police Response',
    score: policeScore,
    weight: 0.1,
    trend: 'stable',
    detail: `Nearest police: ${Math.round(pMin)} min drive`,
  });

  const hMin = input.hospitalETASeconds / 60;
  const hospitalScore = hMin < 10 ? 95 : hMin < 20 ? 75 : hMin < 40 ? 50 : hMin < 60 ? 25 : 5;
  factors.push({
    id: 'hospital_eta',
    label: 'Medical Access',
    score: hospitalScore,
    weight: 0.08,
    trend: 'stable',
    detail:
      hMin < 60
        ? `Nearest hospital: ${Math.round(hMin)} min`
        : `Nearest hospital: ${Math.round(hMin / 60)}+ hr`,
  });

  const pc = input.nearbyPlaceCount;
  const densityScore = pc > 20 ? 90 : pc > 10 ? 75 : pc > 5 ? 55 : pc > 2 ? 30 : 10;
  factors.push({
    id: 'area_density',
    label: 'Area Activity',
    score: densityScore,
    weight: 0.08,
    trend: 'stable',
    detail:
      pc > 10
        ? `${pc} establishments nearby`
        : pc > 2
        ? `${pc} places nearby`
        : `${pc} places — isolated`,
  });

  let typeScore = 50 + Math.min(input.safetyPlaceCount * 8, 30);
  if (h >= 21 || h < 5) typeScore -= input.riskyPlaceCount * 5;
  typeScore = clamp(typeScore, 0, 100);
  factors.push({
    id: 'area_types',
    label: 'Area Profile',
    score: typeScore,
    weight: 0.07,
    trend: 'stable',
    detail:
      input.safetyPlaceCount > 3
        ? `${input.safetyPlaceCount} safety services nearby`
        : 'Limited safety services',
  });

  const ob = input.openBusinessCount;
  const openScore = ob > 10 ? 90 : ob > 5 ? 70 : ob > 2 ? 45 : ob > 0 ? 20 : 5;
  factors.push({
    id: 'open_businesses',
    label: 'Active Services',
    score: openScore,
    weight: 0.05,
    trend: h >= 18 ? 'declining' : h >= 6 ? 'improving' : 'stable',
    detail: ob > 0 ? `${ob} businesses open` : 'No businesses open',
  });

  const ac = input.activeAlertsNearby;
  const alertScore = ac === 0 ? 95 : ac <= 2 ? 60 : ac <= 5 ? 30 : 10;
  factors.push({
    id: 'active_alerts',
    label: 'Active Alerts',
    score: alertScore,
    weight: 0.08,
    trend: 'stable',
    detail:
      ac === 0
        ? 'No active alerts nearby'
        : `${ac} active alert${ac > 1 ? 's' : ''} nearby`,
  });

  const hi = input.historicalIncidents30d;
  const historyScore = hi === 0 ? 95 : hi <= 2 ? 75 : hi <= 5 ? 50 : hi <= 10 ? 25 : 5;
  factors.push({
    id: 'history',
    label: 'Area History',
    score: historyScore,
    weight: 0.07,
    trend: 'stable',
    detail:
      hi === 0
        ? 'No incidents in last 30 days'
        : `${hi} incident${hi > 1 ? 's' : ''} in last 30 days`,
  });

  const networkScore =
    input.networkType === 'wifi'
      ? 95
      : input.networkType === '4g'
      ? 90
      : input.networkType === '3g'
      ? 65
      : input.networkType === '2g'
      ? 35
      : input.networkType === 'none'
      ? 5
      : 50;
  factors.push({
    id: 'connectivity',
    label: 'Connectivity',
    score: networkScore,
    weight: 0.04,
    trend: 'stable',
    detail:
      input.networkType === 'none'
        ? 'NO SIGNAL — cannot call for help'
        : `${input.networkType.toUpperCase()} available`,
  });

  const weatherScore = clamp(100 - input.weatherSeverity, 0, 100);
  factors.push({
    id: 'weather',
    label: 'Weather',
    score: weatherScore,
    weight: 0.05,
    trend: 'stable',
    detail:
      weatherScore > 70
        ? 'Favourable weather'
        : weatherScore > 40
        ? 'Moderate — caution'
        : 'Severe — shelter in place',
  });

  const aqi = input.airQualityIndex;
  const aqScore = aqi <= 50 ? 95 : aqi <= 100 ? 75 : aqi <= 150 ? 50 : aqi <= 200 ? 25 : 5;
  factors.push({
    id: 'air_quality',
    label: 'Air Quality',
    score: aqScore,
    weight: 0.03,
    trend: 'stable',
    detail:
      aqi <= 50
        ? `AQI ${aqi} — Good`
        : aqi <= 100
        ? `AQI ${aqi} — Moderate`
        : aqi <= 200
        ? `AQI ${aqi} — Unhealthy`
        : `AQI ${aqi} — Hazardous`,
  });

  let weightedSum = 0;
  let totalWeight = 0;
  for (const f of factors) {
    weightedSum += f.score * f.weight;
    totalWeight += f.weight;
  }
  let overall = Math.round(weightedSum / totalWeight);

  let cappedBy: string | null = null;
  if (input.inRiskZone && (input.riskZoneLevel === 'HIGH' || input.riskZoneLevel === 'CRITICAL')) {
    if (overall > 40) {
      overall = 40;
      cappedBy = 'High Risk Zone';
    }
  } else if (input.inRiskZone && input.riskZoneLevel === 'MEDIUM') {
    if (overall > 65) {
      overall = 65;
      cappedBy = 'Medium Risk Zone';
    }
  }
  if (input.activeAlertsNearby > 5 && overall > 30) {
    overall = 30;
    cappedBy = 'Multiple Active Alerts';
  }
  if (input.networkType === 'none' && overall > 50) {
    overall = 50;
    cappedBy = 'No Network Coverage';
  }

  const status: SafetyStatus = overall >= 80 ? 'safe' : overall >= 50 ? 'caution' : 'danger';

  const worst = [...factors].sort((a, b) => a.score - b.score)[0];
  let recommendation = 'Conditions are favourable — enjoy your visit!';
  if (status === 'danger') {
    if (input.networkType === 'none') recommendation = 'Move toward a populated area to regain phone signal.';
    else if (input.inRiskZone && (input.riskZoneLevel === 'HIGH' || input.riskZoneLevel === 'CRITICAL'))
      recommendation = 'Leave this high-risk area as soon as safely possible.';
    else if (worst?.id === 'time_of_day') recommendation = 'Find a well-lit, populated area or return to your accommodation.';
    else if (worst?.id === 'area_density') recommendation = 'This is an isolated area — move toward a populated location.';
    else recommendation = 'Exercise extreme caution and consider moving to a safer area.';
  } else if (status === 'caution') {
    if (worst?.id === 'daylight')
      recommendation = `${input.minutesToSunset > 0 ? input.minutesToSunset + ' min of daylight left' : 'After sunset'} — plan your return route.`;
    else if (worst?.id === 'weather') recommendation = 'Weather deteriorating — find shelter if needed.';
    else if (worst?.id === 'open_businesses') recommendation = 'Most services closing — note your nearest safe spots.';
    else if (worst?.id === 'active_alerts') recommendation = 'Active alerts nearby — stay vigilant.';
    else recommendation = 'Stay aware of your surroundings and keep emergency contacts ready.';
  }

  return { overall, status, factors, cappedBy, recommendation };
}
