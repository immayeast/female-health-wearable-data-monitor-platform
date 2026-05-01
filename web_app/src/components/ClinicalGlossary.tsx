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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {/* Deep Blur Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} 
          />
          
          {/* The High-Contrast 3D Card */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              padding: '2.5rem', 
              position: 'relative', 
              zIndex: 1001, 
              background: '#FFFFFF', // High-Contrast White for readability
              borderRadius: '36px',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3)', // Deep 3D Elevation
            }}
          >
            {/* Minimalist Close Button */}
            <button 
              onClick={onClose} 
              style={{ 
                position: 'absolute', 
                top: '24px', 
                right: '24px', 
                border: 'none', 
                background: '#F1F3F5', // Soft tactile circle
                borderRadius: '50%', 
                width: '36px', 
                height: '36px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                color: '#495057',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {term ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.75rem' }}>
                  {/* Purple Clinical Icon Badge */}
                  <div style={{ 
                    background: '#B9A7F5', 
                    color: '#fff', 
                    borderRadius: '12px', 
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Info size={24} strokeWidth={2.5} />
                  </div>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 800, 
                    color: '#212529', 
                    letterSpacing: '-0.02em',
                    margin: 0
                  }}>
                    {CLINICAL_TERMS[term].full}
                  </h3>
                </div>
                
                <p style={{ 
                  fontSize: '1.15rem', 
                  lineHeight: 1.6, 
                  color: '#495057', 
                  fontWeight: 500,
                  margin: 0
                }}>
                  {CLINICAL_TERMS[term].description}
                </p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2.5rem', color: '#212529' }}>Clinical Glossary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {Object.entries(CLINICAL_TERMS).map(([key, data]) => (
                    <div key={key}>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: '#B9A7F5', marginBottom: '6px' }}>{data.full} ({key})</p>
                      <p style={{ fontSize: '0.95rem', color: '#495057', lineHeight: 1.6, fontWeight: 500 }}>{data.description}</p>
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
