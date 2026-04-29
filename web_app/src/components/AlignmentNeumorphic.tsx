import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface AlignmentProps {
  value: number;
  label: string;
  sublabel: string;
}

const AlignmentNeumorphic: React.FC<AlignmentProps> = ({ value, label, sublabel }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="container fade-in">
      <h1 className="screen-title">Current Alignment</h1>
      <p className="screen-subtitle">Mapping your physiological footprint.</p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          onClick={() => setShowInfo(!showInfo)}
          className="gauge-container"
          style={{ cursor: 'pointer' }}
        >
          <div className="gauge-ring" />
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--card-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-lavender)' }}>{value}%</span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Alignment Score</p>
          </div>
          {/* Population Overlay */}
          <div style={{ position: 'absolute', bottom: '20px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Top 15% of Population
          </div>
        </div>
        </motion.div>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
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
                  A higher score indicates your signals match your current perception.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: i === 1 ? 'var(--primary-lavender)' : 'var(--dark-shadow)' 
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlignmentNeumorphic;
