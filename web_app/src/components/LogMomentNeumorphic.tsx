import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface LogMomentProps {
  onSave: (stress: number, note: string) => void;
}

const LogMomentNeumorphic: React.FC<LogMomentProps> = ({ onSave }) => {
  const [stress, setStress] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="container fade-in">
      <h1 className="screen-title">Log Moment</h1>
      <p className="screen-subtitle">How stressed do you feel right now?</p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[
            { label: 'Low', val: 1, color: 'var(--secondary-mint)' },
            { label: 'Medium', val: 3, color: 'var(--warm-beige)' },
            { label: 'High', val: 5, color: 'var(--soft-peach)' }
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setStress(opt.val)}
              className={stress === opt.val ? 'soft-inset' : 'soft-raised'}
              style={{
                width: '100%',
                padding: '24px',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: stress === opt.val ? opt.color : 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!showNote ? (
          <button 
            onClick={() => setShowNote(true)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontSize: '0.9rem', 
              textDecoration: 'underline', 
              cursor: 'pointer' 
            }}
          >
            Add note
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <textarea
              placeholder="How are you feeling?"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ height: '100px', fontSize: '0.9rem', lineHeight: 1.5 }}
            />
          </motion.div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button 
          disabled={stress === null}
          onClick={() => stress !== null && onSave(stress, note)}
          className="soft-btn soft-btn-primary" 
          style={{ width: '100%', padding: '20px', opacity: stress === null ? 0.5 : 1 }}
        >
          <Check size={20} />
          <span>Save Reflection</span>
        </button>
      </div>
    </div>
  );
};

export default LogMomentNeumorphic;
