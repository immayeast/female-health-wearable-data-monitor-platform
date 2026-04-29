import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import DriversNeumorphic from './DriversNeumorphic';
import InsightNeumorphic from './InsightNeumorphic';
import RitualNeumorphic from './RitualNeumorphic';

interface AlignmentProps {
  value: number;
  label: string;
  sublabel: string;
  onAction?: (target: string) => void;
}

const AlignmentNeumorphic: React.FC<AlignmentProps> = ({ value, label, sublabel }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const pages = [
    { id: 'gauge', title: 'Current Alignment', subtitle: 'Mapping your physiological footprint.' },
    { id: 'drivers', title: 'Gap Drivers', subtitle: 'Factors influencing your score.' },
    { id: 'insight', title: 'Current Insight', subtitle: 'Model-derived correlation.' },
    { id: 'ritual', title: 'Reset Ritual', subtitle: 'Grounding through physiology.' },
  ];

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50 && currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    } else if (info.offset.x > 50 && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="screen-title">{pages[currentPage].title}</h1>
        <p className="screen-subtitle">{pages[currentPage].subtitle}</p>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          animate={{ x: 0 }}
          style={{ height: '100%', width: '100%' }}
        >
          <AnimatePresence mode="wait">
            {currentPage === 0 && (
              <motion.div
                key="gauge"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              >
                <div 
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
                </div>

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
              </motion.div>
            )}

            {currentPage === 1 && (
              <motion.div
                key="drivers"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{ height: '100%' }}
              >
                <DriversNeumorphic />
              </motion.div>
            )}

            {currentPage === 2 && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{ height: '100%' }}
              >
                <InsightNeumorphic />
              </motion.div>
            )}

            {currentPage === 3 && (
              <motion.div
                key="ritual"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{ height: '100%' }}
              >
                <RitualNeumorphic />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Pagination Dots */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={currentPage === i ? "soft-inset" : "soft-raised"}
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                border: 'none',
                padding: 0,
                background: currentPage === i ? 'var(--primary-lavender)' : 'var(--bg-main)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlignmentNeumorphic;
