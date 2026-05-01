import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, Activity, Zap, BrainCircuit, Target } from 'lucide-react';
import DriversNeumorphic from './DriversNeumorphic';

interface AlignmentProps {
  value: number;
  label: string;
  sublabel: string;
  classification?: {
    group: string;
    level: string;
  };
  phase?: string;
  recalibratedValue?: number;
  predictedGap?: number;
  onShowGlossary: (term?: any) => void;
  modelResults?: any;
}

const AlignmentNeumorphic: React.FC<AlignmentProps> = ({ value, label, sublabel, classification, phase, recalibratedValue, predictedGap = 0, onShowGlossary, modelResults }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="container fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="screen-title">Personalized Recalibration Dashboard</h1>
        <p className="screen-subtitle">Correcting the truth gap with research-grade AI.</p>
      </div>

      {/* 1. Main Gauge Section */}
      <section style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          onClick={() => setShowInfo(!showInfo)}
          className="gauge-container"
          style={{ cursor: 'pointer' }}
        >
          <div className="gauge-ring" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-lavender)' }}>
                {Math.round(recalibratedValue || value)}%
              </span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Recalibrated Score</p>
            </div>
            {classification && (
              <div style={{ position: 'absolute', bottom: '-45px', width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', background: 'var(--primary-lavender)', color: '#fff' }}>
                  {classification.group} Mode
                </span>
              </div>
            )}
          </div>
        </motion.div>

        <div style={{ marginTop: '5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{label}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>
          
          {phase && (
            <div 
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--primary-lavender)', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => onShowGlossary()}
            >
              <Zap size={16} />
              <span>Inferred Phase: {phase}</span>
              <Info size={14} style={{ marginLeft: '4px', opacity: 0.6 }} />
            </div>
          )}
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="soft-raised"
              style={{ marginTop: '2rem', padding: '1.5rem', width: '100%' }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={20} color="var(--primary-lavender)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recalibration Logic</p>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    Your classification as <strong>{classification?.group}</strong> is driven by your unique physiological baseline and the predicted <strong>{Math.round(predictedGap)}pt</strong> adjustment needed to align the wearable with your perception.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ marginTop: '4rem', color: 'var(--text-muted)' }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* 2. Model Feature Breakdown */}
      <section className="soft-raised" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          <BrainCircuit size={24} color="var(--primary-lavender)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Recalibration (Live)</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => onShowGlossary('RMSSD')}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Info size={14} />
            </button>
            <Activity size={20} color={predictedGap >= 0 ? "var(--error)" : "var(--success)"} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Correction</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{predictedGap >= 0 ? '+' : ''}{Math.round(predictedGap)} pts</p>
          </div>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => onShowGlossary('RHR')}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Info size={14} />
            </button>
            <Target size={20} color="var(--primary-lavender)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aligned Score</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{Math.round(recalibratedValue || 0)}</p>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p>
            The model applied a <strong>{Math.round(predictedGap)} point</strong> correction to the raw wearable data to account for the truth gap identified in your current physiological state.
          </p>
        </div>
      </section>

      {/* 3. Hormonal Signatures */}
      <section className="soft-raised" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          <Zap size={24} color="var(--primary-lavender)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Hormonal Signatures (Inferred)</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'LH', key: 'LH', unit: 'mIU/mL' },
            { label: 'Estrogen', key: 'Estrogen', unit: 'pg/mL' },
            { label: 'PdG', key: 'PdG', unit: 'ug/mL' }
          ].map((token) => {
            const sigs = (modelResults as any)?.signatures;
            const val = sigs ? sigs[token.key] : '--';
            
            return (
              <div 
                key={token.key} 
                className="soft-inset" 
                style={{ padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => onShowGlossary(token.key as any)}
              >
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>{token.label}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-lavender)', marginBottom: '4px' }}>{val}</p>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{token.unit}</p>
              </div>
            );
          })}
        </div>
        
        {(modelResults as any)?.accuracy && (
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ height: '4px', width: '60px', background: 'var(--dark-shadow)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(modelResults as any).accuracy}%`, background: 'var(--success)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Calibration Accuracy: {(modelResults as any).accuracy}%</span>
          </div>
        )}
      </section>

      {/* 4. Original Sections (Drivers, Insight) */}
      <section style={{ marginTop: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="screen-title" style={{ fontSize: '1.4rem' }}>Gap Drivers</h2>
        </div>
        <DriversNeumorphic />
      </section>

    </div>
  );
};

export default AlignmentNeumorphic;
