import React from 'react';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Fingerprint, Sparkles } from 'lucide-react';

interface HomeProps {
  onNext: () => void;
  cycleLength: number;
  onCycleLengthChange: (length: number) => void;
}

const Home: React.FC<HomeProps> = ({ onNext, cycleLength, onCycleLengthChange }) => {
  return (
    <div className="container" style={{ margin: 'auto', textAlign: 'center', padding: '4rem 1rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ maxWidth: '900px', margin: '0 auto' }}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '12px 24px', borderRadius: '40px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.4)' }}>
            <Sparkles size={18} color="var(--primary-accent)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Biometric Calibration v2.0
            </span>
          </div>
        </div>

        <h1 className="title" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
          Uncovering the <span className="text-gradient">Perception Gap</span>
        </h1>
        
        <p className="subtitle" style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
          mcPHASES uses high-frequency physiological signal processing to bridge the gap between wearable algorithms and female subjective experience.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <button className="btn btn-primary" onClick={onNext} style={{ fontSize: '1.1rem', padding: '16px 40px', borderRadius: '50px' }}>
              Enter Pipeline <Activity size={20} style={{ marginLeft: '8px' }} />
            </button>
            <a 
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7141121/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary" 
              style={{ fontSize: '1.1rem', padding: '16px 40px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Research Paper <BookOpen size={20} />
            </a>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem 2.5rem', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Personalized Baseline</p>
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>Cycle Length: {cycleLength} Days</p>
            </div>
            <input 
              type="range" 
              min="21" 
              max="40" 
              value={cycleLength} 
              onChange={(e) => onCycleLengthChange(Number(e.target.value))}
              style={{ width: '150px', accentColor: 'var(--primary-accent)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', textAlign: 'left' }}>
          <motion.div 
            whileHover={{ y: -10 }}
            className="glass-panel" 
            style={{ padding: '2rem' }}
          >
            <div style={{ background: 'var(--primary-accent)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#fff' }}>
              <Fingerprint size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>The P4 Hypothesis</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Progesterone (P4) naturally suppresses HRV baselines. Most wearables misinterpret this as "stress," leading to a significant perception-physiology gap in female users.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="glass-panel" 
            style={{ padding: '2rem' }}
          >
            <div style={{ background: 'var(--secondary-accent)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#fff' }}>
              <Activity size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Recalibration Model</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Our "Truth" model maps physiological markers directly onto subjective perception, correcting for menstrual phase shifts that generic algorithms ignore.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="glass-panel" 
            style={{ padding: '2rem' }}
          >
            <div style={{ background: 'var(--success)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#fff' }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Clinical Grounding</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Validated against the mcPHASES clinical dataset, ensuring that biometric interpretations are grounded in actual female physiological state-space.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;

