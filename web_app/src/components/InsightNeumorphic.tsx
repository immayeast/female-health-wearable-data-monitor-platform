import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const InsightNeumorphic: React.FC = () => {
  return (
    <div className="container fade-in" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="screen-title">Current Insight</h1>
        <p className="screen-subtitle">Model-derived correlation.</p>
      </div>

      <div style={{ padding: '0 2rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="soft-raised"
          style={{ 
            padding: '3rem 2rem', 
            borderRadius: '40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}
        >
          <div className="soft-inset soft-circle" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={28} color="var(--primary-lavender)" />
          </div>
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)' }}>
            "Your perceived stress tends to rise when sleep recovery is below 60%."
          </h2>
          
          <div style={{ height: '2px', width: '40px', background: 'var(--primary-lavender)', opacity: 0.3 }} />
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Based on 14 days of synchronized logs.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default InsightNeumorphic;
