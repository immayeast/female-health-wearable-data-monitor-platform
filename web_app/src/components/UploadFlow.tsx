import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Cpu } from 'lucide-react';
import { parseResearchCSV, predictPhase, predictStressClassification, calculateAlignment } from '../utils/modelEngine';
import { pythonEngine } from '../utils/PythonEngine';

interface UploadFlowProps {
  onComplete: (results: any) => void;
  activeFile?: string | null;
  onClear?: () => void;
}

const UploadFlow: React.FC<UploadFlowProps> = ({ onComplete, activeFile, onClear }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(activeFile || null);
  const [useResearchMode] = useState(true);
  const [researchConsent, setResearchConsent] = useState(false);
  const [sessionId] = useState(() => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  });
  const [, setPyStatus] = useState({ isLoaded: false, isLoading: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Auto-initialize the engine on mount
    const initEngine = async () => {
      const status = pythonEngine.status();
      if (!status.isLoaded && !status.isLoading) {
        await pythonEngine.init();
      }
    };
    initEngine();

    // 2. Poll for status updates
    const timer = setInterval(() => {
      setPyStatus(pythonEngine.status());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    console.log(`Starting anonymized upload session: ${sessionId}`);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;

          if (useResearchMode) {
            console.log("🧬 Running Deep Research Mode (Pyodide)...");
            const pyResult = await pythonEngine.runRecalibration(text);
            
            onComplete({
              fileName: file.name,
              state: { day_in_cycle: 14 },
              classification: predictStressClassification(pyResult.score),
              phase: pyResult.phase,
              score: pyResult.score,
              predictedGap: pyResult.gap,
              alignment: calculateAlignment(pyResult.score, 5), // Align to neutral baseline
              timestamp: new Date().toISOString()
            });
          } else {
            // Standard JS-based inference
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

            // Simplified fallback logic
            const predictedScore = 65; 
            const classification = predictStressClassification(predictedScore);
            const phase = predictPhase(state.day_in_cycle);

            setTimeout(() => {
              onComplete({
                state,
                classification,
                phase,
                score: predictedScore,
                rawData,
                timestamp: new Date().toISOString()
              });
            }, 2000);
          }
          setIsUploading(false);
        } catch (err: any) {
          setError(err.message || 'Processing failed. Check column headers.');
          setIsUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Model Inference Error. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="container fade-in" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="screen-title">Import Individual Data</h1>
        <p className="screen-subtitle">Run your participant data through the Deep Research modeling pipeline.</p>
      </div>

      {/* Research Mode Toggle */}
      <div className="soft-raised" style={{ 
        padding: '1.2rem 1.5rem', 
        borderRadius: '24px', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '1.5rem',
        marginBottom: '2rem', 
        maxWidth: '440px', 
        margin: '0 auto 2rem'
      }}>
        {/* Toggle 1: Deep Research Mode */}
        {/* Active Engine Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          padding: '1.2rem',
          borderRadius: '24px',
          background: 'rgba(185, 167, 245, 0.05)',
          border: '1px solid rgba(185, 167, 245, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="soft-inset" style={{ padding: '10px', borderRadius: '12px', background: 'rgba(185, 167, 245, 0.1)' }}>
              <Cpu size={20} color="var(--primary-lavender)" />
            </div>
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>Research Engine Active</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Dual-model inference enabled</p>
            </div>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: '12px', background: 'var(--primary-lavender)', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>LIVE</div>
        </div>

        {/* Toggle 2: Research Opt-in */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          padding: '1.2rem',
          borderRadius: '24px',
          marginTop: '1.5rem',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div className="soft-inset" style={{ padding: '8px', borderRadius: '10px', flexShrink: 0 }}>
              <FileText size={20} color={researchConsent ? "var(--primary-teal)" : "var(--text-muted)"} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Contribute to Research</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Anonymize & Sync</p>
            </div>
          </div>
          <button 
            onClick={() => setResearchConsent(!researchConsent)}
            className="soft-raised"
            style={{ 
              width: '56px', 
              height: '30px', 
              borderRadius: '15px', 
              padding: '3px',
              background: researchConsent ? 'var(--primary-teal)' : 'rgba(0,0,0,0.03)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: '#fff', 
              transform: researchConsent ? 'translateX(26px)' : 'translateX(0)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>
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
              {isUploading ? (useResearchMode ? 'Running Python Pipeline...' : 'Calculating Z-scores...') : fileName || 'Select CSV File'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isUploading ? 'Executing Gradient Boosting model' : 'Individual user data for stress & cycle mapping'}
            </p>
          </div>
          
          {!isUploading && fileName && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setFileName(null);
                setError(null);
                if (onClear) onClear();
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="soft-btn"
              style={{ padding: '8px 16px', fontSize: '0.8rem', marginTop: '10px', borderRadius: '15px' }}
            >
              Clear & Re-upload
            </button>
          )}
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
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', padding: '1rem', background: 'rgba(185, 167, 245, 0.05)', borderRadius: '20px', width: '100%' }}>
          <FileText size={18} color="var(--primary-lavender)" />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Requires headers: rmssd, resting_hr, day_in_cycle
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadFlow;
