import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, RefreshCw } from 'lucide-react';

const RitualNeumorphic: React.FC = () => {
  const [phase, setPhase] = useState<'Inhale' | 'Exhale' | 'Hold'>('Inhale');

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase(prev => {
        if (prev === 'Inhale') return 'Hold';
        if (prev === 'Hold') return 'Exhale';
        return 'Inhale';
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem' }}>
      <div style={{ width: '300px', height: '300px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{
            scale: phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 0.8 : 1.1,
          }}
          transition={{ duration: 4, ease: "easeInOut" }}
          className="soft-raised soft-circle"
          style={{
            width: '200px',
            height: '200px',
            background: 'var(--card-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
           <div className="soft-inset soft-circle" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wind size={28} color="var(--primary-lavender)" />
           </div>
        </motion.div>
        
        <div style={{ position: 'absolute', bottom: '-40px', textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.h3 
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}
            >
              {phase}
            </motion.h3>
          </AnimatePresence>
        </div>
      </div>

      <button 
        className="soft-btn" 
        style={{ marginTop: '6rem', padding: '15px 30px', borderRadius: '30px' }}
        onClick={() => window.location.reload()}
      >
        <RefreshCw size={18} />
        <span>Reset Session</span>
      </button>
    </div>
  );
};

export default RitualNeumorphic;
