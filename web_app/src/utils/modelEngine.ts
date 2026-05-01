/**
 * mcPHASES Research Model Engine (Production)
 * High-Fidelity Gradient Boosting Version
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
    means: Record<string, number>;
    stds: Record<string, number>;
    phase_labels: string[];
    learning_rate: number;
    intercept_stress: number;
    intercept_phase: number[];
  };
  stress_trees: GBNode[];
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

// Tree Traversal Engine
const walkTree = (node: GBNode, featureValues: number[]): number => {
  if (node.is_leaf) return node.value || 0;
  const val = featureValues[node.feature_idx!];
  if (val <= node.threshold!) return walkTree(node.left!, featureValues);
  return walkTree(node.right!, featureValues);
};

// 1. Stress Prediction (GB Regressor)
export const predictStressScoreGB = (state: UserState, model: GBModelMetadata) => {
  const { features, means, stds, learning_rate, intercept_stress } = model.metadata;
  
  // Normalize features
  const featureValues = features.map(f => {
    const rawValue = (state as any)[f] || means[f];
    return (rawValue - means[f]) / (stds[f] || 1);
  });

  // Calculate GB sum
  let prediction = intercept_stress;
  model.stress_trees.forEach(tree => {
    prediction += learning_rate * walkTree(tree, featureValues);
  });

  return Math.max(0, Math.min(100, prediction));
};

// 2. Phase Prediction (GB Classifier)
export const predictPhaseGB = (state: UserState, model: GBModelMetadata) => {
  const { features, means, stds, learning_rate, intercept_phase, phase_labels } = model.metadata;
  
  // Normalize features
  const featureValues = features.map(f => {
    const rawValue = (state as any)[f] || means[f];
    return (rawValue - means[f]) / (stds[f] || 1);
  });

  // Multiclass GB uses One-vs-Rest raw scores
  const scores = [...intercept_phase];
  
  model.phase_trees.forEach(iteration => {
    iteration.forEach((tree, classIdx) => {
      scores[classIdx] += learning_rate * walkTree(tree, featureValues);
    });
  });

  // Softmax to find highest probability class
  const maxIdx = scores.indexOf(Math.max(...scores));
  return phase_labels[maxIdx];
};

// Legacy mappings and helpers
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

// Backwards compatibility for components not yet using GB
export const predictStressScore = (state: UserState, metadata: any) => {
  let score = metadata.intercept;
  metadata.feature_names.forEach((feature: string) => {
    const rawValue = (state as any)[feature] || metadata.means[feature];
    const zScore = (rawValue - metadata.means[feature]) / metadata.stds[feature];
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
