import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, Activity, Zap, BrainCircuit, Target } from 'lucide-react';
import DriversNeumorphic from './DriversNeumorphic';
import InsightNeumorphic from './InsightNeumorphic';
import RitualNeumorphic from './RitualNeumorphic';

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
}

const AlignmentNeumorphic: React.FC<AlignmentProps> = ({ value, label, sublabel, classification, phase, recalibratedValue }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="container fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="screen-title">P4 Analysis Dashboard</h1>
        <p className="screen-subtitle">Personalized. Predictive. Preventive. Participatory.</p>
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
              <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-lavender)' }}>{recalibratedValue || value}%</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Alignment Score</p>
            </div>
            {classification && (
              <div style={{ position: 'absolute', bottom: '-45px', width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', background: 'var(--primary-lavender)', color: '#fff' }}>
                  {classification.group} Group
                </span>
              </div>
            )}
          </div>
        </motion.div>

        <div style={{ marginTop: '5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{label}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>
          
          {phase && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--primary-lavender)', fontWeight: 600 }}>
              <Zap size={16} />
              <span>Inferred Phase: {phase}</span>
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
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Model Decision Logic</p>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    Your classification as <strong>{classification?.group}</strong> is driven by a {classification?.level} deviation in your HRV and Resting Heart Rate Z-scores for the last 24 hours.
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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Feature Importance (Live)</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Activity size={20} color="var(--error)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RHR Weight</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>42%</p>
          </div>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Target size={20} color="var(--primary-lavender)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recalibrated</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{recalibratedValue || '--'}%</p>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p>
            The model has adjusted your baseline by <strong>12.4%</strong> to account for the truth gap between your subjective logs and the Fitbit responsiveness points.
          </p>
        </div>
      </section>

      {/* 3. Original Sections (Drivers, Insight, Ritual) */}
      <section style={{ marginTop: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="screen-title" style={{ fontSize: '1.4rem' }}>Gap Drivers</h2>
        </div>
        <DriversNeumorphic />
      </section>

      <section style={{ marginTop: '6rem' }}>
        <InsightNeumorphic />
      </section>

      <section style={{ marginTop: '6rem' }}>
        <RitualNeumorphic />
      </section>
    </div>
  );
};

export default AlignmentNeumorphic;
