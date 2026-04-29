import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Plus, ShieldCheck, LogOut } from 'lucide-react';

interface HomeProps {
  onAction: (target: string) => void;
  onLogout: () => void;
  status?: string;
}

const HomeNeumorphic: React.FC<HomeProps> = ({ onAction, onLogout, status = "Ready" }) => {
  return (
    <div className="container fade-in">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button onClick={onLogout} className="soft-btn" style={{ padding: '10px', borderRadius: '12px' }}>
          <LogOut size={18} color="var(--text-muted)" />
        </button>
      </div>
      
      <div style={{ marginTop: '2rem', marginBottom: '4rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Welcome back.</p>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Let's check in with your current state.</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3rem' }}>
        {/* Central Focal Node */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('alignment')}
          className="soft-raised soft-circle"
          style={{
            width: '240px',
            height: '240px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--card-surface)',
            boxShadow: 'inset 4px 4px 8px var(--dark-shadow), inset -4px -4px 8px var(--light-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={36} color="var(--primary-lavender)" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{status}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tap to view alignment</span>
        </motion.button>

        {/* Primary Actions */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button onClick={() => onAction('log')} className="soft-btn" style={{ padding: '20px 32px' }}>
            <Plus size={20} />
            <span>Log Moment</span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'center', padding: '2rem 0' }}>
        <div className="soft-raised" style={{ padding: '1rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={16} color="var(--success)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Biometric synchronization active</span>
        </div>
      </div>
    </div>
  );
};

export default HomeNeumorphic;
