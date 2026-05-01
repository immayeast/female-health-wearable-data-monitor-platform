import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseResearchCSV, predictPhase, predictStressClassification, predictStressScore } from '../utils/modelEngine';

interface UploadFlowProps {
  onComplete: (results: any) => void;
}

const UploadFlow: React.FC<UploadFlowProps> = ({ onComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setFileName(file.name);
        setError(null);
        processFile(file);
      } else {
        setError('Please upload a valid CSV file.');
      }
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    try {
      let metadata: any;
      let isGB = false;
      try {
        // 1. Try to fetch high-fidelity GB model
        const metaResponse = await fetch('/model_metadata_gb.json');
        if (!metaResponse.ok) throw new Error('GB Fetch failed');
        metadata = await metaResponse.json();
        isGB = true;
      } catch (e) {
        try {
          // 2. Fallback to Lasso weights
          const metaResponse = await fetch('/model_metadata.json');
          if (!metaResponse.ok) throw new Error('Lasso Fetch failed');
          metadata = await metaResponse.json();
        } catch (e2) {
          console.warn("Using fallback metadata");
          metadata = {
            means: { resting_hr: 67.06, rmssd: 58.78, lh: 7.82, estrogen: 108.39, pdg: 6.01 },
            stds: { resting_hr: 19.07, rmssd: 31.73, lh: 7.85, estrogen: 74.97, pdg: 7.11 },
            weights: { resting_hr: 8.5, rmssd: -5.0, lh: 4.0, estrogen: 1.0, pdg: 3.0 },
            intercept: 64.96,
            feature_names: ["resting_hr", "rmssd", "lh", "estrogen", "pdg"]
          };
        }
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rawData = parseResearchCSV(text);
          
          const cycleDay = Math.max(1, Math.min(28, rawData.day_in_cycle || rawData.day || 14));

          const state = {
            resting_hr: rawData.resting_hr || rawData.rhr || 65,
            rmssd: rawData.rmssd || rawData.hrv || 50,
            lh: rawData.lh || 0,
            estrogen: rawData.estrogen || 0,
            pdg: rawData.pdg || 0,
            temperature_diff_from_baseline: rawData.temperature_diff_from_baseline || rawData.temp_diff || 0.2,
            day_in_cycle: cycleDay
          };

          let predictedScore, phase, predictedGap = 0;
          const baseline = { resting_hr: 67, rmssd: 58, temperature_diff_from_baseline: 0, lh: 8, estrogen: 108, pdg: 6 };

          if (isGB) {
            import('../utils/modelEngine').then(engine => {
               predictedGap = engine.predictGapGB(state, baseline, metadata);
               phase = engine.predictPhaseGB(state, baseline, metadata);
               
               const rawWearable = rawData.stress_score || 65;
               predictedScore = engine.recalibrateStress(rawWearable, predictedGap);
               
               finishProcess(state, predictedScore, phase, rawData, predictedGap);
            });
          } else {
             predictedScore = predictStressScore(state, metadata);
             phase = predictPhase(state.day_in_cycle);
             finishProcess(state, predictedScore, phase, rawData, 0);
          }

        } catch (err) {
          setError('CSV processing failed. Check column headers.');
          setIsUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Model Inference Error. Please try again.');
      setIsUploading(false);
    }
  };

  const finishProcess = (state: any, predictedScore: number, phase: string, rawData: any, predictedGap: number) => {
    const classification = predictStressClassification(predictedScore);
    setTimeout(() => {
      onComplete({
        state,
        classification,
        phase,
        score: predictedScore,
        predictedGap,
        rawData,
        timestamp: new Date().toISOString()
      });
      setIsUploading(false);
    }, 2000);
  };

  return (
    <div className="container fade-in" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 className="screen-title">Import Individual Data</h1>
        <p className="screen-subtitle">Upload your participant CSV to run the P4 modeling pipeline.</p>
      </div>

      <div 
        className="soft-raised"
        style={{ 
          padding: '4rem 2rem', 
          borderRadius: '40px',
          border: error ? '2px solid var(--error)' : 'none',
          cursor: isUploading ? 'default' : 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".csv"
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div className="soft-inset soft-circle" style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isUploading ? (
              <Loader2 size={40} className="spin" color="var(--primary-lavender)" />
            ) : fileName ? (
              <CheckCircle2 size={40} color="var(--success)" />
            ) : (
              <Upload size={40} color="var(--primary-lavender)" />
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {isUploading ? 'Running P4 Models...' : fileName || 'Select CSV File'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isUploading ? 'Calculating Z-scores and Phase Classification' : 'Individual user data for stress & cycle mapping'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', justifyContent: 'center' }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
        </motion.div>
      )}

      {!isUploading && !fileName && (
        <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', padding: '1rem', background: 'rgba(185, 167, 245, 0.05)', borderRadius: '20px' }}>
          <FileText size={18} color="var(--primary-lavender)" />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Requires headers: rmssd, resting_hr, day_in_cycle
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadFlow;
