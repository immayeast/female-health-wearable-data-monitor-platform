import React from 'react';
import { motion } from 'framer-motion';
import { Activity, LogOut, Moon, Sparkles } from 'lucide-react';

interface HomeProps {
  onAction: (target: string) => void;
  onLogout: () => void;
  onWatchTrigger: (type: 'physiological_spike' | 'self_prompt') => void;
  status?: string;
}

const HomeNeumorphic: React.FC<HomeProps> = ({ onAction, onLogout, onWatchTrigger, status = "Ready" }) => {
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
        <div style={{ width: '280px', height: '280px', position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onAction('alignment')}
            className="soft-raised soft-circle"
            style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '20px', cursor: 'pointer', border: 'none',
              padding: '20px'
            }}
          >
            <div className="soft-inset soft-circle" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {status === "Elevated" ? (
                <Moon size={40} color="var(--primary-lavender)" fill="var(--primary-lavender)" opacity={0.6} />
              ) : (
                <Sparkles size={40} color="var(--secondary-mint)" />
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>{status}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '160px', margin: '0 auto', lineHeight: 1.4 }}>
                {status === "Elevated" ? "Cycle-dependent recalibration active." : "Physiology is in its baseline phase."}
              </p>
            </div>
          </motion.button>
        </div>

        {/* Primary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '300px' }}>
          <button onClick={() => onAction('log')} className="soft-btn" style={{ padding: '20px' }}>
            <span>Detailed Log</span>
          </button>
          
          <button onClick={() => onWatchTrigger('self_prompt')} className="soft-btn" style={{ padding: '20px', background: 'var(--primary-lavender)', color: '#fff' }}>
            <Activity size={20} />
            <span>Log Stress (Watch)</span>
          </button>

          <button onClick={() => onWatchTrigger('physiological_spike')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', opacity: 0.6 }}>
            [Debug] Simulate Spike
          </button>

          <button 
            onClick={() => onAction('ritual')}
            className="soft-btn" 
            style={{ marginTop: '2rem', padding: '12px', fontSize: '0.8rem', background: 'var(--card-surface)', width: 'auto', alignSelf: 'center' }}
          >
            <span>Reset Ritual</span>
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
