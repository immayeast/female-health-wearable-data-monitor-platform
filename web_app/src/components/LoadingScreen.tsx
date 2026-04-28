import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Activity } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      zIndex: 1000,
      gap: '1.5rem'
    }}>
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { repeat: Infinity, duration: 3, ease: "linear" },
          scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
        }}
      >
        <Activity size={40} color="var(--primary-accent)" />
      </motion.div>
      
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: '0.5rem',
          letterSpacing: '0.05em'
        }}>
          Synchronizing State-Space
        </h3>
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Loader2 size={16} className="animate-spin" />
          Calibrating against mcPHASES baseline...
        </p>
      </div>

      {/* Decorative Blobs */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(168, 155, 220, 0.15) 0%, transparent 70%)',
        top: '20%',
        left: '10%',
        zIndex: -1
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(177, 166, 196, 0.1) 0%, transparent 70%)',
        bottom: '10%',
        right: '5%',
        zIndex: -1
      }} />
    </div>
  );
};

export default LoadingScreen;
