import React from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CLINICAL_TERMS = {
  RHR: {
    full: "Resting Heart Rate",
    description: "The number of times your heart beats per minute while at complete rest. It typically rises during the Luteal phase due to increased progesterone."
  },
  RMSSD: {
    full: "Root Mean Square of Successive Differences",
    description: "The primary time-domain measure of Heart Rate Variability (HRV). Higher RMSSD usually indicates better recovery and stress resilience."
  },
  LH: {
    full: "Luteinizing Hormone",
    description: "A hormone produced by the pituitary gland. A sharp 'surge' in LH triggers ovulation, typically mid-cycle."
  },
  PdG: {
    full: "Pregnanediol Glucuronide",
    description: "A urine metabolite of Progesterone. Tracking PdG allows the model to confirm ovulation and identify the start of the Luteal phase."
  },
  Estrogen: {
    full: "E1G / Estrogen Metabolite",
    description: "Key female sex hormone. It rises during the follicular phase, peaking just before ovulation to prepare the body."
  },
  TempDiff: {
    full: "Basal Body Temperature Deviation",
    description: "Small fluctuations in your nightly body temperature. A sustained rise of 0.3°C–0.5°C is a core physiological marker of the Luteal phase."
  }
};

interface GlossaryProps {
  isOpen: boolean;
  onClose: () => void;
  term?: keyof typeof CLINICAL_TERMS;
}

const ClinicalGlossary: React.FC<GlossaryProps> = ({ isOpen, onClose, term }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="soft-raised"
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              padding: '2.5rem', 
              position: 'relative', 
              zIndex: 1001, 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(20px)',
              borderRadius: '32px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#444' }}>
              <X size={18} />
            </button>

            {term ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem', color: 'var(--primary-lavender)' }}>
                  <div style={{ background: 'var(--primary-lavender)', color: '#fff', borderRadius: '10px', padding: '8px' }}>
                    <Info size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2D3748', letterSpacing: '-0.02em' }}>{CLINICAL_TERMS[term].full}</h3>
                </div>
                <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#4A5568', fontWeight: 500 }}>
                  {CLINICAL_TERMS[term].description}
                </p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '2rem', color: '#2D3748' }}>Clinical Glossary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {Object.entries(CLINICAL_TERMS).map(([key, data]) => (
                    <div key={key}>
                      <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-lavender)', marginBottom: '6px' }}>{data.full} ({key})</p>
                      <p style={{ fontSize: '0.9rem', color: '#4A5568', lineHeight: 1.5, fontWeight: 500 }}>{data.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClinicalGlossary;
