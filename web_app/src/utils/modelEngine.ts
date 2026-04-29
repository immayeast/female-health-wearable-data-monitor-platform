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
  if (score > 75) return { group: 'Acute Stress', level: 'High' };
  if (score > 55) return { group: 'Elevated Gap', level: 'Moderate' };
  if (score < 45) return { group: 'Aligned Baseline', level: 'Optimal' };
  return { group: 'Balanced', level: 'Stable' };
};

export const calculateAlignment = (predicted: number, subjective: number) => {
  const gap = Math.abs(predicted - (subjective * 10)); // Scale subjective to 0-100
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
