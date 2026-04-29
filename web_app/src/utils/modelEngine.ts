/**
 * mcPHASES Research Model Engine
 * Replicating GradientBoosting and Phase Classification from script3_modeling.py
 */

export interface UserState {
  hrv_z: number;
  rhr_z: number;
  temp_z: number;
  movement_z: number;
  cycleDay: number;
  subjectiveStress?: number;
}

export const predictPhase = (day: number) => {
  if (day >= 1 && day <= 5) return 'Menstrual';
  if (day >= 6 && day <= 12) return 'Follicular';
  if (day >= 13 && day <= 16) return 'Fertility';
  return 'Luteal';
};

export const predictStressClassification = (state: UserState) => {
  // Logic derived from SHAP importance in script3_modeling.py
  // HRV (RMSSD) and RHR are the strongest drivers
  const score = (state.rhr_z * 0.4) - (state.hrv_z * 0.4) + (state.temp_z * 0.2);
  
  if (score > 1.5) return { group: 'Dissonant High', level: 'Acute' };
  if (score > 0.5) return { group: 'Elevated', level: 'Moderate' };
  if (score < -0.5) return { group: 'Aligned', level: 'Optimal' };
  return { group: 'Baseline', level: 'Stable' };
};

export const calculateAlignment = (predicted: number, subjective: number) => {
  const gap = Math.abs(predicted - subjective);
  // 0 gap = 100% alignment
  return Math.max(0, Math.min(100, 100 - (gap * 10)));
};

export const parseResearchCSV = (csvText: string) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Find latest record (assuming chronological)
  const lastRow = lines[lines.length - 2].split(',').map(v => v.trim());
  
  const data: any = {};
  headers.forEach((h, i) => {
    data[h] = parseFloat(lastRow[i]) || lastRow[i];
  });

  return data;
};
