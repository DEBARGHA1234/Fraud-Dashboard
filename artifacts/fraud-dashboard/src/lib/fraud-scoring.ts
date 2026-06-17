export function calculateFraudScore(transaction: {
  amount: number;
  hour: number;
  distance: number;
  frequency: number;
  category: string;
  isFirstTransaction: boolean;
  deviceType?: string;
}): number {
  let score = 0;
  const { amount, hour, distance, frequency, category, isFirstTransaction } = transaction;

  if (amount > 5000) score += 25;
  else if (amount > 1000) score += 15;
  else if (amount > 500) score += 8;

  if (hour >= 1 && hour <= 5) score += 15;
  else if (hour >= 22 || hour === 0) score += 8;

  if (distance > 500) score += 20;
  else if (distance > 100) score += 10;

  if (frequency > 10) score += 20;
  else if (frequency > 5) score += 12;

  const highRiskCategories = ['Crypto', 'Wire Transfer', 'ATM'];
  if (highRiskCategories.includes(category)) score += 10;

  if (isFirstTransaction) score += 10;

  return Math.min(score, 100);
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function computeSubScores(t: {
  frequency: number;
  distance: number;
  isFirstTransaction: boolean;
  hour: number;
  deviceType: string;
}) {
  const velocityRisk = t.frequency > 10 ? 100 : t.frequency > 5 ? 60 : t.frequency > 2 ? 30 : 10;
  const geographicRisk = t.distance > 500 ? 100 : t.distance > 100 ? 50 : t.distance > 50 ? 25 : 5;
  const behavioralRisk = Math.min((t.isFirstTransaction ? 60 : 20) + (t.hour >= 1 && t.hour <= 5 ? 40 : 0), 100);
  const deviceRisk = t.deviceType === 'ATM' ? 40 : t.deviceType === 'Mobile' ? 20 : 15;
  return { velocityRisk, geographicRisk, behavioralRisk, deviceRisk };
}
