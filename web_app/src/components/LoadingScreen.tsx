import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      zIndex: 1000,
      gap: '2rem'
    }}>
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          boxShadow: [
            "9px 9px 16px var(--dark-shadow), -9px -9px 16px var(--light-shadow)",
            "15px 15px 30px var(--dark-shadow), -15px -15px 30px var(--light-shadow)",
            "9px 9px 16px var(--dark-shadow), -9px -9px 16px var(--light-shadow)"
          ]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 3, 
          ease: "easeInOut" 
        }}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: 'var(--card-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Activity size={48} color="var(--primary-lavender)" />
      </motion.div>
      
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: '0.5rem',
          letterSpacing: '0.05em'
        }}>
          Calibrating
        </h3>
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text-secondary)'
        }}>
          Mapping physiology to perception...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
