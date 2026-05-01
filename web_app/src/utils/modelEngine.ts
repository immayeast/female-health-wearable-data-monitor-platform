/**
 * mcPHASES Research Model Engine (Production)
 * Uses exported weights and normalization from research data
 */

export interface ModelMetadata {
  means: Record<string, number>;
  stds: Record<string, number>;
  weights: Record<string, number>;
  intercept: number;
  feature_names: string[];
}

export interface UserState {
  resting_hr: number;
  rmssd: number;
  lh?: number;
  estrogen?: number;
  pdg?: number;
  day_in_cycle: number;
  subjectiveStress?: number;
}

// Prediction Logic
export const predictStressScore = (state: UserState, metadata: ModelMetadata) => {
  let score = metadata.intercept;
  
  metadata.feature_names.forEach(feature => {
    const rawValue = (state as any)[feature] || metadata.means[feature];
    // Z-Score normalization
    const zScore = (rawValue - metadata.means[feature]) / metadata.stds[feature];
    // Weight application
    score += zScore * metadata.weights[feature];
  });

  return Math.max(0, Math.min(100, score));
};

export const predictPhase = (day: number) => {
  if (day >= 1 && day <= 5) return 'Menstrual';
  if (day >= 6 && day <= 12) return 'Follicular';
  if (day >= 13 && day <= 16) return 'Fertility';
  return 'Luteal';
};

export const predictStressClassification = (score: number) => {
  if (score > 80) return { group: 'Acute Stress', level: 'High' };
  if (score > 68) return { group: 'Elevated Gap', level: 'Moderate' };
  if (score < 58) return { group: 'Aligned Baseline', level: 'Optimal' };
  return { group: 'Balanced', level: 'Stable' };
};

export const calculateTruthGap = (predicted: number, subjective: number, stdDev: number = 1.0) => {
  // Normalize subjective (usually 1-5) to the same scale if needed, 
  // but here we assume both are Z-scores or normalized.
  const signed_gap = subjective - predicted;
  const absolute_gap = Math.abs(signed_gap);
  
  let gap_category: 'aligned' | 'self_higher' | 'wearable_higher' = 'aligned';
  const threshold = 0.5 * stdDev;

  if (signed_gap > threshold) gap_category = 'self_higher';
  else if (signed_gap < -threshold) gap_category = 'wearable_higher';

  return { signed_gap, absolute_gap, gap_category };
};

export const calculateAlignment = (predicted: number, subjective: number) => {
  // Map subjective 1-5 scale to 0-100 (e.g. 5 -> 100, 3 -> 60)
  const subjectiveNormalized = Math.min(5, Math.max(1, subjective)) * 20;
  const gap = Math.abs(predicted - subjectiveNormalized); 
  return Math.max(0, Math.min(100, 100 - gap));
};

export const parseResearchCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Use the latest row for "current" state
  const lastRow = lines[lines.length - 1].split(',').map(v => v.trim());
  
  const data: any = {};
  headers.forEach((h, i) => {
    data[h] = parseFloat(lastRow[i]) || lastRow[i];
  });

  return data;
};
