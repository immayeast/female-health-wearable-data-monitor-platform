import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, FlaskConical } from 'lucide-react';

interface AcknowledgementProps {
  onReadMore: () => void;
  onUnderstood: () => void;
}

const ResearchAcknowledgement: React.FC<AcknowledgementProps> = ({ onReadMore, onUnderstood }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(233, 236, 241, 0.8)', backdropFilter: 'blur(15px)',
      padding: '2rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="soft-raised"
        style={{ width: '100%', maxWidth: '650px', padding: '3rem', position: 'relative', overflow: 'hidden' }}
      >
        {/* Background Accent */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, height: '6px', 
          background: 'linear-gradient(90deg, var(--primary-lavender), var(--secondary-mint))' 
        }} />

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="soft-inset soft-circle" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical size={32} color="var(--primary-lavender)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Research Foundations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scientific Assumptions & Hypothesis Acknowledgement</p>
        </div>

        <div 
          className="soft-inset" 
          style={{ 
            padding: '2rem', 
            borderRadius: '24px', 
            background: 'rgba(191, 216, 200, 0.15)', // Desaturated Research Mint tint
            border: '1px solid rgba(191, 216, 200, 0.3)',
            marginBottom: '2.5rem'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
            <BookOpen size={20} color="var(--secondary-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>
              "Physiological baselines in females exhibit unique rhythmic variance that raw Z-score models often misclassify as stress spikes. Our project hypothesizes that context-normalization using menstrual phase data significantly reduces this Truth Gap."
            </p>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            By entering this platform, you acknowledge that our models are built upon the assumption of distinct physiological signatures between sexes and use phase-stratified data to refine accuracy.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={onReadMore}
            style={{ background: 'none', border: 'none', color: 'var(--primary-lavender)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Read more about our methodology
          </button>
          
          <button 
            onClick={onUnderstood}
            className="soft-btn soft-btn-primary" 
            style={{ width: '100%', padding: '18px', borderRadius: '16px', marginTop: '1rem' }}
          >
            <CheckCircle2 size={20} />
            <span>I Understand</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ResearchAcknowledgement;
