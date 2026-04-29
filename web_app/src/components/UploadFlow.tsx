import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseResearchCSV, predictPhase, predictStressClassification } from '../utils/modelEngine';

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

  const processFile = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawData = parseResearchCSV(text);
        
        // Transform raw data into Model State
        // (Mapping common columns from PhysioNet/CSV structure)
        const state = {
          hrv_z: rawData.rmssd_z || (rawData.rmssd - 50) / 10 || 0,
          rhr_z: rawData.resting_hr_z || (rawData.resting_hr - 65) / 5 || 0,
          temp_z: rawData.temp_diff_z || 0,
          movement_z: rawData.steps_z || 0,
          cycleDay: rawData.day_in_cycle || 14
        };

        const classification = predictStressClassification(state);
        const phase = predictPhase(state.cycleDay);

        setTimeout(() => {
          onComplete({
            state,
            classification,
            phase,
            rawData,
            timestamp: new Date().toISOString()
          });
          setIsUploading(false);
        }, 2500); // Artificial delay for "Running Models" effect

      } catch (err) {
        setError('Failed to parse CSV. Ensure it follows the mcPHASES format.');
        setIsUploading(false);
      }
    };

    reader.readAsText(file);
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
