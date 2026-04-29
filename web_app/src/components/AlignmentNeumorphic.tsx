import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown } from 'lucide-react';
import DriversNeumorphic from './DriversNeumorphic';
import InsightNeumorphic from './InsightNeumorphic';
import RitualNeumorphic from './RitualNeumorphic';

interface AlignmentProps {
  value: number;
  label: string;
  sublabel: string;
}

const AlignmentNeumorphic: React.FC<AlignmentProps> = ({ value, label, sublabel }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="container fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="screen-title">Current Alignment</h1>
        <p className="screen-subtitle">Your physiological footprint in latent space.</p>
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
              <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-lavender)' }}>{value}%</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Alignment Score</p>
            </div>
            <div style={{ position: 'absolute', bottom: '-40px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, width: '100%', textAlign: 'center' }}>
              Top 15% of Population
            </div>
          </div>
        </motion.div>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{label}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>
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
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  This score represents the alignment between your wearable's physiological readings and your personal baseline.
                </p>
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
          <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>Scroll for analysis</p>
        </motion.div>
      </section>

      {/* 2. Seamless Drivers Section */}
      <section style={{ marginTop: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="screen-title" style={{ fontSize: '1.4rem' }}>Gap Drivers</h2>
          <p className="screen-subtitle">Factors influencing your current alignment.</p>
        </div>
        <DriversNeumorphic />
      </section>

      {/* 3. Seamless Insight Section */}
      <section style={{ marginTop: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 className="screen-title" style={{ fontSize: '1.4rem' }}>Model Insight</h2>
        </div>
        <InsightNeumorphic />
      </section>

      {/* 4. Seamless Ritual Section */}
      <section style={{ marginTop: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 className="screen-title" style={{ fontSize: '1.4rem' }}>Reset Ritual</h2>
        </div>
        <RitualNeumorphic />
      </section>
    </div>
  );
};

export default AlignmentNeumorphic;
