import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, CheckCircle2, ArrowLeft, HeartPulse } from 'lucide-react';

interface RitualProps {
  onComplete: () => void;
  onBack: () => void;
}

const RitualNeumorphic: React.FC<RitualProps> = ({ onComplete, onBack }) => {
  const [phase, setPhase] = useState<'Inhale' | 'Exhale' | 'Hold'>('Inhale');
  const [cycles, setCycles] = useState(0);
  const maxCycles = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase(prev => {
        if (prev === 'Inhale') return 'Hold';
        if (prev === 'Hold') return 'Exhale';
        if (prev === 'Exhale') {
          setCycles(c => c + 1);
          return 'Inhale';
        }
        return 'Inhale';
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const progress = (cycles / maxCycles) * 100;

  return (
    <div className="container fade-in" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ position: 'absolute', top: '2rem', left: '1.5rem' }}>
        <button onClick={onBack} className="soft-btn" style={{ width: '45px', height: '45px', borderRadius: '50%', padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="screen-title">Parasympathetic Reset</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aligning interoception with physiological reality.</p>
      </div>

      {/* Breathing Pacer Core */}
      <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Progress Ring */}
        <svg style={{ position: 'absolute', transform: 'rotate(-90deg)' }} width="320" height="320">
          <circle cx="160" cy="160" r="150" fill="none" stroke="var(--light-shadow)" strokeWidth="4" />
          <motion.circle 
            cx="160" cy="160" r="150" fill="none" 
            stroke="var(--primary-lavender)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray="942"
            animate={{ strokeDashoffset: 942 - (942 * progress) / 100 }}
            transition={{ duration: 1 }}
          />
        </svg>

        {/* The Pulsing Core */}
        <motion.div
          animate={{
            scale: phase === 'Inhale' ? 1.3 : phase === 'Exhale' ? 0.85 : 1.25,
            backgroundColor: phase === 'Inhale' ? 'rgba(185, 167, 245, 0.1)' : 'rgba(233, 236, 241, 1)',
            boxShadow: phase === 'Inhale' 
              ? '20px 20px 60px var(--dark-shadow), -20px -20px 60px var(--light-shadow), inset 0 0 40px rgba(185, 167, 245, 0.2)'
              : '10px 10px 30px var(--dark-shadow), -10px -10px 30px var(--light-shadow)'
          }}
          transition={{ duration: 4, ease: "easeInOut" }}
          className="soft-raised soft-circle"
          style={{
            width: '200px',
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.4)'
          }}
        >
           <div className="soft-inset soft-circle" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wind size={32} color="var(--primary-lavender)" />
           </div>
        </motion.div>
        
        <div style={{ position: 'absolute', bottom: '-60px', width: '100%', textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {phase}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Cycle {cycles + 1} of {maxCycles}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Action Area */}
      <div style={{ marginTop: '8rem', width: '100%', maxWidth: '300px' }}>
        {cycles >= maxCycles ? (
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="soft-btn soft-btn-primary" 
            style={{ width: '100%', padding: '20px' }}
            onClick={onComplete}
          >
            <CheckCircle2 size={20} />
            <span>Ritual Complete</span>
          </motion.button>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <HeartPulse size={18} color="var(--primary-lavender)" className="animate-pulse" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Synchronizing Vitals...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RitualNeumorphic;
