/**
 * mcPHASES Research Model Engine (Production)
 * Gap-Centric Recalibration Version
 */

export interface GBNode {
  feature_idx?: number;
  feature_name?: string;
  threshold?: number;
  left?: GBNode;
  right?: GBNode;
  value?: number;
  is_leaf: boolean;
}

export interface GBModelMetadata {
  metadata: {
    features: string[];
    z_features: string[];
    global_means: Record<string, number>;
    global_stds: Record<string, number>;
    phase_labels: string[];
    learning_rate: number;
    intercept_gap: number;
    intercept_phase: number[];
  };
  gap_trees: GBNode[];
  phase_trees: GBNode[][];
}

export interface UserState {
  resting_hr: number;
  rmssd: number;
  lh?: number;
  estrogen?: number;
  pdg?: number;
  temperature_diff_from_baseline?: number;
  day_in_cycle: number;
  subjectiveStress?: number;
}

export interface UserBaseline {
  resting_hr: number;
  rmssd: number;
  temperature_diff_from_baseline: number;
  lh?: number;
  estrogen?: number;
  pdg?: number;
}

const walkTree = (node: GBNode, featureValues: number[]): number => {
  if (node.is_leaf) return node.value || 0;
  const val = featureValues[node.feature_idx!];
  if (val <= node.threshold!) return walkTree(node.left!, featureValues);
  return walkTree(node.right!, featureValues);
};

/**
 * Within-Person Z-Score Calculation
 * This is the heart of the research: comparing you to YOUR normal.
 */
const calculateZScores = (state: UserState, baseline: UserBaseline, model: GBModelMetadata) => {
  const { features, global_means, global_stds } = model.metadata;
  
  return features.map(f => {
    const rawValue = (state as any)[f] || (baseline as any)[f] || global_means[f];
    const userMean = (baseline as any)[f] || global_means[f];
    const userStd = (global_stds[f] || 1); // We use global std as a proxy for variability if unknown
    
    return (rawValue - userMean) / userStd;
  });
};

// 1. Gap Prediction (GB Regressor)
export const predictGapGB = (state: UserState, baseline: UserBaseline, model: GBModelMetadata) => {
  const { learning_rate, intercept_gap } = model.metadata;
  const zScores = calculateZScores(state, baseline, model);

  let predictedGap = intercept_gap;
  model.gap_trees.forEach(tree => {
    predictedGap += learning_rate * walkTree(tree, zScores);
  });

  return predictedGap;
};

// 2. Phase Prediction (GB Classifier)
export const predictPhaseGB = (state: UserState, baseline: UserBaseline, model: GBModelMetadata) => {
  const { learning_rate, intercept_phase, phase_labels } = model.metadata;
  const zScores = calculateZScores(state, baseline, model);

  const scores = [...intercept_phase];
  model.phase_trees.forEach(iteration => {
    iteration.forEach((tree, classIdx) => {
      scores[classIdx] += learning_rate * walkTree(tree, zScores);
    });
  });

  const maxIdx = scores.indexOf(Math.max(...scores));
  return phase_labels[maxIdx];
};

/**
 * RECALIBRATION LOGIC
 * Final Score = Raw Wearable + Predicted AI Gap
 */
export const recalibrateStress = (rawWearableScore: number, predictedGap: number) => {
  const recalibrated = rawWearableScore + predictedGap;
  return Math.max(0, Math.min(100, recalibrated));
};

// Legacy Helpers
export const predictStressClassification = (score: number) => {
  if (score > 80) return { group: 'Acute Stress', level: 'High' };
  if (score > 68) return { group: 'Elevated Gap', level: 'Moderate' };
  if (score < 58) return { group: 'Aligned Baseline', level: 'Optimal' };
  return { group: 'Balanced', level: 'Stable' };
};

export const calculateAlignment = (predicted: number, subjective: number) => {
  const subjectiveNormalized = Math.min(5, Math.max(1, subjective)) * 20;
  const gap = Math.abs(predicted - subjectiveNormalized); 
  return Math.max(0, Math.min(100, 100 - gap));
};

export const parseResearchCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map(h => h.trim());
  const lastRow = lines[lines.length - 1].split(',').map(v => v.trim());
  
  const data: any = {};
  headers.forEach((h, i) => {
    data[h] = parseFloat(lastRow[i]) || lastRow[i];
  });
  return data;
};

// Backwards compatibility
export const predictStressScore = (state: any, metadata: any) => {
  let score = metadata.intercept || 65;
  if (metadata.weights && metadata.feature_names) {
    metadata.feature_names.forEach((feature: string) => {
      const rawValue = (state as any)[feature] || metadata.means[feature];
      const zScore = (rawValue - metadata.means[feature]) / metadata.stds[feature];
      score += zScore * metadata.weights[feature];
    });
  }
  return Math.max(0, Math.min(100, score));
};

export const predictPhase = (day: number) => {
  if (day >= 1 && day <= 5) return 'Menstrual';
  if (day >= 6 && day <= 12) return 'Follicular';
  if (day >= 13 && day <= 16) return 'Fertility';
  return 'Luteal';
};
