import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Moon, Footprints } from 'lucide-react';

const DriversNeumorphic: React.FC = () => {
  const drivers = [
    { label: 'HRV Gap', value: 85, icon: <Heart size={16} />, color: 'var(--primary-lavender)' },
    { label: 'Sleep Recovery', value: 40, icon: <Moon size={16} />, color: 'var(--warm-beige)' },
    { label: 'Movement', value: 65, icon: <Footprints size={16} />, color: 'var(--secondary-mint)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '400px', margin: '2rem auto 0' }}>
      {drivers.map((d, idx) => (
        <div key={idx} className="soft-raised" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="soft-inset" style={{ padding: '8px', borderRadius: '8px' }}>{d.icon}</div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.label}</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: d.color }}>{d.value}% Impact</span>
          </div>
          
          <div className="soft-inset" style={{ height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${d.value}%` }}
              transition={{ duration: 1, delay: idx * 0.2 }}
              style={{ height: '100%', background: d.color, borderRadius: '6px' }}
            />
          </div>
        </div>
      ))}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          HRV Gap is the strongest driver of your current score.
        </p>
      </div>
    </div>
  );
};

export default DriversNeumorphic;
